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
              <TrendingUp className="w-5 h-5 text-blue-600" />
              ĐƯỜNG CONG S-CURVE TIẾN ĐỘ THỜI GIAN THỰC [{selectedPackageId}]
            </h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-extrabold px-3 py-1 rounded-full">
              Kế hoạch vs Thực tế
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span className="text-slate-600">Tiến độ Kế hoạch Baseline (Planned): 65%</span>
                <span className="text-emerald-700">Tiến độ Thực tế Ghi nhận (Actual): 58%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden border border-slate-200 flex">
                <div className="bg-blue-500 h-full rounded-l-full" style={{ width: '65%' }}></div>
                <div className="bg-emerald-600 h-full rounded-r-full -ml-full opacity-80" style={{ width: '58%' }}></div>
              </div>
            </div>

            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
              <span className="font-semibold">Đánh giá chung: Chậm tiến độ 7% so với Baseline do thời tiết hố móng</span>
              <span className="font-bold font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Cảnh báo Vàng</span>
            </div>
          </div>
        </div>

        {/* RED FLAG ALERT LIST CARD */}
        <div className="bg-red-50/60 p-6 rounded-2xl border border-red-200 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-red-900 flex items-center gap-2 border-b border-red-200 pb-2">
            <Flame className="w-5 h-5 text-red-600 animate-bounce" />
            CẢNH BÁO ĐÈN ĐỎ (RED-FLAG)
          </h3>

          <div className="space-y-2">
            {redFlagTasks.map(rf => (
              <div key={rf.taskId} className="bg-white p-3 rounded-xl border border-red-200 shadow-xs space-y-1 text-xs">
                <div className="flex justify-between items-center font-bold text-red-900">
                  <span>[{rf.taskId}] {rf.taskName}</span>
                  <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded font-mono">Chậm {rf.delayDays} ngày</span>
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
          <Clock className="w-5 h-5 text-blue-600" />
          BẢNG TIẾN ĐỘ CHI TIẾT GÓI THẦU (BASELINE GANTT VS ACTUAL)
        </h3>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Mã CV</th>
                <th className="px-3 py-2.5">Tên Công Việc Kế Hoạch</th>
                <th className="px-3 py-2.5 font-mono">Ngày Bắt Đầu</th>
                <th className="px-3 py-2.5 font-mono">Ngày Hoàn Thành</th>
                <th className="px-3 py-2.5">Đơn Vị Phụ Trách</th>
                <th className="px-3 py-2.5 text-center">Trạng Thái Gantt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {scheduleTasks.map(task => (
                <tr key={task.taskId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono font-bold text-blue-700">{task.taskId}</td>
                  <td className="px-3 py-2 font-bold text-slate-900">{task.taskName}</td>
                  <td className="px-3 py-2 font-mono">{task.startDate}</td>
                  <td className="px-3 py-2 font-mono">{task.endDate}</td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{task.department}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                      ĐANG THI CÔNG
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
