import React from 'react';
import { ProjectData } from '../../pms/T2_Services';
import { Clock, AlertTriangle, CheckCircle, Flame, Calendar, TrendingUp } from 'lucide-react';

interface TabScheduleTrackerProps {
  project: ProjectData;
  selectedPackageId: string;
}

export default function TabScheduleTracker({ project, selectedPackageId }: TabScheduleTrackerProps) {
  const scheduleTasks = project.KE_HOACH_TIEN_DO_GDA2 || [
    { taskId: 'TSK-01', taskName: 'Khảo sát địa chất & Thẩm định móng dầm cầu', startDate: '2026-05-15', endDate: '2026-06-15', department: 'Phòng Kỹ Thuật', budgetAllocated: 15000000000 },
    { taskId: 'TSK-02', taskName: 'Đào hố móng & Đổ bê tông trụ cầu T1, T2', startDate: '2026-06-16', endDate: '2026-08-30', department: 'Ban Giám Sát', budgetAllocated: 120000000000 },
    { taskId: 'TSK-03', taskName: 'Lao dầm cầu & Đổ bê tông mặt cầu', startDate: '2026-09-01', endDate: '2027-04-30', department: 'Ban Giám Sát', budgetAllocated: 240000000000 }
  ];

  // Red Flag Alerts (Delayed tasks)
  const redFlagTasks = [
    { taskId: 'TSK-02', taskName: 'Đổ bê tông trụ cầu T2', baselineDate: '2026-07-15', actualDate: '2026-07-28', delayDays: 13, severity: 'CAO' as const, reason: 'Thời tiết mưa lớn làm ngập hố móng trụ T2' }
  ];

  return (
    <div className="space-y-6">
      {/* S-CURVE MINI BANNER & RED FLAG ALERTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Đường cong S-Curve tiến độ thời gian thực <span className="font-mono tabular-nums">[{selectedPackageId}]</span>
            </h3>
            <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-semibold px-3 py-1 rounded-full">
              Kế hoạch vs Thực tế
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1 tabular-nums">
                <span className="text-slate-600">Tiến độ kế hoạch Baseline (Planned): 65%</span>
                <span className="text-emerald-700">Tiến độ thực tế ghi nhận (Actual): 58%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200 flex">
                <div className="bg-indigo-500 h-full rounded-l-full" style={{ width: '65%' }}></div>
                <div className="bg-emerald-600 h-full rounded-r-full -ml-full opacity-80" style={{ width: '58%' }}></div>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 text-xs text-indigo-950 flex items-center justify-between">
              <span className="font-semibold tabular-nums">Đánh giá chung: Chậm tiến độ 7% so với Baseline do thời tiết hố móng</span>
              <span className="font-bold font-mono text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">Cảnh báo vàng</span>
            </div>
          </div>
        </div>

        {/* RED FLAG ALERT LIST CARD */}
        <div className="bg-red-50/60 p-6 rounded-2xl border border-red-200 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-red-900 flex items-center gap-2 border-b border-red-200 pb-2">
            <Flame className="w-5 h-5 text-red-600" />
            Cảnh báo đèn đỏ (Red-flag)
          </h3>

          <div className="space-y-2">
            {redFlagTasks.map(rf => (
              <div key={rf.taskId} className="bg-white p-3 rounded-xl border border-red-200 shadow-2xs space-y-1 text-xs">
                <div className="flex justify-between items-center font-bold text-red-900">
                  <span className="tabular-nums">[{rf.taskId}] {rf.taskName}</span>
                  <span className="bg-red-100 text-red-800 text-[11px] px-2 py-0.5 rounded font-mono tabular-nums">Chậm {rf.delayDays} ngày</span>
                </div>
                <p className="text-slate-600 text-[11px]">{rf.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GANTT CHART COMPARISON TABLE */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock className="w-5 h-5 text-indigo-600" />
          Bảng tiến độ chi tiết gói thầu (Baseline Gantt vs Actual)
        </h3>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Mã CV</th>
                <th className="px-3 py-2.5">Tên công việc kế hoạch</th>
                <th className="px-3 py-2.5">Ngày bắt đầu</th>
                <th className="px-3 py-2.5">Ngày hoàn thành</th>
                <th className="px-3 py-2.5">Đơn vị phụ trách</th>
                <th className="px-3 py-2.5 text-center">Trạng thái Gantt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {scheduleTasks.map(task => (
                <tr key={task.taskId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono tabular-nums font-bold text-indigo-700">{task.taskId}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{task.taskName}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{task.startDate}</td>
                  <td className="px-3 py-2 font-mono tabular-nums">{task.endDate}</td>
                  <td className="px-3 py-2 font-medium text-slate-700">{task.department}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full text-[11px]">
                      Đang thi công
                    </span>
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
