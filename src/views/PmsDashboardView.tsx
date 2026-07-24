import React, { useState, useEffect } from 'react';
import { PmsService, ProjectData } from '../pms/T2_Services';
import { formatVND, formatCompactVND, formatDateVN, filterVisibleProjects } from '../pms/T1_Utils';
import { UserProfile } from '../pms/T2_Services';
import { PMS_CONFIG } from '../pms/T0_Config';
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Briefcase,
  CheckCircle2,
  FileSpreadsheet,
  ShieldAlert,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';

export default function PmsDashboardView({
  currentUser,
  onSelectProject
}: {
  currentUser?: UserProfile | null;
  onSelectProject: (projectId: string) => void;
}) {
  const [projects, setProjects] = useState<ProjectData[]>([]);

  useEffect(() => {
    const rawList = PmsService.getProjects();
    const visibleList = filterVisibleProjects(rawList, currentUser);
    setProjects(visibleList);
  }, [currentUser]);

  const totalProjects = projects.length;
  const totalInvestment = projects.reduce((acc, p) => acc + (Number(p.TONG_MUC_DAU_TU) || 0), 0);
  const totalDisbursed = projects.reduce((acc, p) => acc + (Number(p.LUY_KE_GIAI_NGAN) || 0), 0);
  const overallDisbursementRate = totalInvestment > 0 ? Math.round((totalDisbursed / totalInvestment) * 100) : 0;
  const redFlagProjects = projects.filter(p => p.CANH_BAO_RED_FLAG);

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-blue-500/30 text-blue-200 border border-blue-400/40 text-xs px-3 py-1 rounded-full font-semibold">
              Hệ thống Số hóa 100% Vòng đời Dự án
            </span>
            <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs px-3 py-1 rounded-full font-semibold">
              PMS 2026 Enterprise
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">EXECUTIVE BI DASHBOARD MANAGEMENT</h1>
          <p className="text-blue-200 text-sm mt-1">
            Báo cáo Quản trị Dự án Đầu tư Xây dựng theo Luật Xây dựng 135/2025/QH15 & các Nghị định 2026
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-xl text-center">
            <div className="text-xs text-blue-200 uppercase font-medium">Tỷ lệ Giải ngân Quốc gia</div>
            <div className="text-2xl font-extrabold text-emerald-400">{overallDisbursementRate}%</div>
          </div>
        </div>
      </div>

      {/* Red Flag Warning Alert Box */}
      {redFlagProjects.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3 text-red-900 shadow-sm animate-pulse">
          <ShieldAlert className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-base text-red-800">CẢNH BÁO ĐỎ (RED FLAG SYSTEM ALERT): Có {redFlagProjects.length} dự án có nguy cơ vượt hạn mức!</h4>
            <p className="text-xs text-red-700 mt-1">
              Hệ thống tự động phát hiện dự toán hoặc lũy kế chi phí vượt Tổng mức đầu tư đã được phê duyệt ở Giai đoạn 1.
            </p>
            <div className="mt-2 space-y-1">
              {redFlagProjects.map(p => (
                <div key={p.PROJECT_ID} className="text-xs font-semibold flex items-center justify-between bg-white/80 px-3 py-1.5 rounded-lg border border-red-200">
                  <span>{p.PROJECT_ID} - {p.TEN_DU_AN}</span>
                  <span className="text-red-700">{p.NOI_DUNG_CANH_BAO}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng số Dự án</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{totalProjects} Dự án</div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 font-semibold">100%</span> đã phân cấp theo TT 34/2026
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng Mức Đầu Tư</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{formatCompactVND(totalInvestment)}</div>
          <div className="text-xs text-slate-500 mt-1">Nguồn vốn Đầu tư công & Doanh nghiệp</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lũy Kế Giải Ngân</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{formatCompactVND(totalDisbursed)}</div>
          <div className="text-xs text-slate-500 mt-1">Đạt {overallDisbursementRate}% kế hoạch tổng thể</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cảnh Báo Bảo Trì</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">01 Chu Kỳ</div>
          <div className="text-xs text-slate-500 mt-1">Theo Thông tư 40/2026/TT-BXD</div>
        </div>
      </div>

      {/* S-CURVE PROGRESS & COST COMPARISON (Baseline vs Actual) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              ĐƯỜNG CONG S-CURVE: SO SÁNH TIẾN ĐỘ & CHI PHÍ (BASELINE VS ACTUAL)
            </h3>
            <p className="text-xs text-slate-500">Mô phỏng đường tích lũy chi phí kế hoạch (Baseline) và lũy kế giải ngân thực tế (Actual)</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-blue-600 rounded-full inline-block"></span>
              <span>Chi phí Kế hoạch (Baseline)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span>
              <span>Giải ngân Thực tế (Actual)</span>
            </div>
          </div>
        </div>

        {/* Visual S-Curve chart bar graph */}
        <div className="pt-4 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-700">
              <span>Tháng 1 (Khởi tạo)</span>
              <span>Tháng 3 (Đầu thầu)</span>
              <span>Tháng 6 (Thi công 30%)</span>
              <span>Tháng 9 (Thi công 60%)</span>
              <span>Tháng 12 (Hoàn thành)</span>
            </div>
            {/* Chart SVG Representation */}
            <div className="h-40 bg-slate-50 rounded-xl p-4 border border-slate-200 relative overflow-hidden flex items-end justify-between">
              {/* Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-20">
                <div className="border-b border-slate-400 w-full"></div>
                <div className="border-b border-slate-400 w-full"></div>
                <div className="border-b border-slate-400 w-full"></div>
              </div>

              {/* S-Curve bars baseline vs actual */}
              {[
                { label: 'T1', baseline: 10, actual: 10 },
                { label: 'T3', baseline: 25, actual: 22 },
                { label: 'T6', baseline: 55, actual: 48 },
                { label: 'T9', baseline: 80, actual: 75 },
                { label: 'T12', baseline: 100, actual: 92 },
              ].map((m, idx) => (
                <div key={idx} className="flex items-end gap-1.5 z-10">
                  <div
                    className="w-5 sm:w-8 bg-blue-600 rounded-t-md transition-all hover:bg-blue-700"
                    style={{ height: `${m.baseline * 1.2}px` }}
                    title={`Baseline: ${m.baseline}%`}
                  ></div>
                  <div
                    className="w-5 sm:w-8 bg-emerald-500 rounded-t-md transition-all hover:bg-emerald-600"
                    style={{ height: `${m.actual * 1.2}px` }}
                    title={`Actual: ${m.actual}%`}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Master Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              DANH SÁCH DỰ ÁN TRONG CƠ SỞ DỮ LIỆU MASTER
            </h3>
            <p className="text-xs text-slate-500">Số hóa toàn bộ các mốc tiến độ từ Giai đoạn 1 đến Giai đoạn 5</p>
          </div>
          <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200">
            Tổng số: {projects.length} dự án
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs uppercase bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Mã Dự Án</th>
                <th className="px-4 py-3 font-semibold">Tên Dự Án</th>
                <th className="px-4 py-3 font-semibold">Nhóm / Cấp</th>
                <th className="px-4 py-3 font-semibold text-right">TMĐT (VND)</th>
                <th className="px-4 py-3 font-semibold text-right">Giải Ngân (VND)</th>
                <th className="px-4 py-3 font-semibold text-center">Giai Đoạn</th>
                <th className="px-4 py-3 font-semibold text-center">Trạng Thái</th>
                <th className="px-4 py-3 font-semibold text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p) => (
                <tr key={p.PROJECT_ID} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-blue-700 font-mono">{p.PROJECT_ID}</td>
                  <td className="px-4 py-3.5 font-medium text-slate-900 max-w-xs truncate" title={p.TEN_DU_AN}>
                    {p.TEN_DU_AN}
                    <div className="text-xs text-slate-400 font-normal">Chủ đầu tư: {p.CHU_DAU_TU}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-block bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded font-semibold mr-1">
                      {p.NHOM_DU_AN}
                    </span>
                    <span className="inline-block bg-slate-100 text-slate-700 text-xs px-2 py-0.5 rounded font-medium">
                      {p.CAP_CONG_TRINH}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-slate-900 font-mono">
                    {formatVND(p.TONG_MUC_DAU_TU)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-emerald-700 font-mono">
                    {formatVND(p.LUY_KE_GIAI_NGAN)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs px-2.5 py-1 rounded-full font-bold">
                      Giai đoạn {p.GIAI_DOAN_HIEN_TAI}/5
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {p.CANH_BAO_RED_FLAG ? (
                      <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Cảnh báo
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                        {p.TRANG_THAI}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      onClick={() => onSelectProject(p.PROJECT_ID)}
                      className="inline-flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
