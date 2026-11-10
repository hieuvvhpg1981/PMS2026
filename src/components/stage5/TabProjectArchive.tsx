import React, { useState } from 'react';
import { ProjectData, MaintenanceScheduleItem } from '../../pms/T2_Services';
import { formatDateVN, generateZipArchiveStructure, formatStatusOrCodeVN, formatCurrencyInputMask, parseCurrencyInputMask } from '../../pms/T1_Utils';
import {
  Archive,
  Download,
  Lock,
  ShieldCheck,
  CalendarCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Check,
  FolderTree
} from 'lucide-react';
import { toast } from 'sonner';

interface TabProjectArchiveProps {
  currentProject: ProjectData;
  onUpdateProject: (updated: ProjectData) => void;
}

export default function TabProjectArchive({
  currentProject,
  onUpdateProject
}: TabProjectArchiveProps) {
  const maintenanceList: MaintenanceScheduleItem[] = currentProject.LIC_BAO_TRI || [
    {
      SCHEDULE_ID: 'SCH-01',
      PROJECT_ID: currentProject.PROJECT_ID,
      HANG_MUC_BAO_TRI: 'Bảo trì kết cấu mặt đường & hệ thống thoát nước dọc (Circular 40/2026/TT-BXD)',
      CHU_KY_THANG: 6,
      NGAY_BAO_TRI_NEXT: '2026-09-15',
      DON_VI_THUC_HIEN: 'Công ty Cổ phần Quản lý & Sửa chữa Đường bộ I',
      TRANG_THAI: 'BÌNH_THƯỜNG'
    },
    {
      SCHEDULE_ID: 'SCH-02',
      PROJECT_ID: currentProject.PROJECT_ID,
      HANG_MUC_BAO_TRI: 'Kiểm định định kỳ dầm cầu, gối cầu & khe co giãn theo quy chuẩn BXD',
      CHU_KY_THANG: 12,
      NGAY_BAO_TRI_NEXT: '2026-08-01',
      DON_VI_THUC_HIEN: 'Viện Khoa học & Công nghệ Giao thông Vận tải (ITST)',
      TRANG_THAI: 'ĐẾN_HẠN'
    },
    {
      SCHEDULE_ID: 'SCH-03',
      PROJECT_ID: currentProject.PROJECT_ID,
      HANG_MUC_BAO_TRI: 'Bảo dưỡng hệ thống chiếu sáng, biển báo & an toàn giao thông đô thị',
      CHU_KY_THANG: 3,
      NGAY_BAO_TRI_NEXT: '2026-10-30',
      DON_VI_THUC_HIEN: 'Công ty Cổ phần Chiếu sáng & Thiết bị Đô thị',
      TRANG_THAI: 'BÌNH_THƯỜNG'
    }
  ];

  const zipInfo = generateZipArchiveStructure(currentProject.PROJECT_ID);

  const [showZipModal, setShowZipModal] = useState(false);
  const [showAddMaintenanceModal, setShowAddMaintenanceModal] = useState(false);
  const [newHangMuc, setNewHangMuc] = useState('');
  const [newChuKy, setNewChuKy] = useState<number>(6);
  const [newDonVi, setNewDonVi] = useState('Công ty Cổ phần Quản lý Đường bộ');
  const [newNgay, setNewNgay] = useState('2026-12-01');
  const [newCostVnd, setNewCostVnd] = useState<number>(450000000);
  const [stateNoticeNo, setStateNoticeNo] = useState<string>(
    currentProject.STATE_ACCEPTANCE_NOTICE_NO || 'TB-388/GĐ-BXD (Cục Giám định Nhà nước về CLCTXD)'
  );

  const handleDownloadZip = () => {
    toast.success(`Đã bắt đầu nén và tải xuống tệp lưu trữ số hóa: ${zipInfo.archiveName} (${zipInfo.totalSizeMB} MB)`);
    setShowZipModal(false);
  };

  const handleSaveStateAcceptanceNotice = () => {
    if (!stateNoticeNo.trim()) {
      toast.error('Vui lòng nhập Số Văn bản thông báo chấp thuận kết quả nghiệm thu của Cơ quan chuyên môn về XD (NĐ 207/2026)!');
      return;
    }
    onUpdateProject({
      ...currentProject,
      STATE_ACCEPTANCE_NOTICE_NO: stateNoticeNo.trim(),
      LIC_BAO_TRI: maintenanceList
    });
    toast.success(`Đã lưu Văn bản chấp thuận nghiệm thu [${stateNoticeNo}] theo NĐ 207/2026/NĐ-CP!`);
  };

  const handleLockTreasury = () => {
    if (!stateNoticeNo.trim()) {
      toast.error('CHỐT CHẶN NĐ 207/2026: Chưa có Văn bản thông báo chấp thuận kết quả nghiệm thu của Cơ quan chuyên môn về XD! Không thể tất toán & đưa công trình vào khai thác.');
      return;
    }
    const updated: ProjectData = {
      ...currentProject,
      STATE_ACCEPTANCE_NOTICE_NO: stateNoticeNo.trim(),
      TRANG_THAI: 'QUYẾT_TOÁN_HOÀN_TẤT',
      GIAI_DOAN_HIEN_TAI: 5,
      KHOI_LUONG_HOAN_THANH_PCT: 100
    };
    onUpdateProject(updated);
    toast.success(`Đã tất toán Kho bạc Nhà nước & Khóa mã dự án ${currentProject.PROJECT_ID} vĩnh viễn trên CSDL Quốc gia!`);
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHangMuc) {
      toast.error('Vui lòng nhập Tên Hạng Mục Bảo Trì');
      return;
    }

    const newItem: MaintenanceScheduleItem = {
      SCHEDULE_ID: `SCH-${Date.now()}`,
      PROJECT_ID: currentProject.PROJECT_ID,
      HANG_MUC_BAO_TRI: newHangMuc,
      CHU_KY_THANG: newChuKy,
      NGAY_BAO_TRI_NEXT: newNgay,
      DON_VI_THUC_HIEN: newDonVi,
      TRANG_THAI: 'BÌNH_THƯỜNG',
      ESTIMATED_MAINTENANCE_COST_VND: newCostVnd,
      MAINTENANCE_PROCEDURE_DOC: 'QT-BT-2026/TT40-BXD'
    };

    const updatedList = [newItem, ...maintenanceList];
    onUpdateProject({
      ...currentProject,
      LIC_BAO_TRI: updatedList,
      STATE_ACCEPTANCE_NOTICE_NO: stateNoticeNo
    });

    toast.success('Đã thêm hạng mục bảo trì định kỳ theo NĐ 207/2026 & TT 40/2026/TT-BXD');
    setShowAddMaintenanceModal(false);
    setNewHangMuc('');
  };

  const handleDeleteMaintenance = (id: string) => {
    const updatedList = maintenanceList.filter(item => item.SCHEDULE_ID !== id);
    onUpdateProject({
      ...currentProject,
      LIC_BAO_TRI: updatedList
    });
    toast.success('Đã xóa hạng mục bảo trì');
  };

  const handleCompleteMaintenance = (id: string) => {
    const updatedList = maintenanceList.map(item => {
      if (item.SCHEDULE_ID === id) {
        return {
          ...item,
          TRANG_THAI: 'BÌNH_THƯỜNG' as const,
          NGAY_BAO_TRI_NEXT: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0]
        };
      }
      return item;
    });
    onUpdateProject({
      ...currentProject,
      LIC_BAO_TRI: updatedList
    });
    toast.success('Đã cập nhật hoàn thành đợt bảo trì và tự động tính chu kỳ đợt tới!');
  };

  return (
    <div className="space-y-6">
      {/* NĐ 207/2026 Gate: Văn bản chấp thuận kết quả nghiệm thu của Cơ quan chuyên môn về XD */}
      <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Chốt chặn nghiệm thu đưa công trình vào khai thác sử dụng (Điều 24 NĐ 207/2026/NĐ-CP)
          </div>
          <p className="text-xs text-emerald-800">
            Số Văn bản thông báo chấp thuận kết quả nghiệm thu của Hội đồng Kiểm tra Nhà nước / Cục Giám định / Sở Xây dựng:
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={stateNoticeNo}
            onChange={e => setStateNoticeNo(e.target.value)}
            placeholder="Nhập số VB chấp thuận nghiệm thu..."
            className="flex-1 md:w-80 px-3 py-2 text-xs font-mono tabular-nums font-bold bg-white border border-emerald-300 rounded-xl text-emerald-900"
          />
          <button
            type="button"
            onClick={handleSaveStateAcceptanceNotice}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shrink-0"
          >
            Xác nhận VB nghiệm thu
          </button>
        </div>
      </div>

      {/* Top 2 Cards: ZIP Archiver & Treasury Lock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Digital Handover ZIP Archive Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Archive className="w-5 h-5 text-indigo-600" />
              Đóng gói bàn giao số (Digital Handover Archiver)
            </h3>
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono tabular-nums font-bold px-2.5 py-0.5 rounded-full">
              48.6 MB (.ZIP)
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Nạp toàn bộ văn bản pháp lý, bản vẽ hoàn công (DWG/PDF), Hợp đồng QĐ 1040 và Nhật ký E-Logbook từ GĐ 1 đến GĐ 5 thành 1 tệp mã hóa phục vụ Kiểm toán Nhà nước.
          </p>

          <button
            onClick={() => setShowZipModal(true)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Xem cấu trúc & tải đóng gói lưu trữ (.ZIP)
          </button>
        </div>

        {/* Treasury Settlement & Lock Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600" />
              Tất toán Kho bạc & khóa mã dự án CSDL quốc gia
            </h3>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
              SmartCA Safe
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Xác nhận dự án đã hoàn thành 100% quyết toán vốn và bảo hành. Đánh dấu tất toán mã dự án trên hệ thống Kho bạc Nhà nước & CSDL Bộ Xây dựng.
          </p>

          <button
            onClick={handleLockTreasury}
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Tất toán Kho bạc & khóa mã dự án
          </button>
        </div>
      </div>

      {/* Maintenance Schedule Table (NĐ 207/2026/NĐ-CP & Circular 40/2026/TT-BXD) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
              Quy trình & kế hoạch bảo trì công trình định kỳ (NĐ 207/2026/NĐ-CP & TT 40/2026/TT-BXD)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động cảnh báo đếm ngược thời gian hết hạn bảo hành, kinh phí bảo trì dự kiến & đợt kiểm định kỹ thuật định kỳ
            </p>
          </div>

          <button
            onClick={() => setShowAddMaintenanceModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Thêm hạng mục bảo trì
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="p-3.5 min-w-[260px]">Hạng mục bảo trì / Kiểm định</th>
                <th className="p-3.5 min-w-[110px]">Chu kỳ (tháng)</th>
                <th className="p-3.5 min-w-[130px]">Đợt kiểm tra tới</th>
                <th className="p-3.5 min-w-[140px] text-right">Kinh phí dự kiến</th>
                <th className="p-3.5 min-w-[200px]">Đơn vị thực hiện</th>
                <th className="p-3.5 min-w-[120px]">Trạng thái</th>
                <th className="p-3.5 text-center min-w-[130px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {maintenanceList.map(item => (
                <tr key={item.SCHEDULE_ID} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">{item.HANG_MUC_BAO_TRI}</td>
                  <td className="p-3.5 font-mono tabular-nums text-slate-700 font-bold">{item.CHU_KY_THANG} tháng/lần</td>
                  <td className="p-3.5 font-mono tabular-nums text-amber-700 font-bold">{formatDateVN(item.NGAY_BAO_TRI_NEXT)}</td>
                  <td className="p-3.5 font-mono tabular-nums font-bold text-right text-indigo-800">
                    {(item.ESTIMATED_MAINTENANCE_COST_VND || 450000000).toLocaleString('vi-VN')} đ
                  </td>
                  <td className="p-3.5 text-slate-600 font-medium">{item.DON_VI_THUC_HIEN}</td>
                  <td className="p-3.5">
                    {item.TRANG_THAI === 'ĐẾN_HẠN' || item.TRANG_THAI === 'QUÁ_HẠN' ? (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-red-200 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> {formatStatusOrCodeVN(item.TRANG_THAI)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {formatStatusOrCodeVN(item.TRANG_THAI)}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleCompleteMaintenance(item.SCHEDULE_ID)}
                        className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-600 hover:text-white transition-all text-xs font-semibold"
                        title="Xác nhận hoàn thành đợt này"
                      >
                        <Check className="w-3.5 h-3.5 inline mr-1" /> Duyệt
                      </button>
                      <button
                        onClick={() => handleDeleteMaintenance(item.SCHEDULE_ID)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {maintenanceList.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Chưa có hạng mục bảo trì công trình nào. Bấm nút "Thêm hạng mục bảo trì" ở trên.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ZIP Modal */}
      {showZipModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-600" />
                Cây thư mục lưu trữ số hóa toàn bộ dự án (.ZIP)
              </h4>
              <button onClick={() => setShowZipModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <div className="bg-slate-900 text-emerald-400 font-mono p-4 rounded-xl space-y-1 text-xs overflow-x-auto">
              {zipInfo.folderTree.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowZipModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl"
              >
                Đóng
              </button>
              <button
                onClick={handleDownloadZip}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Tải xuống tệp Archive (.ZIP)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Maintenance Modal */}
      {showAddMaintenanceModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-indigo-600" />
                Thêm mới hạng mục bảo trì công trình định kỳ
              </h4>
              <button onClick={() => setShowAddMaintenanceModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleAddMaintenance} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên hạng mục bảo trì / kiểm định *</label>
                <input
                  type="text"
                  value={newHangMuc}
                  onChange={e => setNewHangMuc(e.target.value)}
                  placeholder="VD: Kiểm tra hệ thống cáp treo & khe co giãn..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chu kỳ bảo trì (tháng)</label>
                  <input
                    type="number"
                    value={newChuKy}
                    onChange={e => setNewChuKy(Number(e.target.value) || 6)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono tabular-nums outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đợt thực hiện tiếp theo</label>
                  <input
                    type="date"
                    value={newNgay}
                    onChange={e => setNewNgay(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono tabular-nums outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Kinh phí dự kiến (VNĐ)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInputMask(newCostVnd)}
                    onChange={e => setNewCostVnd(parseCurrencyInputMask(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono tabular-nums font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị thực hiện bảo trì</label>
                  <input
                    type="text"
                    value={newDonVi}
                    onChange={e => setNewDonVi(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMaintenanceModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm"
                >
                  Lưu hạng mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
