import React, { useState, useMemo } from 'react';
import { ProjectData } from '../../pms/T2_Services';
import { PmsHandlers } from '../../pms/T3_Handlers';
import { formatVND, safeNumber, validatePackageDisbursement, filterPaymentsByPackage } from '../../pms/T1_Utils';
import {
  DollarSign,
  ShieldAlert,
  CheckCircle2,
  FileText,
  AlertCircle,
  PlusCircle,
  Pin,
  Eye,
  Layers,
  Building2,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';

interface TabPaymentEngineProps {
  project: ProjectData;
  selectedProjectId?: string;
  selectedPackageId: string;
  onRefreshData: () => void;
  onSelectPackage?: (packageId: string) => void;
}

export default function TabPaymentEngine({
  project,
  selectedProjectId,
  selectedPackageId,
  onRefreshData,
  onSelectPackage
}: TabPaymentEngineProps) {
  const [disbursementReqAmount, setDisbursementReqAmount] = useState<number>(5000000000);
  const [paymentDocType, setPaymentDocType] = useState<'MAU_01A' | 'MAU_03B'>('MAU_03B');
  const [paymentNote, setPaymentNote] = useState<string>('Thanh toán khối lượng hoàn thành đợt tiếp theo');

  const isAllPackages = useMemo(() => {
    return !selectedPackageId || selectedPackageId === 'ALL' || selectedPackageId === 'ALL_PACKAGES';
  }, [selectedPackageId]);

  // Packages list of current project
  const pkgList = useMemo(() => {
    return project.KHLCNT_ITEMS_GDA3 || [
      {
        packageId: 'GT-TV-01',
        packageName: 'Gói thầu TV-01: Tư vấn Khảo sát địa chất & Thiết kế BVTC',
        packagePrice: 15000000000,
        winningContractor: 'Tổng Công ty Tư vấn Thiết kế TEDI',
        winningPrice: 14500000000,
        status: 'ĐÃ_KÝ_HỢP_ĐỒNG'
      },
      {
        packageId: 'GT-XL-01',
        packageName: 'Gói thầu XL-01: Thi công Xây lắp Cầu & Đường dẫn',
        packagePrice: 880000000000,
        winningContractor: 'Tập đoàn Xây dựng Đèo Cả - Vinaconex',
        winningPrice: 850000000000,
        status: 'ĐÃ_KÝ_HỢP_ĐỒNG'
      },
      {
        packageId: 'GT-TB-01',
        packageName: 'Gói thầu TB-01: Cung cấp & Lắp đặt Thiết bị cẩu dầm',
        packagePrice: 30000000000,
        winningContractor: 'Công ty Cổ phần Thiết bị Xây dựng FECON',
        winningPrice: 29000000000,
        status: 'ĐÃ_KÝ_HỢP_ĐỒNG'
      }
    ];
  }, [project]);

  // Current single package details
  const selectedPackage = useMemo(() => {
    return pkgList.find(p => p.packageId === selectedPackageId) || pkgList[0];
  }, [pkgList, selectedPackageId]);

  const selectedPackageName = useMemo(() => {
    if (isAllPackages) return 'TẤT CẢ GÓI THẦU DỰ ÁN';
    return selectedPackage?.packageName || selectedPackageId;
  }, [isAllPackages, selectedPackage, selectedPackageId]);

  // Single Package Disbursement calculations
  const currentDisbursement = useMemo(() => {
    const disb = project.PACKAGE_DISBURSEMENTS_GDA4?.find(d => d.packageId === selectedPackageId);
    const contractValue = disb ? disb.contractValue : (selectedPackage ? (selectedPackage.winningPrice || selectedPackage.packagePrice) : 850000000000);
    const advanceAmount = disb ? disb.advanceAmount : (contractValue * 0.2);
    const cumulativePaid = disb ? disb.cumulativePaid : (contractValue * 0.52);
    const remainingLimit = Math.max(0, contractValue - cumulativePaid);

    return {
      packageId: selectedPackageId,
      contractValue,
      advanceAmount,
      cumulativePaid,
      remainingLimit,
      isHardBlocked: disb ? disb.isHardBlocked : false
    };
  }, [project, selectedPackageId, selectedPackage]);

  // Hard Block validation for single package
  const hardBlockCheck = useMemo(() => {
    return validatePackageDisbursement(
      selectedPackageId,
      currentDisbursement.contractValue,
      currentDisbursement.cumulativePaid,
      disbursementReqAmount
    );
  }, [selectedPackageId, currentDisbursement, disbursementReqAmount]);

  const paidPct = useMemo(() => {
    if (!currentDisbursement.contractValue) return 0;
    return Math.min(100, Number(((currentDisbursement.cumulativePaid / currentDisbursement.contractValue) * 100).toFixed(1)));
  }, [currentDisbursement]);

  // Filtered payments list
  const defaultPayments = [
    { PAYMENT_ID: 'PAY-01', PROJECT_ID: project.PROJECT_ID, packageId: 'GT-XL-01', CONTRACT_ID: 'HD-XL-01', DOT_THANH_TOAN: 1, GIA_TRI_DE_NGHI: 170000000000, KHOI_LUONG_LUY_KE_TRINH: 170000000000, NGAY_DE_NGHI: '2026-05-20', TRANG_THAI: 'ĐÃ_GIẢI_NGÂN' as const, SMART_CA_SIGNATURE: 'SmartCA Valid [ID: 991823]' },
    { PAYMENT_ID: 'PAY-02', PROJECT_ID: project.PROJECT_ID, packageId: 'GT-XL-01', CONTRACT_ID: 'HD-XL-01', DOT_THANH_TOAN: 2, GIA_TRI_DE_NGHI: 271300000000, KHOI_LUONG_LUY_KE_TRINH: 441300000000, NGAY_DE_NGHI: '2026-06-15', TRANG_THAI: 'ĐÃ_GIẢI_NGÂN' as const, SMART_CA_SIGNATURE: 'SmartCA Valid [ID: 882103]' },
    { PAYMENT_ID: 'PAY-03', PROJECT_ID: project.PROJECT_ID, packageId: 'GT-TV-01', CONTRACT_ID: 'HD-TV-01', DOT_THANH_TOAN: 1, GIA_TRI_DE_NGHI: 4350000000, KHOI_LUONG_LUY_KE_TRINH: 4350000000, NGAY_DE_NGHI: '2026-03-01', TRANG_THAI: 'ĐÃ_GIẢI_NGÂN' as const, SMART_CA_SIGNATURE: 'SmartCA Valid [ID: 771201]' }
  ];

  const filteredPayments = useMemo(() => {
    const rawList = (project.DE_NGHI_THANH_TOAN && project.DE_NGHI_THANH_TOAN.length > 0) ? project.DE_NGHI_THANH_TOAN : defaultPayments;
    return filterPaymentsByPackage(rawList, project.PROJECT_ID, selectedPackageId);
  }, [project, selectedPackageId]);

  // All Packages Summary calculation (for State B)
  const summaryPackages = useMemo(() => {
    return pkgList.map(pkg => {
      const disb = project.PACKAGE_DISBURSEMENTS_GDA4?.find(d => d.packageId === pkg.packageId);
      const cVal = disb ? disb.contractValue : (pkg.winningPrice || pkg.packagePrice || 14500000000);
      const adv = disb ? disb.advanceAmount : (cVal * 0.2);
      const paid = disb ? disb.cumulativePaid : (cVal * 0.5);
      const rem = Math.max(0, cVal - paid);
      const pct = cVal > 0 ? Number(((paid / cVal) * 100).toFixed(1)) : 0;

      return {
        packageId: pkg.packageId,
        packageName: pkg.packageName,
        contractor: pkg.winningContractor || 'Đơn vị thực hiện',
        contractValue: cVal,
        advanceAmount: adv,
        cumulativePaid: paid,
        remainingLimit: rem,
        disbursementPct: pct
      };
    });
  }, [pkgList, project]);

  const totalProjectSummary = useMemo(() => {
    const totalCVal = summaryPackages.reduce((acc, p) => acc + p.contractValue, 0);
    const totalAdv = summaryPackages.reduce((acc, p) => acc + p.advanceAmount, 0);
    const totalPaid = summaryPackages.reduce((acc, p) => acc + p.cumulativePaid, 0);
    const totalRem = summaryPackages.reduce((acc, p) => acc + p.remainingLimit, 0);
    const totalPct = totalCVal > 0 ? Number(((totalPaid / totalCVal) * 100).toFixed(1)) : 0;

    return {
      totalContractValue: totalCVal,
      totalAdvance: totalAdv,
      totalPaid,
      totalRemaining: totalRem,
      disbursementPct: totalPct
    };
  }, [summaryPackages]);

  const handleRequestDisbursement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hardBlockCheck.allowed) {
      toast.error(hardBlockCheck.message);
      return;
    }

    const targetPkgId = isAllPackages ? 'GT-XL-01' : selectedPackageId;
    const res = PmsHandlers.stage4PackageDisbursementApi(project.PROJECT_ID, targetPkgId, disbursementReqAmount);

    if (res.success) {
      toast.success(res.message);
      onRefreshData();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 📌 CONTEXT BADGE AT TOP OF TAB */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 text-xs">
          <Pin className="w-4 h-4 text-blue-600 shrink-0 animate-bounce" />
          <span className="text-slate-700 font-semibold">
            📌 Đang quản lý thanh toán cho: <strong className="text-slate-900 font-extrabold">Dự án [{project.PROJECT_ID}] {project.TEN_DU_AN}</strong> ➔ <strong className="text-blue-700 font-extrabold">{selectedPackageName}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${currentDisbursement.isHardBlocked ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
            {currentDisbursement.isHardBlocked ? 'HARD-BLOCKED' : 'BÌNH THƯỜNG'}
          </span>
        </div>
      </div>

      {/* STATE A: SINGLE PACKAGE SELECTED */}
      {!isAllPackages && (
        <>
          {/* FINANCIAL MINI DASHBOARD FOR SINGLE PACKAGE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                BẢNG THEO DÕI TẠM ỨNG & GIẢI NGÂN GÓI THẦU [{selectedPackageId}]
              </h3>
              <span className="text-xs text-slate-500 font-mono">Căn cứ NĐ 206/2026 & TT 38/2026</span>
            </div>

            {/* Progress Bar Visualizing Disbursement */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Tiến độ giải ngân thực tế Gói {selectedPackageId}</span>
                <span className="font-mono text-emerald-700">{paidPct}% ({formatVND(currentDisbursement.cumulativePaid)} / {formatVND(currentDisbursement.contractValue)})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200 flex">
                <div className="bg-emerald-600 h-full transition-all duration-500 rounded-full" style={{ width: `${paidPct}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-medium pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-bold">Giá Trị Hợp Đồng Gói</div>
                <div className="font-mono text-base font-extrabold text-blue-900">{formatVND(currentDisbursement.contractValue)}</div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-bold">Lũy Kế Tạm Ứng</div>
                <div className="font-mono text-base font-extrabold text-purple-700">{formatVND(currentDisbursement.advanceAmount)}</div>
              </div>
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <div className="text-emerald-800 font-bold">Lũy Kế Thanh Toán KLHT</div>
                <div className="font-mono text-base font-extrabold text-emerald-700">{formatVND(currentDisbursement.cumulativePaid)}</div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-bold">Giá Trị Còn Lại (Hạn Mức)</div>
                <div className="font-mono text-base font-extrabold text-slate-900">{formatVND(currentDisbursement.remainingLimit)}</div>
              </div>
            </div>
          </div>

          {/* HARD BLOCK GUARDRAIL ALERT & FORM */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <FileText className="w-5 h-5 text-blue-600" />
              TẠO HỒ SƠ ĐỀ NGHỊ THANH TOÁN KHO BẠC MỚI (MẪU 01A / 03B) - GÓI [{selectedPackageId}]
            </h3>

            {!hardBlockCheck.allowed && (
              <div className="bg-red-50 border-2 border-red-200 p-4 rounded-xl text-red-900 text-xs font-bold flex items-center gap-3 animate-pulse">
                <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                <div>
                  <div className="text-sm font-extrabold text-red-800">🚫 HARD BLOCK GÓI THẦU [{selectedPackageId}]: ĐỀ NGHỊ GIẢI NGÂN VƯỢT HẠN MỨC!</div>
                  <div>{hardBlockCheck.message}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleRequestDisbursement} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mẫu Hồ Sơ Gửi Kho Bạc</label>
                  <select
                    value={paymentDocType}
                    onChange={e => setPaymentDocType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold"
                  >
                    <option value="MAU_03B">Mẫu 03b - Khối lượng hoàn thành thanh toán</option>
                    <option value="MAU_01A">Mẫu 01a - Bảng xác định giá trị khối lượng công việc</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số Tiền Đề Nghị Giải Ngân (VND)</label>
                  <input
                    type="number"
                    value={disbursementReqAmount}
                    onChange={e => setDisbursementReqAmount(Number(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono font-extrabold text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi Chú Đợt Thanh Toán</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={e => setPaymentNote(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!hardBlockCheck.allowed}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4" /> Ký Số SmartCA & Gửi Kho Bạc Nhà Nước
                </button>
              </div>
            </form>
          </div>

          {/* PAYMENT HISTORY TABLE FOR SINGLE PACKAGE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex justify-between items-center">
              <span>LỊCH SỬ HỒ SƠ GIẢI NGÂN ĐÃ THỰC HIỆN - GÓI [{selectedPackageId}]</span>
              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">
                {filteredPayments.length} Đợt thanh toán
              </span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3">Mã Hồ Sơ</th>
                    <th className="px-3.5 py-3 font-mono">Đợt Thanh Toán</th>
                    <th className="px-3.5 py-3 font-mono text-right">Giá Trị Đề Nghị (VND)</th>
                    <th className="px-3.5 py-3 font-mono text-right">Lũy Kế Đã Trình (VND)</th>
                    <th className="px-3.5 py-3 font-mono">Ngày Trình</th>
                    <th className="px-3.5 py-3 text-center">Xác Thực SmartCA</th>
                    <th className="px-3.5 py-3 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium bg-white">
                  {filteredPayments.map(pay => (
                    <tr key={pay.PAYMENT_ID} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-3 font-mono font-bold text-blue-700">{pay.PAYMENT_ID}</td>
                      <td className="px-3.5 py-3 font-bold text-center font-mono">Đợt {pay.DOT_THANH_TOAN}</td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">{formatVND(pay.GIA_TRI_DE_NGHI)}</td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">{formatVND(pay.KHOI_LUONG_LUY_KE_TRINH)}</td>
                      <td className="px-3.5 py-3 font-mono">{pay.NGAY_DE_NGHI}</td>
                      <td className="px-3.5 py-3 text-center font-mono text-[10px] text-blue-700 bg-blue-50 font-bold rounded">
                        {pay.SMART_CA_SIGNATURE || 'SmartCA Signed'}
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[10px]">
                          {pay.TRANG_THAI}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">
                        Chưa có lịch sử giải ngân nào cho Gói thầu {selectedPackageId}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* STATE B: ALL PACKAGES SELECTED ([TẤT CẢ GÓI THẦU]) */}
      {isAllPackages && (
        <>
          {/* TOTAL DISBURSEMENT DASHBOARD FOR ALL PACKAGES */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                TỔNG HỢP GIẢI NGÂN TOÀN BỘ CÁC GÓI THẦU - DỰ ÁN [{project.PROJECT_ID}]
              </h3>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded-full border border-blue-200">
                {summaryPackages.length} Gói thầu
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-600">Tỷ lệ giải ngân tổng hợp toàn bộ gói thầu</span>
                <span className="font-mono text-emerald-700">{totalProjectSummary.disbursementPct}% ({formatVND(totalProjectSummary.totalPaid)} / {formatVND(totalProjectSummary.totalContractValue)})</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden border border-slate-200 flex">
                <div className="bg-emerald-600 h-full transition-all duration-500 rounded-full" style={{ width: `${totalProjectSummary.disbursementPct}%` }}></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-medium pt-2">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-bold">Tổng Giá Trị HĐ Các Gói</div>
                <div className="font-mono text-base font-extrabold text-blue-900">{formatVND(totalProjectSummary.totalContractValue)}</div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-bold">Tổng Lũy Kế Tạm Ứng</div>
                <div className="font-mono text-base font-extrabold text-purple-700">{formatVND(totalProjectSummary.totalAdvance)}</div>
              </div>
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                <div className="text-emerald-800 font-bold">Tổng Lũy Kế Giải Ngân</div>
                <div className="font-mono text-base font-extrabold text-emerald-700">{formatVND(totalProjectSummary.totalPaid)}</div>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-500 font-bold">Tổng Hạn Mức Còn Lại</div>
                <div className="font-mono text-base font-extrabold text-slate-900">{formatVND(totalProjectSummary.totalRemaining)}</div>
              </div>
            </div>
          </div>

          {/* ALL PACKAGES SUMMARY TABLE */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex justify-between items-center">
              <span className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" /> BẢNG TỔNG HỢP THANH TOÁN CÁC GÓI THẦU THUỘC DỰ ÁN
              </span>
            </h3>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-3 min-w-[100px]">Mã Gói</th>
                    <th className="px-3.5 py-3 min-w-[260px]">Tên Gói Thầu & Nhà Thầu</th>
                    <th className="px-3.5 py-3 text-right min-w-[140px]">Giá Trị HĐ (VND)</th>
                    <th className="px-3.5 py-3 text-right min-w-[130px]">Lũy Kế Tạm Ứng</th>
                    <th className="px-3.5 py-3 text-right min-w-[140px]">Lũy Kế Thanh Toán</th>
                    <th className="px-3.5 py-3 text-right min-w-[130px]">Giá Trị Còn Lại</th>
                    <th className="px-3.5 py-3 text-center min-w-[110px]">Giải Ngân (%)</th>
                    <th className="px-3.5 py-3 text-center min-w-[110px]">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium bg-white">
                  {summaryPackages.map(pkg => (
                    <tr key={pkg.packageId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-3 font-mono font-bold text-blue-900">{pkg.packageId}</td>
                      <td className="px-3.5 py-3">
                        <div className="font-bold text-slate-900">{pkg.packageName}</div>
                        <div className="text-[11px] text-slate-500">Nhà thầu: {pkg.contractor}</div>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-slate-900">{formatVND(pkg.contractValue)}</td>
                      <td className="px-3.5 py-3 text-right font-mono text-purple-700">{formatVND(pkg.advanceAmount)}</td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-emerald-700">{formatVND(pkg.cumulativePaid)}</td>
                      <td className="px-3.5 py-3 text-right font-mono text-slate-700">{formatVND(pkg.remainingLimit)}</td>
                      <td className="px-3.5 py-3 text-center">
                        <span className="bg-emerald-100 text-emerald-900 font-mono font-extrabold px-2.5 py-1 rounded-full text-[11px]">
                          {pkg.disbursementPct}%
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-center">
                        {onSelectPackage && (
                          <button
                            onClick={() => onSelectPackage(pkg.packageId)}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-xs font-semibold shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 inline mr-1" /> Chi Tiết
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
