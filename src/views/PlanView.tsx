import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, setDoc, doc, getDoc, writeBatch, deleteDoc, addDoc, query, where, getDocs } from 'firebase/firestore';
import { parsePlanExcel, generatePlanTemplate } from '../services/excelService';
import { toast } from 'sonner';
import { sanitizePlan, sanitizeContract } from '../lib/sanitize';
import { getAutoLevelAndParent, getDescendantPlanIds, calculateRollupBudgets, calculateRollupActualCosts, isSuperUser } from '../lib/hierarchy';
import { Search, Download, Upload, ChevronRight, Plus, Settings2, X, Save, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ===== NATURAL SORT (phân cấp, hỗ trợ số La Mã) =====

/** Chuyển số La Mã → số nguyên. Trả về NaN nếu không phải La Mã hợp lệ. */
function romanToInt(s: string): number {
  const map: Record<string, number> = {
    I: 1, IV: 4, V: 5, IX: 9,
    X: 10, XL: 40, L: 50, XC: 90,
    C: 100, CD: 400, D: 500, CM: 900, M: 1000,
  };
  const upper = s.toUpperCase();
  // Chỉ chấp nhận chuỗi thuần ký tự La Mã
  if (!/^[IVXLCDM]+$/.test(upper)) return NaN;
  let result = 0;
  let i = 0;
  while (i < upper.length) {
    const two = upper[i] + (upper[i + 1] ?? '');
    if (map[two]) { result += map[two]; i += 2; }
    else if (map[upper[i]]) { result += map[upper[i]]; i++; }
    else return NaN;
  }
  return result;
}

/** Tách chuỗi mã thành mảng token theo dấu chấm & khoảng trắng */
function tokenize(s: string): string[] {
  return s.split(/[.\s]+/).filter(Boolean);
}

/** So sánh 2 token đơn lẻ: số → so sánh số học; La Mã → quy đổi; còn lại → alphabet */
function compareToken(a: string, b: string): number {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;          // Số thông thường

  const ra = romanToInt(a);
  const rb = romanToInt(b);
  if (!isNaN(ra) && !isNaN(rb)) return ra - rb;          // Số La Mã

  return a.localeCompare(b, undefined, { sensitivity: 'base' }); // Chữ cái
}

/** Hàm Natural Sort phân cấp: so sánh token từng cặp từ trái sang phải */
function naturalSort(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  const len = Math.min(ta.length, tb.length);
  for (let i = 0; i < len; i++) {
    const cmp = compareToken(ta[i], tb[i]);
    if (cmp !== 0) return cmp;
  }
  return ta.length - tb.length; // Chuỗi ngắn hơn đứng trước
}

interface DynamicColumn {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number';
}

interface Plan {
  id: string;
  planId: string;
  appendix: string;
  phuLuc?: string;
  costItem: string;
  description: string;
  budget: number;
  departmentName: string;
  theoQuyetDinh?: string;
  namKeHoach: number;
  level?: number;
  parentPlanId?: string;
  additional_info?: Record<string, any>;
}

export default function PlanView({ profile }: { profile: any }) {
  const isAdminOrBGD = isSuperUser(profile);

  const isSharedDept = (dept?: string) => {
    if (!dept) return false;
    const d = dept.toLowerCase().trim();
    return d === 'các phòng' || d === 'dùng chung';
  };

  const isAllowedDept = (dept?: string) => {
    if (!dept) return false;
    return dept.toLowerCase().trim() === profile?.phongBan?.toLowerCase().trim() || isSharedDept(dept);
  };

  const [rawPlans, setRawPlans] = useState<Plan[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const plans = React.useMemo(() => {
    const budgetRolledUp = calculateRollupBudgets(rawPlans);
    return calculateRollupActualCosts(budgetRolledUp, contracts);
  }, [rawPlans, contracts]);
  const [filteredPlans, setFilteredPlans] = useState<Plan[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [masterAppendices, setMasterAppendices] = useState<{id: string, tenPhuLuc: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [filterAppendix, setFilterAppendix] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [dynamicColumns, setDynamicColumns] = useState<DynamicColumn[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newCol, setNewCol] = useState<DynamicColumn>({ key: '', label: '', type: 'text' });

  // CRUD State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Import Year Selection
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importYear, setImportYear] = useState<number>(new Date().getFullYear());
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const years = [2024, 2025, 2026, 2027, 2028];
  useEffect(() => {
    // Load TẤT CẢ plans từ Firestore, lọc client-side
    // USER thấy: phòng ban của mình + "Các phòng". Admin thấy tất cả.
    const unsubPlans = onSnapshot(collection(db, 'plans'), (snapshot) => {
      const rawData = snapshot.docs.map(doc => sanitizePlan(doc.id, doc.data()) as any as Plan);

      // Với USER: chỉ giữ lại plans của phòng ban họ + "Các phòng"
      const userDept = profile?.phongBan;
      const isUser = !isAdminOrBGD && userDept;
      const data = isUser
        ? rawData.filter(p =>
            (p.departmentName && userDept && p.departmentName.toLowerCase().trim() === userDept.toLowerCase().trim()) ||
            isSharedDept(p.departmentName)
          )
        : rawData;

      setRawPlans(data);

      const allKeys = new Set<string>();
      data.forEach(p => {
        if (p.additional_info) Object.keys(p.additional_info).forEach(k => allKeys.add(k));
      });
      if (dynamicColumns.length === 0 && allKeys.size > 0) {
        setDynamicColumns(Array.from(allKeys).map(k => ({ key: k, label: k, type: 'text' })));
      }
      setLoading(false);
    });

    const unsubDepts = onSnapshot(collection(db, 'departments'), (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data().name as string).sort((a, b) =>
        (a || '').toString().localeCompare((b || '').toString(), undefined, { numeric: true, sensitivity: 'base' })
      );
      setDepartments(data);
      if (!isAdminOrBGD && profile?.phongBan) {
        const matched = data.find(d => d.toLowerCase().trim() === profile.phongBan.toLowerCase().trim());
        setFilterDepartment(matched || profile.phongBan);
      }
    });

    const unsubMasterAppendices = onSnapshot(collection(db, 'master_appendices'), (snapshot) => {
      setMasterAppendices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    });

    const unsubContracts = onSnapshot(collection(db, 'contracts'), (snapshot) => {
      const data = snapshot.docs.map(doc => sanitizeContract(doc.id, doc.data()));
      setContracts(data);
    });

    return () => {
      unsubPlans();
      unsubDepts();
      unsubMasterAppendices();
      unsubContracts();
    };
  }, []);
  useEffect(() => {
    const isUser = !isAdminOrBGD;
    const userDept = profile?.phongBan;

    const filtered = plans.filter(p => {
      const matchSearch = p.planId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchYear = p.namKeHoach === selectedYear;
      const matchAppendix = filterAppendix === 'all' || (p.phuLuc || p.appendix) === filterAppendix;

      // USER: luôn enforce filter cứng theo phòng ban — không cho phép xem phòng ban khác
      const matchDept = isUser && userDept
        ? (p.departmentName?.toLowerCase().trim() === userDept.toLowerCase().trim() || isSharedDept(p.departmentName))
        : (filterDepartment === 'all' || p.departmentName?.toLowerCase().trim() === filterDepartment.toLowerCase().trim() || isSharedDept(p.departmentName));

      return matchSearch && matchYear && matchAppendix && matchDept;
    });
    setFilteredPlans(filtered);
  }, [plans, searchTerm, selectedYear, filterAppendix, filterDepartment, profile]);

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async () => {
    if (!pendingFile) return;

    setIsUploading(true);
    setIsImportModalOpen(false);
    const toastId = toast.loading(`Đang import kế hoạch cho năm ${importYear}...`);

    try {
      const data = await parsePlanExcel(pendingFile);
      
      // === AUTO-UPSERT: Tự động thêm Phụ lục & Phòng ban mới vào Danh mục chuẩn ===
      const existingAppendixNames = new Set(masterAppendices.map(ma => ma.tenPhuLuc.trim()));
      const newAppendices = new Set<string>();
      const deptsToProvision = new Set<string>();

      for (const item of data) {
        const appendixName = String(item.appendix || "").trim();
        if (appendixName && !existingAppendixNames.has(appendixName)) {
          newAppendices.add(appendixName);
        }
        if (item.departmentName) {
          deptsToProvision.add(String(item.departmentName).trim());
        }
      }

      // Batch upsert Phụ lục mới vào master_appendices
      if (newAppendices.size > 0) {
        const upsertBatch = writeBatch(db);
        for (const tenPhuLuc of newAppendices) {
          const appendixRef = doc(db, 'master_appendices', tenPhuLuc.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, ''));
          upsertBatch.set(appendixRef, { tenPhuLuc }, { merge: true });
        }
        await upsertBatch.commit();
        toast.info(`Đã tự động thêm ${newAppendices.size} Phụ lục mới: ${Array.from(newAppendices).join(', ')}`, { duration: 4000 });
      }

      const batch = writeBatch(db);
      let addedCount = 0;
      let skippedCount = 0;

      for (const item of data) {
        const pid = String(item.planId || "").trim().replace(/\//g, '-');
        if (!pid || pid === "." || pid.length <= 1) {
          skippedCount++;
          continue;
        }

        // Enforce department range limit for regular Users
        if (!isAdminOrBGD && profile?.phongBan) {
          if (item.departmentName !== profile.phongBan && !isSharedDept(item.departmentName)) {
            skippedCount++;
            continue;
          }
        }

        // Use year from file if valid, otherwise use selected import year
        const finalYear = item.namKeHoach || importYear;
        const docId = `${pid}_${finalYear}`;
        const planRef = doc(db, 'plans', docId);
        const planSnap = await getDoc(planRef);
        
        if (!planSnap.exists()) {
          // Auto-fill level and parent ID
          const auto = getAutoLevelAndParent(pid, item.appendix);

          batch.set(planRef, {
            ...item,
            planId: pid,
            namKeHoach: finalYear,
            level: auto.level,
            parentPlanId: auto.parentPlanId,
            createdBy: auth.currentUser?.email || 'system',
            createdAt: new Date().toISOString()
          });
          addedCount++;
        } else {
          skippedCount++;
        }
      }

      // Batch upsert Phòng ban vào departments
      for (const deptName of deptsToProvision) {
        const deptRef = doc(db, 'departments', deptName.replace(/\s+/g, '_').toLowerCase());
        batch.set(deptRef, { name: deptName }, { merge: true });
      }

      await batch.commit();
      toast.success(`Hoàn tất: Thêm mới ${addedCount} kế hoạch, Bỏ qua ${skippedCount} (đã tồn tại).`, { id: toastId });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Lỗi khi xử lý file: " + error.message, { id: toastId });
    } finally {
      setIsUploading(false);
      setPendingFile(null);
    }
  };
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'plans', id));
      const remainingPlans = rawPlans.filter(plan => plan.id !== id);
      setRawPlans(remainingPlans);
      console.log("Xóa thành công!");
    } catch (error: any) {
      console.error("Lỗi xóa:", error);
      console.error("Lỗi khi xóa dữ liệu: " + error.message);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      console.log("Bắt đầu xóa các ID:", selectedIds);
      // Chạy vòng lặp xóa từng cái
      for (const id of selectedIds) {
        await deleteDoc(doc(db, 'plans', id));
      }
      
      // Lọc lại mảng hiển thị
      const remainingPlans = rawPlans.filter(plan => !selectedIds.includes(plan.id));
      setRawPlans(remainingPlans);
      setSelectedIds([]); // Reset checkbox
      console.log("✅ Xóa thành công!");
    } catch (error: any) {
      console.error("LỖI XÓA FIREBASE:", error);
      console.error("❌ Lỗi Firebase: " + error.message);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredPlans.map(plan => plan.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan?.planId || !editingPlan?.namKeHoach) return;

    const isParent = plans.some(p => p.parentPlanId === editingPlan.planId && p.namKeHoach === editingPlan.namKeHoach && p.id !== editingPlan.id);
    
    // Save computed budget if it is a parent
    const finalBudget = isParent
      ? plans.filter(p => p.parentPlanId === editingPlan.planId && p.namKeHoach === editingPlan.namKeHoach && p.id !== editingPlan.id)
             .reduce((sum, p) => sum + (p.budget || 0), 0)
      : (editingPlan.budget || 0);

    const toastId = toast.loading("Đang lưu kế hoạch...");
    try {
      const pid = editingPlan.planId.trim().replace(/\//g, '-');
      const year = editingPlan.namKeHoach;
      const targetDocId = `${pid}_${year}`;
      
      const data = {
        ...editingPlan,
        planId: pid,
        namKeHoach: year,
        budget: finalBudget,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email
      };

      // Enforce RBAC rules on saving
      if (!isAdminOrBGD && profile?.phongBan) {
        // Khóa cứng cấu trúc: Tự động chạy thuật toán nhận diện gán Cấp độ & Mã cha mặc định
        const auto = getAutoLevelAndParent(pid, editingPlan.appendix || '');
        data.level = auto.level;
        data.parentPlanId = auto.parentPlanId;

        if (!isAllowedDept(data.departmentName)) {
          toast.error("Bạn chỉ có quyền lưu kế hoạch thuộc phòng ban của mình hoặc các danh mục dùng chung!", { id: toastId });
          return;
        }
        if (data.parentPlanId) {
          const parentPlan = plans.find(p => p.planId === data.parentPlanId && p.namKeHoach === year);
          if (parentPlan && !isAllowedDept(parentPlan.departmentName)) {
            toast.error("Kế hoạch cha phải thuộc phòng ban của bạn hoặc các danh mục dùng chung!", { id: toastId });
            return;
          }
        }
      }

      if (!editingPlan.id) {
        // Adding a new plan
        const planRef = doc(db, 'plans', targetDocId);
        const snap = await getDoc(planRef);
        if (snap.exists()) {
          toast.error("Mã kế hoạch này đã tồn tại trong năm nay, vui lòng kiểm tra lại!", { id: toastId });
          return;
        }
        data.createdAt = new Date().toISOString();
        data.createdBy = auth.currentUser?.email;
        data.id = targetDocId;
        await setDoc(planRef, data, { merge: true });
      } else {
        // Editing an existing plan
        const oldDocId = editingPlan.id;
        
        if (oldDocId !== targetDocId) {
          // Check collision if document ID changes
          const newPlanRef = doc(db, 'plans', targetDocId);
          const snap = await getDoc(newPlanRef);
          if (snap.exists()) {
            toast.error("Mã kế hoạch này đã tồn tại trong năm nay, vui lòng kiểm tra lại!", { id: toastId });
            return;
          }
          
          data.id = targetDocId;
          
          // Atomically write new document and delete old document
          const batch = writeBatch(db);
          batch.set(newPlanRef, data);
          batch.delete(doc(db, 'plans', oldDocId));
          await batch.commit();
        } else {
          // Normal save
          const planRef = doc(db, 'plans', oldDocId);
          await setDoc(planRef, data, { merge: true });
        }
      }

      toast.success("Đã lưu kế hoạch thành công", { id: toastId });
      setIsModalOpen(false);
      setEditingPlan(null);
    } catch (error: any) {
      toast.error("Lỗi: " + error.message, { id: toastId });
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const addDynamicColumn = () => {
    if (!newCol.key || !newCol.label) return;
    setDynamicColumns([...dynamicColumns, newCol]);
    setNewCol({ key: '', label: '', type: 'text' });
    setIsAddingColumn(false);
    toast.success(`Đã thêm cột "${newCol.label}"`);
  };

  const updateAdditionalInfo = async (planId: string, key: string, value: string) => {
    try {
      const planRef = doc(db, 'plans', planId);
      await setDoc(planRef, {
        additional_info: {
          [key]: value
        }
      }, { merge: true });
    } catch (error: any) {
      toast.error("Lỗi cập nhật: " + error.message);
    }
  };

  const uniqueDepartments = Array.from(new Set(plans.map(p => p.departmentName))).filter(Boolean).sort((a, b) => {
    const strA = (a || '').toString();
    const strB = (b || '').toString();
    return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
  });
  const appendixOptions = masterAppendices.map(ma => ma.tenPhuLuc).sort((a, b) => {
    const strA = (a || '').toString();
    const strB = (b || '').toString();
    return strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
  });

  const isParent = editingPlan?.planId
    ? plans.some(p => p.parentPlanId === editingPlan.planId && p.namKeHoach === editingPlan.namKeHoach && p.id !== editingPlan.id)
    : false;

  const descendants = editingPlan?.planId
    ? getDescendantPlanIds(editingPlan.planId, plans)
    : new Set<string>();

  const eligibleParents = plans.filter(p => {
    const matchesYear = p.namKeHoach === editingPlan?.namKeHoach;
    const notSelf = p.planId !== editingPlan?.planId;
    const notDescendant = !descendants.has(p.planId);
    
    // Regular User can only select a parent belonging to their department or 'Các phòng' / 'Dùng chung'
    const matchesDept = (!isAdminOrBGD && profile?.phongBan)
      ? isAllowedDept(p.departmentName)
      : true;

    return matchesYear && notSelf && notDescendant && matchesDept;
  });

  const displayedBudget = isParent
    ? plans.filter(p => p.parentPlanId === editingPlan?.planId && p.namKeHoach === editingPlan?.namKeHoach && p.id !== editingPlan?.id)
           .reduce((sum, p) => sum + (p.budget || 0), 0)
    : (editingPlan?.budget || 0);

  const handlePlanIdOrAppendixChange = (updatedFields: Partial<Plan>) => {
    if (!editingPlan) return;
    const nextPlan = { ...editingPlan, ...updatedFields };
    const auto = getAutoLevelAndParent(nextPlan.planId || '', nextPlan.appendix || '');
    setEditingPlan({
      ...nextPlan,
      level: auto.level,
      parentPlanId: auto.parentPlanId
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white p-3 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3 sm:space-y-4">
        {/* Row 1: Filters */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="relative flex-1 min-w-[200px] sm:min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm mã KH, tên khoản mục..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Năm:</span>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-blue-600 focus:outline-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Phụ lục:</span>
            <select 
              value={filterAppendix}
              onChange={(e) => setFilterAppendix(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none min-w-[140px]"
            >
              <option value="all">Tất cả Phụ lục</option>
              {appendixOptions.map(app => <option key={app} value={app}>{app}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Phòng ban:</span>
            <select 
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              disabled={!isAdminOrBGD}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none min-w-[180px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="all">Tất cả Phòng ban</option>
              {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
          </div>

          {(searchTerm || selectedYear !== new Date().getFullYear() || filterAppendix !== 'all' || (isAdminOrBGD && filterDepartment !== 'all')) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setSelectedYear(new Date().getFullYear());
                setFilterAppendix('all');
                if (profile?.role === 'Admin') setFilterDepartment('all');
              }}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Xóa bộ lọc"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Row 2: Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => {
                setEditingPlan({ 
                  planId: '', 
                  appendix: '', 
                  costItem: '', 
                  description: '', 
                  budget: 0, 
                  departmentName: (profile?.role === 'User' && profile?.phongBan) ? profile.phongBan : '', 
                  theoQuyetDinh: '', 
                  namKeHoach: selectedYear,
                  level: 4,
                  parentPlanId: ''
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 text-sm"
            >
              <Plus size={18} />
              Thêm Kế hoạch mới
            </button>
            <button 
              onClick={() => setIsAddingColumn(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
            >
              <Settings2 size={18} />
              Thêm cột động
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => generatePlanTemplate(departments)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm"
            >
              <Download size={18} />
              Tải Template
            </button>
            <label className={cn(
              "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 cursor-pointer text-sm",
              isUploading && "opacity-50 cursor-not-allowed"
            )}>
              <Upload size={18} className={isUploading ? "animate-bounce" : ""} />
              {isUploading ? "Đang xử lý..." : "Import Excel"}
              <input 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPendingFile(file);
                    setImportYear(selectedYear);
                    setIsImportModalOpen(true);
                  }
                  e.target.value = '';
                }} 
                disabled={isUploading}
              />
            </label>
            {selectedIds.length > 0 && (
              <button 
                onClick={handleDeleteSelected}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 text-sm animate-in fade-in slide-in-from-right-2"
              >
                Xóa {selectedIds.length} dòng đã chọn
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Import Year Selection Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Xác nhận Năm Import</h3>
            <p className="text-sm text-slate-500 mb-6">Bạn đang chuẩn bị Import dữ liệu cho năm nào?</p>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Chọn Năm</label>
                <select 
                  value={importYear}
                  onChange={(e) => setImportYear(Number(e.target.value))}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setIsImportModalOpen(false); setPendingFile(null); }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleFileUpload}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                  Bắt đầu Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddingColumn && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex flex-wrap items-end gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-blue-400 uppercase">Tên cột (ID)</label>
            <input 
              value={newCol.key}
              onChange={e => setNewCol({...newCol, key: e.target.value.replace(/\s+/g, '_')})}
              placeholder="vi_du_cot"
              className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-blue-400 uppercase">Nhãn hiển thị</label>
            <input 
              value={newCol.label}
              onChange={e => setNewCol({...newCol, label: e.target.value})}
              placeholder="Ví dụ cột"
              className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-blue-400 uppercase">Loại dữ liệu</label>
            <select 
              value={newCol.type}
              onChange={e => setNewCol({...newCol, type: e.target.value as any})}
              className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm"
            >
              <option value="text">Văn bản</option>
              <option value="date">Ngày tháng</option>
              <option value="number">Số lượng</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={addDynamicColumn} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save size={18} /></button>
            <button onClick={() => setIsAddingColumn(false)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><X size={18} /></button>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    onChange={handleSelectAll}
                    checked={filteredPlans.length > 0 && selectedIds.length === filteredPlans.length}
                  />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã KH</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phụ lục</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khoản mục</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nội dung chi phí</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Kinh phí theo KH (triệu đồng)</th>
                <th className="px-6 py-4 text-xs font-bold text-emerald-600 uppercase tracking-wider text-right">Quyết toán HĐ (triệu đồng)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phòng thực hiện</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Theo quyết định</th>
                
                {dynamicColumns.map(col => (
                  <th key={col.key} className="px-6 py-4 text-xs font-bold text-blue-500 uppercase tracking-wider bg-blue-50/30">
                    {col.label}
                  </th>
                ))}

                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10 + dynamicColumns.length} className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td></tr>
              ) : filteredPlans.length === 0 ? (
                <tr><td colSpan={10 + dynamicColumns.length} className="px-6 py-8 text-center text-slate-400">Không tìm thấy dữ liệu cho năm {selectedYear}.</td></tr>
              ) : [...filteredPlans].sort((a, b) => {
                // 1. Nhóm theo Phụ lục (Natural Sort)
                const appendixCmp = naturalSort(
                  (a.phuLuc || a.appendix || '').toString(),
                  (b.phuLuc || b.appendix || '').toString()
                );
                if (appendixCmp !== 0) return appendixCmp;

                // 2. Sắp xếp theo Mã KH (planId) — Natural Sort phân cấp
                const planIdCmp = naturalSort(
                  (a.planId || '').toString(),
                  (b.planId || '').toString()
                );
                if (planIdCmp !== 0) return planIdCmp;

                // 3. Tie-break: Khoản mục
                return naturalSort(
                  (a.costItem || '').toString(),
                  (b.costItem || '').toString()
                );
              }).map((plan) => (
                <tr key={plan.id} className={cn(
                  "hover:bg-slate-50 transition-colors",
                  selectedIds.includes(plan.id) && "bg-blue-50/50"
                )}>
                  <td className="px-6 py-4">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedIds.includes(plan.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, plan.id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== plan.id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 font-mono text-sm text-blue-600 font-semibold">{plan.planId}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{plan.appendix}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{plan.costItem}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-medium">{plan.description}</td>
                  <td className="px-6 py-4 text-sm text-slate-900 font-bold text-right">
                    {(plan.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-right text-emerald-700 animate-fade-in">
                    {((plan.actualCost || 0) / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{plan.departmentName}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 italic">{plan.theoQuyetDinh || '-'}</td>
                  
                  {dynamicColumns.map(col => (
                    <td key={col.key} className="px-4 py-2 bg-blue-50/10">
                      <input 
                        type={col.type}
                        defaultValue={plan.additional_info?.[col.key] || ''}
                        onBlur={(e) => updateAdditionalInfo(plan.id, col.key, e.target.value)}
                        className="w-full px-2 py-1 text-sm bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 focus:outline-none"
                      />
                    </td>
                  ))}

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEdit(plan)}
                        className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors text-xs font-bold"
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={() => handleDelete(plan.id)}
                        className="px-3 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-xs font-bold"
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingPlan?.id ? 'Chỉnh sửa Kế hoạch' : 'Thêm Kế hoạch mới'}
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); setEditingPlan(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Mã KH (Primary Key)</label>
                  <input 
                    required
                    value={editingPlan?.planId || ''}
                    onChange={e => handlePlanIdOrAppendixChange({ planId: e.target.value.replace(/\//g, '-') })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Năm kế hoạch</label>
                  <select 
                    required
                    value={editingPlan?.namKeHoach || ''}
                    onChange={e => setEditingPlan({...editingPlan, namKeHoach: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600"
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Phụ lục</label>
                  <select 
                    required
                    value={editingPlan?.appendix || ''}
                    onChange={e => handlePlanIdOrAppendixChange({ appendix: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- Chọn Phụ lục --</option>
                    {appendixOptions.map(app => <option key={app} value={app}>{app}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Khoản mục</label>
                  <input 
                    value={editingPlan?.costItem || ''}
                    onChange={e => setEditingPlan({...editingPlan, costItem: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Cấp độ {!isAdminOrBGD && "(Tự động)"}</label>
                  <select 
                    required
                    disabled={!isAdminOrBGD}
                    value={editingPlan?.level || ''}
                    onChange={e => setEditingPlan({...editingPlan, level: Number(e.target.value)})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Chọn Cấp độ --</option>
                    {[1, 2, 3, 4, 5, 6].map(lvl => <option key={lvl} value={lvl}>Cấp {lvl}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Thuộc kế hoạch tổng (Mã cha) {!isAdminOrBGD && "(Tự động)"}</label>
                  <select 
                    disabled={!isAdminOrBGD}
                    value={editingPlan?.parentPlanId || ''}
                    onChange={e => setEditingPlan({...editingPlan, parentPlanId: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">-- Không thuộc kế hoạch tổng nào --</option>
                    {eligibleParents.map(p => (
                      <option key={p.id} value={p.planId}>
                        {p.planId} - {p.description ? p.description.substring(0, 50) + (p.description.length > 50 ? '...' : '') : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Phòng thực hiện</label>
                  <select 
                    disabled={!isAdminOrBGD}
                    value={editingPlan?.departmentName || ''}
                    onChange={e => setEditingPlan({...editingPlan, departmentName: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Theo quyết định</label>
                  <input 
                    value={editingPlan?.theoQuyetDinh || ''}
                    onChange={e => setEditingPlan({...editingPlan, theoQuyetDinh: e.target.value})}
                    placeholder="VD: QĐ số 123/PVOIL"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Nội dung chi phí</label>
                <textarea 
                  required
                  rows={2}
                  value={editingPlan?.description || ''}
                  onChange={e => setEditingPlan({...editingPlan, description: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Kinh phí theo KH (triệu đồng)</label>
                <input 
                  type="number"
                  value={displayedBudget}
                  disabled={isParent}
                  onChange={e => setEditingPlan({...editingPlan, budget: Number(e.target.value)})}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-600 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {isParent && (
                  <p className="text-[11px] text-amber-600 font-medium mt-1">
                    * Mã này có mã con trực tiếp liên kết. Kinh phí được tự động cộng dồn từ các mã con.
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
