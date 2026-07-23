import React, { useState } from 'react';
import { ProjectData, MaintenanceScheduleItem } from '../../pms/T2_Services';
import { formatDateVN, generateZipArchiveStructure } from '../../pms/T1_Utils';
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

  const handleDownloadZip = () => {
    toast.success(`Đã bắt đầu nén và tải xuống tệp lưu trữ số hóa: ${zipInfo.archiveName} (${zipInfo.totalSizeMB} MB)`);
    setShowZipModal(false);
  };

  const handleLockTreasury = () => {
    const updated: ProjectData = {
      ...currentProject,
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
      TRANG_THAI: 'BÌNH_THƯỜNG'
    };

    const updatedList = [newItem, ...maintenanceList];
    onUpdateProject({
      ...currentProject,
      LIC_BAO_TRI: updatedList
    });

    toast.success('Đã thêm hạng mục bảo trì định kỳ');
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
      {/* Top 2 Cards: ZIP Archiver & Treasury Lock */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Digital Handover ZIP Archive Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Archive className="w-5 h-5 text-indigo-600" />
              DIGITAL HANDOVER ARCHIVER (ĐÓNG GÓI BÀN GIAO SỐ)
            </h3>
            <span className="bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
              48.6 MB (.ZIP)
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Nạp toàn bộ văn bản pháp lý, bản vẽ hoàn công (DWG/PDF), Hợp đồng QĐ 1040 và Nhật ký E-Logbook từ GĐ 1 đến GĐ 5 thành 1 tệp mã hóa phục vụ Kiểm toán Nhà nước.
          </p>

          <button
            onClick={() => setShowZipModal(true)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Xem Cấu Trúc & Tải Đóng Gói Lưu Trữ (.ZIP)
          </button>
        </div>

        {/* Treasury Settlement & Lock Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-start border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600" />
              TẤT TOÁN KHO BẠC & KHÓA MÃ DỰ ÁN CSDL QUỐC GIA
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
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" /> Tất Toán Kho Bạc & Khóa Mã Dự Án
          </button>
        </div>
      </div>

      {/* Maintenance Schedule Table (Circular 40/2026/TT-BXD) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-amber-600" />
              QUY TRÌNH & LỊCH BẢO TRÌ CÔNG TRÌNH ĐỊNH KỲ (TT 40/2026/TT-BXD)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động cảnh báo đếm ngược thời gian hết hạn bảo hành & đợt kiểm định kỹ thuật định kỳ
            </p>
          </div>

          <button
            onClick={() => setShowAddMaintenanceModal(true)}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Thêm Hạng Mục Bảo Trì
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                <th className="p-3.5 min-w-[280px]">Hạng Mục Bảo Trì / Kiểm Định</th>
                <th className="p-3.5 min-w-[120px]">Chu Kỳ (Tháng)</th>
                <th className="p-3.5 min-w-[140px]">Đợt Kiểm Tra Tiếp theo</th>
                <th className="p-3.5 min-w-[220px]">Đơn Vị Thực Hiện Bảo Trì</th>
                <th className="p-3.5 min-w-[130px]">Trạng Thái</th>
                <th className="p-3.5 text-center min-w-[140px]">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {maintenanceList.map(item => (
                <tr key={item.SCHEDULE_ID} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-bold text-slate-900">{item.HANG_MUC_BAO_TRI}</td>
                  <td className="p-3.5 font-mono text-slate-700 font-bold">{item.CHU_KY_THANG} tháng/lần</td>
                  <td className="p-3.5 font-mono text-amber-700 font-bold">{formatDateVN(item.NGAY_BAO_TRI_NEXT)}</td>
                  <td className="p-3.5 text-slate-600 font-medium">{item.DON_VI_THUC_HIEN}</td>
                  <td className="p-3.5">
                    {item.TRANG_THAI === 'ĐẾN_HẠN' || item.TRANG_THAI === 'QUÁ_HẠN' ? (
                      <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-red-200 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> {item.TRANG_THAI}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {item.TRANG_THAI}
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
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Chưa có hạng mục bảo trì công trình nào. Bấm nút "Thêm Hạng Mục Bảo Trì" ở trên.
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
                CÂY THƯ MỤC LƯU TRỮ SỐ HÓA TOÀN BỘ DỰ ÁN (.ZIP)
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Đóng
              </button>
              <button
                onClick={handleDownloadZip}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Tải Xuống Tệp Archive (.ZIP)
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
                <CalendarCheck className="w-5 h-5 text-amber-600" />
                THÊM MỚI HẠNG MỤC BẢO TRÌ CÔNG TRÌNH ĐỊNH KỲ
              </h4>
              <button onClick={() => setShowAddMaintenanceModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleAddMaintenance} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">TÊN HẠNG MỤC BẢO TRÌ / KIỂM ĐỊNH *</label>
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
                  <label className="block font-bold text-slate-700 mb-1">CHU KỲ BẢO TRÌ (THÁNG)</label>
                  <input
                    type="number"
                    value={newChuKy}
                    onChange={e => setNewChuKy(Number(e.target.value) || 6)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ĐỢT THỰC HIỆN TIẾP THEO</label>
                  <input
                    type="date"
                    value={newNgay}
                    onChange={e => setNewNgay(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">ĐƠN VỊ THỰC HIỆN BẢO TRÌ</label>
                <input
                  type="text"
                  value={newDonVi}
                  onChange={e => setNewDonVi(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMaintenanceModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm"
                >
                  Lưu Hạng Mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
