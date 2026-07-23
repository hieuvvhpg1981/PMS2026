import { safeString } from './sanitize';

export interface BasePlan {
  planId: string;
  appendix: string;
  budget: number;
  namKeHoach: number;
  level?: number;
  parentPlanId?: string;
  departmentName?: string;
  [key: string]: any;
}

export function normalizeId(id: string): string {
  return (id || '').replace(/\s+/g, '').toUpperCase();
}

/**
 * Auto-deduces plan level and direct parent ID based on plan ID and appendix.
 */
export function getAutoLevelAndParent(planId: string, appendix: string): { level: number; parentPlanId: string } {
  const cleanPlanId = safeString(planId).trim();
  const cleanAppendix = safeString(appendix).trim();

  if (!cleanPlanId) {
    return { level: 4, parentPlanId: '' };
  }

  const dotsCount = (cleanPlanId.match(/\./g) || []).length;
  // Case-insensitive, space-insensitive comparison for PL 1.1
  const isAppendix11 = cleanAppendix.replace(/\s+/g, '').toUpperCase() === 'PL1.1';

  let level = 4;
  let parentPlanId = '';

  if (isAppendix11) {
    // For PL 1.1:
    // PL1.1.X ➔ Cấp 1 (2 dots)
    // PL1.1.X.Y ➔ Cấp 2 (3 dots)
    // PL1.1.X.Y.Z ➔ Cấp 3 (4 dots)
    level = Math.max(1, Math.min(6, dotsCount - 1));

    if (dotsCount >= 3 && cleanPlanId.includes('.')) {
      parentPlanId = cleanPlanId.substring(0, cleanPlanId.lastIndexOf('.'));
    }
  } else {
    // For other appendices (PL 1.2, 1.3.A, etc.):
    // General codes default to Level 4, details below default to Level 5.
    // e.g. PL1.2.1 has 2 dots -> Level 4. PL1.2.1.1 has 3 dots -> Level 5.
    if (dotsCount <= 2) {
      level = 4;
    } else {
      level = 5;
    }

    if (dotsCount >= 2 && cleanPlanId.includes('.')) {
      parentPlanId = cleanPlanId.substring(0, cleanPlanId.lastIndexOf('.'));
    }
  }

  return { level, parentPlanId };
}

/**
 * Checks plans and ensures they have level and parentPlanId populated.
 */
export function ensureHierarchyDetails<T extends BasePlan>(plans: T[]): T[] {
  return plans.map(p => {
    if (p.level !== undefined && p.parentPlanId !== undefined) {
      return p;
    }
    const auto = getAutoLevelAndParent(p.planId, p.appendix);
    return {
      ...p,
      level: p.level !== undefined && p.level !== null && p.level !== 0 ? p.level : auto.level,
      parentPlanId: p.parentPlanId !== undefined && p.parentPlanId !== null ? p.parentPlanId : auto.parentPlanId
    };
  });
}

/**
 * Returns a set of all descendant plan IDs of the specified plan to prevent cycles.
 */
export function getDescendantPlanIds(planId: string, plans: BasePlan[]): Set<string> {
  const descendants = new Set<string>();
  if (!planId) return descendants;

  // Build map of parent -> list of direct child IDs
  const childrenMap = new Map<string, string[]>();
  for (const p of plans) {
    if (p.parentPlanId && p.planId) {
      if (!childrenMap.has(p.parentPlanId)) {
        childrenMap.set(p.parentPlanId, []);
      }
      childrenMap.get(p.parentPlanId)!.push(p.planId);
    }
  }

  // Traversal to find all children recursively
  const queue = [planId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = childrenMap.get(current) || [];
    for (const child of children) {
      if (!descendants.has(child)) {
        descendants.add(child);
        queue.push(child);
      }
    }
  }

  return descendants;
}

/**
 * Dynamically computes parent plan budgets as the sum of direct child budgets.
 * Safe from infinite loops / cycles.
 */
export function calculateRollupBudgets<T extends BasePlan>(plans: T[]): T[] {
  if (!plans || plans.length === 0) return [];

  // Group plans by year to keep boundaries
  const plansByYear = new Map<number, T[]>();
  for (const p of plans) {
    const y = p.namKeHoach || 0;
    if (!plansByYear.has(y)) {
      plansByYear.set(y, []);
    }
    plansByYear.get(y)!.push(p);
  }

  const result: T[] = [];

  for (const [_, yearPlans] of plansByYear.entries()) {
    const normalizedPlans = ensureHierarchyDetails(yearPlans);

    // Map planId -> plan object
    const planMap = new Map<string, T>();
    for (const p of normalizedPlans) {
      if (p.planId) {
        planMap.set(normalizeId(p.planId), p);
      }
    }

    // Map parentPlanId -> list of direct children
    const childrenMap = new Map<string, T[]>();
    for (const p of normalizedPlans) {
      const parentId = p.parentPlanId;
      if (parentId) {
        const normParentId = normalizeId(parentId);
        if (!childrenMap.has(normParentId)) {
          childrenMap.set(normParentId, []);
        }
        childrenMap.get(normParentId)!.push(p);
      }
    }

    const computedBudgets = new Map<string, number>();
    const calculating = new Set<string>();

    function getPlanBudget(plan: T): number {
      const pid = plan.planId;
      const normPid = normalizeId(pid);
      if (computedBudgets.has(normPid)) {
        return computedBudgets.get(normPid)!;
      }

      const children = childrenMap.get(normPid) || [];
      if (children.length === 0) {
        return plan.budget || 0;
      }

      if (calculating.has(normPid)) {
        return 0; // Avoid cycles
      }

      calculating.add(normPid);
      let sum = 0;
      for (const child of children) {
        sum += getPlanBudget(child);
      }
      calculating.delete(normPid);
      computedBudgets.set(normPid, sum);
      return sum;
    }

    for (const p of normalizedPlans) {
      const rollupBudget = getPlanBudget(p);
      result.push({
        ...p,
        budget: rollupBudget
      });
    }
  }

  return result;
}

export function calculateRollupActualCosts<T extends BasePlan>(plans: T[], contracts: any[]): T[] {
  if (!plans || plans.length === 0) return [];

  // Group plans by year to keep boundaries
  const plansByYear = new Map<number, T[]>();
  for (const p of plans) {
    const y = p.namKeHoach || 0;
    if (!plansByYear.has(y)) {
      plansByYear.set(y, []);
    }
    plansByYear.get(y)!.push(p);
  }

  const result: T[] = [];

  for (const [year, yearPlans] of plansByYear.entries()) {
    const normalizedPlans = ensureHierarchyDetails(yearPlans);

    // Map normalized planId -> plan object
    const planMap = new Map<string, T>();
    for (const p of normalizedPlans) {
      if (p.planId) {
        planMap.set(normalizeId(p.planId), p);
      }
    }

    // Map parentPlanId -> list of direct children (normalized)
    const childrenMap = new Map<string, T[]>();
    for (const p of normalizedPlans) {
      const parentId = p.parentPlanId;
      if (parentId) {
        const normParentId = normalizeId(parentId);
        if (!childrenMap.has(normParentId)) {
          childrenMap.set(normParentId, []);
        }
        childrenMap.get(normParentId)!.push(p);
      }
    }

    // Pre-calculate direct contracts sum for each plan in this year
    const directContractsValue = new Map<string, number>();
    for (const p of normalizedPlans) {
      const pid = p.planId;
      const normPid = normalizeId(pid);
      const directSum = contracts
        .filter(c => {
          if (c.planDocId) {
            return c.planDocId === p.id;
          }
          const cPlanIdNorm = normalizeId(c.planId || '');
          if (cPlanIdNorm !== normPid) return false;
          if (c.date) {
            try {
              const contractYear = new Date(c.date).getFullYear();
              return contractYear === year;
            } catch (e) {
              return true;
            }
          }
          return true;
        })
        .reduce((sum, c) => sum + (c.value || 0), 0);
      directContractsValue.set(normPid, directSum);
    }

    const computedCosts = new Map<string, number>();
    const calculating = new Set<string>();

    function getPlanActualCost(plan: T): number {
      const pid = plan.planId;
      const normPid = normalizeId(pid);
      if (computedCosts.has(normPid)) {
        return computedCosts.get(normPid)!;
      }

      const directVal = directContractsValue.get(normPid) || 0;
      const children = childrenMap.get(normPid) || [];

      if (children.length === 0) {
        computedCosts.set(normPid, directVal);
        return directVal;
      }

      if (calculating.has(normPid)) {
        return 0; // Avoid cycles
      }

      calculating.add(normPid);
      let sum = directVal;
      for (const child of children) {
        sum += getPlanActualCost(child);
      }
      calculating.delete(normPid);
      computedCosts.set(normPid, sum);
      return sum;
    }

    for (const p of normalizedPlans) {
      const rollupCost = getPlanActualCost(p);
      result.push({
        ...p,
        actualCost: rollupCost
      });
    }
  }

  return result;
}


export interface JoinedReportData extends BasePlan {
  totalPlanned: number;
  accumulatedActual: number;
  months: {
    month: number;
    planned: number;
    actual: number;
  }[];
  depth?: number;
}

export function calculateRollupReportData<T extends JoinedReportData>(plans: T[]): T[] {
  if (!plans || plans.length === 0) return [];

  // Group plans by year to keep boundaries
  const plansByYear = new Map<number, T[]>();
  for (const p of plans) {
    const y = p.namKeHoach || 0;
    if (!plansByYear.has(y)) {
      plansByYear.set(y, []);
    }
    plansByYear.get(y)!.push(p);
  }

  const result: T[] = [];

  for (const [_, yearPlans] of plansByYear.entries()) {
    const normalizedPlans = ensureHierarchyDetails(yearPlans);

    // Map planId -> plan object (using normalized ID)
    const planMap = new Map<string, T>();
    for (const p of normalizedPlans) {
      if (p.planId) {
        planMap.set(normalizeId(p.planId), p);
      }
    }

    // Map parentPlanId -> list of direct children (using normalized ID)
    const childrenMap = new Map<string, T[]>();
    for (const p of normalizedPlans) {
      const parentId = p.parentPlanId;
      if (parentId) {
        const normParentId = normalizeId(parentId);
        if (!childrenMap.has(normParentId)) {
          childrenMap.set(normParentId, []);
        }
        childrenMap.get(normParentId)!.push(p);
      }
    }

    // We need to compute rolled up values: budget, totalPlanned, accumulatedActual, months
    interface ComputedValues {
      budget: number;
      totalPlanned: number;
      accumulatedActual: number;
      months: { month: number; planned: number; actual: number; }[];
    }

    const computedValuesMap = new Map<string, ComputedValues>();
    const calculating = new Set<string>();

    function getPlanValues(plan: T): ComputedValues {
      const pid = plan.planId;
      const normPid = normalizeId(pid);
      if (computedValuesMap.has(normPid)) {
        return computedValuesMap.get(normPid)!;
      }

      const children = childrenMap.get(normPid) || [];
      if (children.length === 0) {
        // No children: return its own database values
        const vals = {
          budget: plan.budget || 0,
          totalPlanned: plan.totalPlanned || 0,
          accumulatedActual: plan.accumulatedActual || 0,
          months: (plan.months || []).map(m => ({ ...m }))
        };
        computedValuesMap.set(normPid, vals);
        return vals;
      }

      if (calculating.has(normPid)) {
        // Avoid cycles
        return {
          budget: 0,
          totalPlanned: 0,
          accumulatedActual: 0,
          months: (plan.months || []).map(m => ({ month: m.month, planned: 0, actual: 0 }))
        };
      }

      calculating.add(normPid);

      let sumBudget = 0;
      let sumTotalPlanned = 0;
      let sumAccumulatedActual = plan.accumulatedActual || 0;

      // Initialize months array sum based on the plan's month structure
      const sumMonths = (plan.months || []).map(m => ({
        month: m.month,
        planned: 0,
        actual: m.actual || 0
      }));

      for (const child of children) {
        const childVals = getPlanValues(child);
        sumBudget += childVals.budget;
        sumTotalPlanned += childVals.totalPlanned;
        sumAccumulatedActual += childVals.accumulatedActual;

        // Sum months
        childVals.months.forEach((childMonthVal) => {
          const targetMonth = sumMonths.find(sm => sm.month === childMonthVal.month);
          if (targetMonth) {
            targetMonth.planned += childMonthVal.planned;
            targetMonth.actual += childMonthVal.actual;
          }
        });
      }

      calculating.delete(normPid);

      // Round values to 2 decimal places to prevent floating point inaccuracies
      const roundedMonths = sumMonths.map(m => ({
        month: m.month,
        planned: Number(m.planned.toFixed(2)),
        actual: Number(m.actual.toFixed(2))
      }));

      const vals = {
        budget: Number(sumBudget.toFixed(2)),
        totalPlanned: Number(sumTotalPlanned.toFixed(2)),
        accumulatedActual: Number(sumAccumulatedActual.toFixed(2)),
        months: roundedMonths
      };

      computedValuesMap.set(normPid, vals);
      return vals;
    }

    for (const p of normalizedPlans) {
      const rolledUpVals = getPlanValues(p);
      result.push({
        ...p,
        budget: rolledUpVals.budget,
        totalPlanned: rolledUpVals.totalPlanned,
        accumulatedActual: rolledUpVals.accumulatedActual,
        months: rolledUpVals.months
      });
    }
  }

  return result;
}

// ===== NATURAL SORT (supports Roman numerals and hierarchic codes) =====

function romanToNumber(roman: string): number {
  const map: { [key: string]: number } = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const clean = roman.toUpperCase().trim();
  let total = 0;
  for (let i = 0; i < clean.length; i++) {
    const current = map[clean[i]];
    const next = map[clean[i + 1]];
    if (current === undefined) return NaN;
    if (next > current) {
      total += next - current;
      i++;
    } else {
      total += current;
    }
  }
  return total;
}

function tokenize(s: string): string[] {
  let clean = s.trim();
  // Normalize prefix "PL 1" or any letters followed by spaces and a digit to "LETTER.digit"
  clean = clean.replace(/^([a-zA-Z]+)\s*(\d)/, '$1.$2');
  return clean.split(/[.\s]+/).filter(Boolean);
}

function compareToken(a: string, b: string): number {
  const isNumA = /^\d+$/.test(a);
  const isNumB = /^\d+$/.test(b);
  if (isNumA && isNumB) {
    return parseInt(a, 10) - parseInt(b, 10);
  }

  const isRomanA = /^[IVXLCDM]+$/i.test(a);
  const isRomanB = /^[IVXLCDM]+$/i.test(b);
  if (isRomanA && isRomanB) {
    const valA = romanToNumber(a);
    const valB = romanToNumber(b);
    if (!isNaN(valA) && !isNaN(valB)) {
      return valA - valB;
    }
  }

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function naturalSort(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const len = Math.min(ta.length, tb.length);
  for (let i = 0; i < len; i++) {
    const cmp = compareToken(ta[i], tb[i]);
    if (cmp !== 0) return cmp;
  }
  return ta.length - tb.length;
}

export function sortPlansHierarchy<T extends BasePlan & { depth?: number }>(plans: T[]): T[] {
  if (!plans || plans.length === 0) return [];

  // Group plans by appendix first
  const groups = new Map<string, T[]>();
  for (const p of plans) {
    const app = p.appendix || '';
    if (!groups.has(app)) {
      groups.set(app, []);
    }
    groups.get(app)!.push(p);
  }

  // Sort appendix names alphabetically/numerically using naturalSort
  const sortedAppendices = Array.from(groups.keys()).sort((a, b) =>
    naturalSort(a, b)
  );

  const result: T[] = [];

  for (const app of sortedAppendices) {
    const appPlans = groups.get(app)!;

    // Create map for fast lookup of plans by ID (using normalized ID)
    const planMap = new Map<string, T>();
    for (const p of appPlans) {
      if (p.planId) {
        planMap.set(normalizeId(p.planId), p);
      }
    }

    // Map parentPlanId -> direct children (using normalized ID)
    const childrenMap = new Map<string, T[]>();
    for (const p of appPlans) {
      const parentId = p.parentPlanId || '';
      if (parentId) {
        const normParentId = normalizeId(parentId);
        if (!childrenMap.has(normParentId)) {
          childrenMap.set(normParentId, []);
        }
        childrenMap.get(normParentId)!.push(p);
      }
    }

    // Determine root plans: parentPlanId is empty, or the parentPlanId does not exist in this appendix list
    const roots = appPlans.filter(p => {
      const parentId = p.parentPlanId || '';
      return !parentId || !planMap.has(normalizeId(parentId));
    });

    // Sort roots using naturalSort
    roots.sort((a, b) =>
      naturalSort(a.planId || '', b.planId || '')
    );

    const sortedAppPlans: T[] = [];

    function traverse(parent: T, depth: number) {
      parent.depth = depth;
      sortedAppPlans.push(parent);
      const normPid = normalizeId(parent.planId);
      const children = childrenMap.get(normPid) || [];
      
      // Sort children using naturalSort
      children.sort((a, b) =>
        naturalSort(a.planId || '', b.planId || '')
      );
      
      for (const child of children) {
        traverse(child, depth + 1);
      }
    }

    for (const root of roots) {
      traverse(root, 0);
    }

    // Capture orphans just in case
    const capturedIds = new Set(sortedAppPlans.map(p => normalizeId(p.planId)));
    const orphans = appPlans.filter(p => !capturedIds.has(normalizeId(p.planId)));
    if (orphans.length > 0) {
      orphans.sort((a, b) =>
        naturalSort(a.planId || '', b.planId || '')
      );
      for (const orphan of orphans) {
        orphan.depth = 0;
      }
      sortedAppPlans.push(...orphans);
    }

    result.push(...sortedAppPlans);
  }

  return result;
}

export function isSuperUser(profile: any): boolean {
  if (!profile) return false;
  const role = String(profile.role || '').toUpperCase();
  const dept = String(profile.phongBan || profile.department || '').toLowerCase().trim();
  
  const isBgdOrAdmin = 
    role === 'BAN GIÁM ĐỐC' || 
    role === 'ADMIN' || 
    role === 'BGĐ' || 
    role === 'BGD';
  
  const isBgdDept = 
    dept.includes('ban giám đốc') || 
    dept === 'bgđ' || 
    dept === 'bgd';
  
  // Flexible matching for Finance & Accounting (Tài chính Kế toán / TCKT)
  const isFinanceDept = 
    dept.includes('tài chính kế toán') || 
    dept.includes('tckt') || 
    dept.includes('tài chính - kế toán') || 
    (dept.includes('tài chính') && dept.includes('kế toán'));

  return isBgdOrAdmin || isBgdDept || isFinanceDept;
}
