import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { exportReport } from '../services/excelService';
import { toast } from 'sonner';
import { FileSpreadsheet, FileText, Download, Printer, User, ChevronDown, Loader2, X } from 'lucide-react';
import { sanitizePlan, sanitizeInvoice, sanitizeMonthlyRegistration, sanitizeContract } from '../lib/sanitize';
import { calculateRollupBudgets, calculateRollupReportData, sortPlansHierarchy, isSuperUser } from '../lib/hierarchy';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Department {
  id: string;
  name: string;
}

interface PlanData {
  id: string;
  planId: string;
  appendix: string;
  description: string;
  budget: number;
  departmentName: string;
  namKeHoach: number;
  [key: string]: any;
}

export default function ReportView({ profile }: { profile: any }) {
  const isSuper = isSuperUser(profile);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allPlans, setAllPlans] = useState<PlanData[]>([]);
  const [masterAppendices, setMasterAppendices] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedAppendix, setSelectedAppendix] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  
  const years = [2024, 2025, 2026, 2027, 2028];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  // Signature settings
  const [signature, setSignature] = useState({
    preparer: 'Nguyễn Văn A',
    approver: 'Trần Thị B',
    title: 'Trưởng phòng'
  });

  useEffect(() => {
    const qD = query(collection(db, 'departments'));
    const qP = query(collection(db, 'plans'));

    const unsubDepts = onSnapshot(qD, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Department)).sort((a, b) => {
        return (a.name || '').toString().localeCompare((b.name || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
      });
      setDepartments(data);
      if (!isSuper && profile?.phongBan) {
        const matched = data.find(d => d.name.toLowerCase().trim() === profile.phongBan.toLowerCase().trim());
        setSelectedDept(matched ? matched.name : profile.phongBan);
      } else if (isSuper && selectedDept === undefined) {
        setSelectedDept("");
      }
    });

    const unsubPlans = onSnapshot(qP, (snap) => {
      const data = snap.docs.map(d => sanitizePlan(d.id, d.data()) as any as PlanData);
      setAllPlans(calculateRollupBudgets(data));
      setLoading(false);
    });

    const unsubAppendices = onSnapshot(collection(db, 'master_appendices'), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
        return (a.tenPhuLuc || '').toString().localeCompare((b.tenPhuLuc || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
      });
      setMasterAppendices(data);
    });

    return () => { unsubDepts(); unsubPlans(); unsubAppendices(); };
  }, [profile]);

  // Auto-update preview when filters change
  useEffect(() => {
    if (isPreviewVisible) {
      handlePreview();
    }
  }, [selectedYear, selectedMonth, selectedDept, selectedAppendix]);

  const aggregateData = async () => {
    // Bảo mật: với USER, luôn override bộ lọc về phòng ban của họ 
    const effectiveDept = (!isSuper && profile?.phongBan)
      ? profile.phongBan
      : selectedDept;

    // 1. Fetch plans for the selected year
    const plansQuery = query(
      collection(db, 'plans'),
      where('namKeHoach', '==', selectedYear)
    );

    const plansSnap = await getDocs(plansQuery);
    let plans = plansSnap.docs.map(d => sanitizePlan(d.id, d.data()) as any as PlanData);

    const isSharedDept = (dept?: string) => {
      if (!dept) return false;
      const d = dept.toLowerCase().trim();
      return d === 'các phòng' || d === 'dùng chung';
    };

    // 2. Filter plans client-side by department
    if (effectiveDept && effectiveDept !== 'all' && effectiveDept !== 'Tất cả' && effectiveDept !== '') {
      const normEffective = effectiveDept.toLowerCase().trim();
      plans = plans.filter(p => 
        (p.departmentName && p.departmentName.toLowerCase().trim() === normEffective) || 
        isSharedDept(p.departmentName)
      );
    }

    if (selectedAppendix !== 'all') {
      plans = plans.filter(p => p.appendix === selectedAppendix);
    }

    const planIds = plans.map(p => p.id);

    // 3. Query monthly_registrations and invoices securely
    let registrations: any[] = [];
    let invoices: any[] = [];

    const chunkArray = (arr: any[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    if (isSuper) {
      // Super Users fetch all registrations for that year and all invoices
      const registrationsQuery = query(
        collection(db, 'monthly_registrations'),
        where('year', '==', selectedYear)
      );
      const registrationsSnap = await getDocs(registrationsQuery);
      registrations = registrationsSnap.docs.map(d => sanitizeMonthlyRegistration(d.id, d.data()));

      const invoicesSnap = await getDocs(query(collection(db, 'invoices')));
      invoices = invoicesSnap.docs.map(d => sanitizeInvoice(d.id, d.data()));
    } else {
      // Regular Users: Fetch registrations and invoices in chunks of 30 matching their department's plans
      if (planIds.length > 0) {
        const planIdChunks = chunkArray(planIds, 30);
        const planIdTexts = plans.map(p => p.planId).filter(Boolean);
        const planIdTextChunks = chunkArray(planIdTexts, 30);

        // Fetch registrations by planDocId
        const regPromises1 = planIdChunks.map(chunk => {
          const q = query(
            collection(db, 'monthly_registrations'),
            where('year', '==', selectedYear),
            where('planDocId', 'in', chunk)
          );
          return getDocs(q);
        });

        // Fetch registrations by planId (legacy)
        const regPromises2 = planIdTextChunks.length > 0 ? planIdTextChunks.map(chunk => {
          const q = query(
            collection(db, 'monthly_registrations'),
            where('year', '==', selectedYear),
            where('planId', 'in', chunk)
          );
          return getDocs(q);
        }) : [];

        const [regSnaps1, regSnaps2] = await Promise.all([
          Promise.all(regPromises1),
          Promise.all(regPromises2)
        ]);

        const allRegs = [
          ...regSnaps1.flatMap(snap => snap.docs.map(d => sanitizeMonthlyRegistration(d.id, d.data()))),
          ...regSnaps2.flatMap(snap => snap.docs.map(d => sanitizeMonthlyRegistration(d.id, d.data())))
        ];

        // De-duplicate registrations
        const uniqueRegs = new Map();
        allRegs.forEach(r => uniqueRegs.set(r.id, r));
        registrations = Array.from(uniqueRegs.values());

        // Fetch invoices by planDocId
        const invPromises1 = planIdChunks.map(chunk => {
          const q = query(
            collection(db, 'invoices'),
            where('planDocId', 'in', chunk)
          );
          return getDocs(q);
        });

        // Fetch invoices by planId (legacy)
        const invPromises2 = planIdTextChunks.length > 0 ? planIdTextChunks.map(chunk => {
          const q = query(
            collection(db, 'invoices'),
            where('planId', 'in', chunk)
          );
          return getDocs(q);
        }) : [];

        const [invSnaps1, invSnaps2] = await Promise.all([
          Promise.all(invPromises1),
          Promise.all(invPromises2)
        ]);

        const allInvs = [
          ...invSnaps1.flatMap(snap => snap.docs.map(d => sanitizeInvoice(d.id, d.data()))),
          ...invSnaps2.flatMap(snap => snap.docs.map(d => sanitizeInvoice(d.id, d.data())))
        ];

        // De-duplicate invoices
        const uniqueInvs = new Map();
        allInvs.forEach(inv => uniqueInvs.set(inv.id, inv));
        invoices = Array.from(uniqueInvs.values());
      }
    }

    const monthRange = selectedMonth === 'all' ? months : [Number(selectedMonth)];
    const targetMonth = selectedMonth === 'all' ? 12 : Number(selectedMonth);

    // Join data for all plans first
    const joinedPlans = plans.map(plan => {
      const cleanPlanId = plan.planId.replace(/\//g, '-').trim().toUpperCase();

      // Calculate Total Plan (all year)
      const totalPlanned = registrations
        .filter(r => r.planDocId ? r.planDocId === plan.id : r.planId.replace(/\//g, '-').trim().toUpperCase() === cleanPlanId)
        .reduce((sum, r) => sum + (r.amount || 0), 0);

      // Calculate Accumulated Actual (from Jan to targetMonth) using invoices
      const accumulatedActualRaw = invoices
        .filter(inv => inv.planDocId ? inv.planDocId === plan.id : inv.planId.replace(/\//g, '-').trim().toUpperCase() === cleanPlanId)
        .filter(inv => {
          if (!inv.date) return false;
          const invDate = new Date(inv.date);
          const invMonth = invDate.getMonth() + 1;
          return invDate.getFullYear() === selectedYear && invMonth <= targetMonth;
        })
        .reduce((sum, inv) => sum + (inv.giaTriTruocThue || 0), 0);

      const monthsData = monthRange.map(month => {
        const reg = registrations.find(r => (r.planDocId ? r.planDocId === plan.id : r.planId.replace(/\//g, '-').trim().toUpperCase() === cleanPlanId) && r.month === month);
        const actual = invoices
          .filter(inv => inv.planDocId ? inv.planDocId === plan.id : inv.planId.replace(/\//g, '-').trim().toUpperCase() === cleanPlanId)
          .filter(inv => {
            if (!inv.date) return false;
            const invDate = new Date(inv.date);
            return invDate.getFullYear() === selectedYear && (invDate.getMonth() + 1) === month;
          })
          .reduce((sum, inv) => sum + (inv.giaTriTruocThue || 0), 0);
        
        return {
          month,
          planned: reg ? reg.amount : 0,
          actual: Number((actual / 1000000).toFixed(2))
        };
      });

      return {
        ...plan,
        totalPlanned: totalPlanned,
        accumulatedActual: Number((accumulatedActualRaw / 1000000).toFixed(2)),
        months: monthsData
      };
    });

    // Run rollup calculations for all fields (budget, totalPlanned, accumulatedActual, months)
    const rolledUpPlans = calculateRollupReportData(joinedPlans);


    let filteredPlans = rolledUpPlans;

    // Client-side filtering: chỉ hiển thị đúng phòng ban
    if (effectiveDept) {
      const normEffective = effectiveDept.toLowerCase().trim();
      filteredPlans = filteredPlans.filter(p => 
        (p.departmentName && p.departmentName.toLowerCase().trim() === normEffective) || 
        isSharedDept(p.departmentName)
      );
    }

    if (selectedAppendix !== 'all') {
      filteredPlans = filteredPlans.filter(p => p.appendix === selectedAppendix);
    }

    return sortPlansHierarchy(filteredPlans);
  };

  const handlePreview = async () => {
    setIsPreviewLoading(true);
    setIsPreviewVisible(false);
    try {
      const data = await aggregateData();
      setPreviewData(data);
      setIsPreviewVisible(true);
      toast.success("Đã tải dữ liệu xem trước.");
    } catch (error: any) {
      toast.error("Lỗi tải xem trước: " + error.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleExportClick = () => {
    setIsSignatureModalOpen(true);
  };

  const confirmExport = async () => {
    setIsSignatureModalOpen(false);
    try {
      const toastId = toast.loading(`Đang tổng hợp dữ liệu báo cáo...`);
      const data = await aggregateData();
      
      const filteredPlans = data.map(({ months, ...rest }) => ({
        ...rest,
        totalPlanned: rest.totalPlanned,
        accumulatedActual: rest.accumulatedActual
      }));
      const filteredForecasts = data.flatMap(p => p.months.map((m: any) => ({
        planId: p.planId,
        month: m.month,
        amount: m.planned
      })));
      const filteredInvoices = data.flatMap(p => p.months.map((m: any) => ({
        planId: p.planId,
        month: m.month,
        totalAmount: m.actual
      })));

      await exportReport(filteredPlans, filteredForecasts, filteredInvoices, selectedDept || "Tổng hợp");
      toast.success(`Đã xuất báo cáo thành công.`, { id: toastId });
    } catch (error: any) {
      toast.error("Lỗi xuất báo cáo: " + error.message);
    }
  };

  return (
    <div className="flex flex-col space-y-3 sm:space-y-4" style={{ height: 'calc(100vh - 100px)' }}>
      {/* Horizontal Toolbar */}
      <div className="bg-white p-2 sm:p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Năm</span>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-blue-600 focus:outline-none"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Tháng</span>
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none"
            >
              <option value="all">Cả năm</option>
              {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Phòng ban</span>
            <select 
              disabled={!isSuper}
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none min-w-[150px] disabled:opacity-60"
            >
              <option value="">Tất cả</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Phụ lục</span>
            <select 
              value={selectedAppendix}
              onChange={(e) => setSelectedAppendix(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none min-w-[120px]"
            >
              <option value="all">Tất cả</option>
              {masterAppendices.map(app => <option key={app.id} value={app.tenPhuLuc}>{app.tenPhuLuc}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handlePreview}
            disabled={isPreviewLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {isPreviewLoading ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />}
            Xem trước
          </button>
          <button 
            onClick={handleExportClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
          >
            <Download size={16} />
            Xuất Báo cáo
          </button>
        </div>
      </div>

      {/* Full-width Table Area */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
        {!isPreviewVisible ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-3 sm:space-y-4">
            <div className="p-4 sm:p-6 bg-slate-50 rounded-full">
              <FileSpreadsheet size={40} className="opacity-20 sm:hidden" />
              <FileSpreadsheet size={48} className="opacity-20 hidden sm:block" />
            </div>
            <p className="text-xs sm:text-sm italic font-medium text-center px-4">Nhấn "Xem trước" để hiển thị dữ liệu báo cáo</p>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <FileText size={14} className="text-blue-600" />
                BÁO CÁO: {selectedDept || "TỔNG HỢP"} 
                {selectedMonth !== 'all' ? ` - THÁNG ${selectedMonth}` : ' - CẢ NĂM'} 
                {selectedAppendix !== 'all' ? ` - ${selectedAppendix}` : ''}
                {` - NĂM ${selectedYear}`}
              </h3>
              <div className="flex items-center gap-4 text-[10px] text-slate-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span> KH: Kế hoạch (Tr.đ)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-900 rounded-full"></span> TH: Thực tế (Tr.đ)</span>
              </div>
            </div>
            <div className="flex-1 overflow-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <table className="w-full text-left border-collapse min-w-[1200px]">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-3 py-3 text-[10px] font-bold text-slate-500 uppercase sticky left-0 bg-slate-100 z-10 w-12 border-r border-slate-200">STT</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase sticky left-12 bg-slate-100 z-10 w-32 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Mã KH</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase min-w-[250px]">Nội dung chi phí</th>
                     <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Kinh phí theo KH (triệu đồng)</th>
                     <th className="px-4 py-3 text-[10px] font-bold text-blue-600 uppercase text-right border-l border-slate-200 bg-blue-50/30">Tổng Kế hoạch</th>
                     <th className="px-4 py-3 text-[10px] font-bold text-emerald-600 uppercase text-right border-l border-slate-200 bg-emerald-50/30">Quyết toán HĐ (triệu đồng)</th>
                    {previewData[0]?.months.map((m: any) => (
                      <th key={m.month} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center border-l border-slate-200">Tháng {m.month}</th>
                    ))}
                  </tr>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="sticky left-0 bg-slate-50 z-10 border-r border-slate-200"></th>
                    <th className="sticky left-12 bg-slate-50 z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]"></th>
                    <th></th>
                    <th></th>
                    <th className="border-l border-slate-200 bg-blue-50/30"></th>
                    <th className="border-l border-slate-200 bg-emerald-50/30"></th>
                    {previewData[0]?.months.map((m: any) => (
                      <th key={m.month} className="px-4 py-1 text-[8px] font-bold text-slate-400 uppercase text-center border-l border-slate-200">
                        <div className="flex justify-around">
                          <span>KH</span>
                          <span>TH</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.length === 0 ? (
                    <tr><td colSpan={20} className="px-6 py-12 text-center text-slate-400 italic">Không có dữ liệu cho tiêu chí đã chọn</td></tr>
                  ) : (
                    previewData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 text-[11px] text-slate-500 sticky left-0 bg-white z-10 border-r border-slate-100">{idx + 1}</td>
                        <td className="px-4 py-3 sticky left-12 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                          <p className="text-[10px] font-mono text-blue-600 font-bold">{row.planId}</p>
                        </td>
                        <td 
                          className="px-4 py-3 text-[11px] text-slate-700 font-medium"
                          style={{ paddingLeft: `${(row.depth || 0) * 16 + 16}px` }}
                        >
                          {(row.depth || 0) > 0 && <span className="text-slate-400 mr-1.5">{"—".repeat(row.depth)}</span>}
                          {row.description}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-slate-900 text-right">
                          {(row.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-blue-700 text-right border-l border-slate-100 bg-blue-50/10">
                          {(row.totalPlanned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-emerald-700 text-right border-l border-slate-100 bg-emerald-50/10">
                          {(row.accumulatedActual || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        {row.months.map((m: any, i: number) => (
                          <td key={i} className="px-2 py-3 border-l border-slate-100">
                            <div className="flex justify-around gap-2 text-[10px] font-medium">
                              <span className={cn(
                                m.actual > 0 ? "text-slate-400" : "text-red-500"
                              )}>
                                {(m.planned || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className="text-slate-900 font-bold">
                                {m.actual > 0 ? m.actual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Signature Modal */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Thông tin Chữ ký</h3>
              <button onClick={() => setIsSignatureModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Người lập biểu</label>
                <input 
                  value={signature.preparer}
                  onChange={(e) => setSignature({...signature, preparer: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên người lập..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Người duyệt</label>
                <input 
                  value={signature.approver}
                  onChange={(e) => setSignature({...signature, approver: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nhập tên người duyệt..."
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Chức danh người duyệt</label>
                <input 
                  value={signature.title}
                  onChange={(e) => setSignature({...signature, title: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Trưởng phòng, Giám đốc..."
                />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setIsSignatureModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmExport}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Xác nhận Xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
