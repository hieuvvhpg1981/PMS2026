import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, query, where, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';
import { sanitizePlan, sanitizeMonthlyRegistration } from '../lib/sanitize';
import { Save, History, AlertCircle, Filter, Search, Calendar } from 'lucide-react';
import { calculateRollupBudgets, isSuperUser } from '../lib/hierarchy';

// ===== NATURAL SORT (phân cấp, hỗ trợ số La Mã) =====
function romanToInt(s: string): number {
  const map: Record<string, number> = {
    I: 1, IV: 4, V: 5, IX: 9,
    X: 10, XL: 40, L: 50, XC: 90,
    C: 100, CD: 400, D: 500, CM: 900, M: 1000,
  };
  const upper = s.toUpperCase();
  if (!/^[IVXLCDM]+$/.test(upper)) return NaN;
  let result = 0, i = 0;
  while (i < upper.length) {
    const two = upper[i] + (upper[i + 1] ?? '');
    if (map[two]) { result += map[two]; i += 2; }
    else if (map[upper[i]]) { result += map[upper[i]]; i++; }
    else return NaN;
  }
  return result;
}
function tokenize(s: string): string[] { return s.split(/[.\s]+/).filter(Boolean); }
function compareToken(a: string, b: string): number {
  const na = parseInt(a, 10), nb = parseInt(b, 10);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  const ra = romanToInt(a), rb = romanToInt(b);
  if (!isNaN(ra) && !isNaN(rb)) return ra - rb;
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}
function naturalSort(a: string, b: string): number {
  const ta = tokenize(a), tb = tokenize(b);
  const len = Math.min(ta.length, tb.length);
  for (let i = 0; i < len; i++) { const c = compareToken(ta[i], tb[i]); if (c !== 0) return c; }
  return ta.length - tb.length;
}

export default function ForecastView({ profile }: { profile: any }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [masterAppendices, setMasterAppendices] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedAppendix, setSelectedAppendix] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const isSuper = isSuperUser(profile);
    const isUser = !isSuper && profile?.phongBan;
    const qR = query(collection(db, 'monthly_registrations'), where('year', '==', year));
    if (isUser) {
      setSelectedDept(profile.phongBan);
    }

    const isSharedDept = (dept?: string) => {
      if (!dept) return false;
      const d = dept.toLowerCase().trim();
      return d === 'các phòng' || d === 'dùng chung';
    };

    const isAllowedDept = (dept?: string) => {
      if (!dept) return false;
      return dept.toLowerCase().trim() === profile?.phongBan?.toLowerCase().trim() || isSharedDept(dept);
    };

    // Load TẤT CẢ plans, lọc client-side: userDept + "Các phòng" / "Dùng chung"
    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      const rawPlans = snap.docs.map(d => sanitizePlan(d.id, d.data()));
      const rolledUp = calculateRollupBudgets(rawPlans);
      const filtered = isUser
        ? rolledUp.filter((p: any) => isAllowedDept(p.departmentName))
        : rolledUp;
      setPlans(filtered);
    });

    const unsubRegs = onSnapshot(qR, (snap) => {
      const all = snap.docs.map(d => sanitizeMonthlyRegistration(d.id, d.data()));
      if (isUser) {
        setRegistrations(all.filter(r => r.phongBan?.toLowerCase().trim() === profile.phongBan.toLowerCase().trim()));
      } else {
        setRegistrations(all);
      }
      setLoading(false);
    });


    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap) => {
      const data = snap.docs.map(d => d.data().name as string).sort((a, b) =>
        (a || '').toString().localeCompare((b || '').toString(), undefined, { numeric: true, sensitivity: 'base' })
      );
      setDepartments(data);
      if (isUser) {
        const matched = data.find(d => d.toLowerCase().trim() === profile.phongBan.toLowerCase().trim());
        setSelectedDept(matched || profile.phongBan);
      }
    });

    const unsubAppendices = onSnapshot(collection(db, 'master_appendices'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) =>
        (a.tenPhuLuc || '').toString().localeCompare((b.tenPhuLuc || '').toString(), undefined, { numeric: true, sensitivity: 'base' })
      );
      setMasterAppendices(data);
    });

    return () => { unsubPlans(); unsubRegs(); unsubDepts(); unsubAppendices(); };
  }, [year]);

  const handleUpdateRegistration = async (planDocId: string, planId: string, month: number, amount: string) => {
    const cleanAmount = amount.replace(/,/g, '');
    if (cleanAmount === '') return;
    
    const numAmount = parseFloat(cleanAmount);
    if (isNaN(numAmount)) return;

    const regId = `${planDocId}_${year}_${month}`;
    try {
      await setDoc(doc(db, 'monthly_registrations', regId), {
        planDocId,
        planId,
        year,
        month,
        amount: numAmount,
        phongBan: profile?.phongBan || '',
        updatedBy: auth.currentUser?.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast.success(`Đã lưu đăng ký T${month}`, { duration: 1000 });
    } catch (error: any) {
      toast.error("Lỗi cập nhật: " + error.message);
    }
  };

  const getRegValue = (planDocId: string, planId: string, month: number) => {
    const r = registrations.find(r => (r.planDocId ? r.planDocId === planDocId : r.planId === planId) && r.month === month);
    return r ? r.amount.toLocaleString() : '';
  };

  const filteredPlans = plans.filter(p => {
    const matchesDept = selectedDept 
      ? p.departmentName?.toLowerCase().trim() === selectedDept.toLowerCase().trim() 
      : true;
    const matchesAppendix = selectedAppendix ? p.appendix === selectedAppendix : true;
    const matchesSearch = p.planId.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = p.namKeHoach === year;
    return matchesDept && matchesAppendix && matchesSearch && matchesYear;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm mã KH, nội dung..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              disabled={!isSuperUser(profile)}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none disabled:opacity-60"
            >
              <option value="">Tất cả phòng ban</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select 
              value={selectedAppendix}
              onChange={(e) => setSelectedAppendix(e.target.value)}
              className="pl-10 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="">Tất cả Phụ lục</option>
              {masterAppendices.map(a => <option key={a.id} value={a.tenPhuLuc}>{a.tenPhuLuc}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
          <button 
            onClick={() => setYear(year - 1)}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
          >
            <Calendar size={16} className="rotate-180" />
          </button>
          <span className="px-4 font-bold text-slate-700">Năm {year}</span>
          <button 
            onClick={() => setYear(year + 1)}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
          >
            <Calendar size={16} />
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="text-amber-600 shrink-0" size={20} />
        <div>
          <h4 className="text-sm font-bold text-amber-900">Đăng ký kế hoạch (Monthly Registration)</h4>
          <p className="text-xs text-amber-700">Nhập số tiền dự kiến giải ngân cho từng tháng. Dữ liệu sẽ được tự động lưu khi bạn rời khỏi ô nhập liệu (onBlur).</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1560px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10 w-64 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Kế hoạch / Mã KH</th>
                <th className="px-4 py-3 text-xs font-bold text-emerald-600 uppercase text-right border-l border-slate-200 w-40 bg-emerald-50/40">Kinh phí theo KH</th>
                {[...Array(12)].map((_, i) => (
                  <th key={i} className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-center border-l border-slate-100">Tháng {i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={14} className="px-6 py-12 text-center text-slate-400">Đang tải dữ liệu ma trận...</td></tr>
              ) : [...filteredPlans].sort((a, b) => {
                // 1. Nhóm theo Phụ lục (Natural Sort)
                const appCmp = naturalSort((a.appendix || '').toString(), (b.appendix || '').toString());
                if (appCmp !== 0) return appCmp;
                // 2. Sắp xếp Mã KH phân cấp (hỗ trợ số La Mã)
                return naturalSort((a.planId || '').toString(), (b.planId || '').toString());
              }).map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50 transition-colors group">
                  {/* Cột 1: Tên KH + Mã KH */}
                  <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)] group-hover:bg-slate-50">
                    <p className="text-xs font-bold text-slate-900 line-clamp-2 mb-1">{plan.description}</p>
                    <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{plan.planId}</span>
                  </td>
                  {/* Cột 2: Kinh phí theo KH */}
                  <td className="px-4 py-3 border-l border-slate-200 bg-emerald-50/20 group-hover:bg-emerald-50/40 transition-colors">
                    <p className="text-sm font-bold text-emerald-700 text-right tabular-nums">
                      {(plan.budget || 0).toLocaleString('vi-VN')}
                    </p>
                    <p className="text-[10px] text-emerald-500 text-right font-medium">VNĐ</p>
                  </td>
                  {[...Array(12)].map((_, i) => (
                    <td key={i} className="px-1 py-1 border-l border-slate-50">
                      <input 
                        type="text"
                        defaultValue={getRegValue(plan.id, plan.planId, i + 1)}
                        onBlur={(e) => handleUpdateRegistration(plan.id, plan.planId, i + 1, e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-2 text-right text-sm font-medium text-slate-700 border border-transparent hover:border-blue-200 focus:border-blue-500 focus:bg-white rounded transition-all bg-transparent focus:outline-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
