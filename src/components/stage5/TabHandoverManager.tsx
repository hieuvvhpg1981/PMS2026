import React, { useState } from 'react';
import { ProjectData, HandoverDossierRecord } from '../../pms/T2_Services';
import { generateExcelTemplate, parseExcelFile, filterClosureDataByScope, formatStatusOrCodeVN } from '../../pms/T1_Utils';
import {
  FileCheck,
  Download,
  Upload,
  Plus,
  Edit2,
  Trash2,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FolderArchive
} from 'lucide-react';
import { toast } from 'sonner';

interface TabHandoverManagerProps {
  currentProject: ProjectData;
  selectedPackageId: string;
  onUpdateProject: (updated: ProjectData) => void;
}

export default function TabHandoverManager({
  currentProject,
  selectedPackageId,
  onUpdateProject
}: TabHandoverManagerProps) {
  const allHandovers: HandoverDossierRecord[] = currentProject.HANDOVER_ITEMS_GDA5 || [
    {
      handoverId: 'HO-01',
      projectId: currentProject.PROJECT_ID,
      packageId: 'GT-XL-01',
      dossierCode: 'HO-NT-001',
      dossierName: 'Biên bản Nghiệm thu hoàn thành Công trình đưa vào sử dụng (NĐ 207/2026/NĐ-CP)',
      dossierType: 'BIÊN_BẢN_NGHIỆM_THU',
      submittingUnit: 'Tập đoàn Xây dựng Đèo Cả - Vinaconex',
      handoverDate: '2026-06-30',
      fileUrl: 'https://pms2026.gov.vn/handover/BB_NghiemThu_HoanThanh.pdf',
      fileName: 'BB_NghiemThu_HoanThanh.pdf',
      status: 'ĐÃ_NGHIỆM_THU'
    },
    {
      handoverId: 'HO-02',
      projectId: currentProject.PROJECT_ID,
      packageId: 'GT-XL-01',
      dossierCode: 'HO-HC-002',
      dossierName: 'Hồ sơ Bản vẽ hoàn công & Báo cáo trắc đạc công trình (DWG/PDF)',
      dossierType: 'BẢN_VẼ_HOÀN_CÔNG',
      submittingUnit: 'Tập đoàn Xây dựng Đèo Cả - Vinaconex',
      handoverDate: '2026-07-05',
      fileUrl: 'https://pms2026.gov.vn/handover/BanVe_HoanCong_Full.dwg',
      fileName: 'BanVe_HoanCong_Full.dwg',
      status: 'ĐÃ_PHÊ_DUYỆT'
    },
    {
      handoverId: 'HO-03',
      projectId: currentProject.PROJECT_ID,
      packageId: 'GT-TV-01',
      dossierCode: 'HO-VH-003',
      dossierName: 'Quy trình vận hành, khai thác & Bảo trì công trình (TT 40/2026/TT-BXD)',
      dossierType: 'QUY_TRÌNH_VẬN_HÀNH',
      submittingUnit: 'Tổng Công ty Tư vấn Thiết kế TEDI',
      handoverDate: '2026-07-10',
      fileUrl: 'https://pms2026.gov.vn/handover/QuyTrinh_BaoTri_CongTrinh.pdf',
      fileName: 'QuyTrinh_BaoTri_CongTrinh.pdf',
      status: 'ĐÃ_PHÊ_DUYỆT'
    }
  ];

  // Filter list by selectedProjectId and selectedPackageId
  const displayedHandovers = filterClosureDataByScope(allHandovers, currentProject.PROJECT_ID, selectedPackageId);

  // Modal / Add / Edit States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<HandoverDossierRecord>>({
    dossierCode: '',
    dossierName: '',
    dossierType: 'BIÊN_BẢN_NGHIỆM_THU',
    submittingUnit: 'Ban QLDA / Nhà thầu thi công',
    handoverDate: new Date().toISOString().split('T')[0],
    status: 'CHỜ_DUYỆT'
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const handleDownloadTemplate = () => {
    generateExcelTemplate('CONSULTING');
    toast.success('Đã tải xuống Template Excel Danh mục Bàn giao Hồ sơ Công trình!');
  };

  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await parseExcelFile(file);
      if (rows && rows.length > 1) {
        toast.success(`Đã nạp thành công ${rows.length - 1} hồ sơ bàn giao từ file Excel!`);
      }
    } catch {
      toast.error('Không thể đọc file Excel. Vui lòng kiểm tra định dạng.');
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      dossierCode: `HO-${Date.now().toString().slice(-4)}`,
      dossierName: '',
      dossierType: 'BIÊN_BẢN_NGHIỆM_THU',
      submittingUnit: 'Tập đoàn Xây dựng Đèo Cả - Vinaconex',
      handoverDate: new Date().toISOString().split('T')[0],
      status: 'CHỜ_DUYỆT'
    });
    setUploadFile(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (record: HandoverDossierRecord) => {
    setEditingId(record.handoverId);
    setFormData({ ...record });
    setUploadFile(null);
    setShowModal(true);
  };

  const handleDeleteRecord = (id: string) => {
    const updatedList = allHandovers.filter(h => h.handoverId !== id);
    onUpdateProject({
      ...currentProject,
      HANDOVER_ITEMS_GDA5: updatedList
    });
    toast.success('Đã xóa hồ sơ bàn giao khỏi danh mục');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dossierName) {
      toast.error('Vui lòng nhập Tên Hồ Sơ Bàn Giao');
      return;
    }

    let updatedList = [...allHandovers];
    const fileName = uploadFile ? uploadFile.name : (formData.fileName || 'HoSo_Handover.pdf');
    const fileUrl = uploadFile ? URL.createObjectURL(uploadFile) : (formData.fileUrl || 'https://pms2026.gov.vn/handover/doc.pdf');

    if (editingId) {
      updatedList = updatedList.map(item => {
        if (item.handoverId === editingId) {
          return {
            ...item,
            ...formData,
            fileName,
            fileUrl
          } as HandoverDossierRecord;
        }
        return item;
      });
      toast.success('Đã cập nhật hồ sơ bàn giao');
    } else {
      const newRecord: HandoverDossierRecord = {
        handoverId: `HO-${Date.now()}`,
        projectId: currentProject.PROJECT_ID,
        packageId: selectedPackageId !== 'ALL' && selectedPackageId !== 'ALL_PACKAGES' ? selectedPackageId : 'GT-XL-01',
        dossierCode: formData.dossierCode || `HO-${Date.now().toString().slice(-4)}`,
        dossierName: formData.dossierName,
        dossierType: formData.dossierType || 'BIÊN_BẢN_NGHIỆM_THU',
        submittingUnit: formData.submittingUnit || 'Đơn vị nộp',
        handoverDate: formData.handoverDate || new Date().toISOString().split('T')[0],
        fileName,
        fileUrl,
        status: formData.status || 'CHỜ_DUYỆT'
      };
      updatedList.unshift(newRecord);
      toast.success('Đã thêm mới hồ sơ bàn giao công trình');
    }

    onUpdateProject({
      ...currentProject,
      HANDOVER_ITEMS_GDA5: updatedList
    });

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-indigo-600" />
            Danh mục hồ sơ nghiệm thu, bản vẽ hoàn công & bàn giao công trình
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý lưu trữ tài liệu bàn giao kỹ thuật, bản vẽ hoàn công (DWG/PDF) & Quy trình bảo trì (TT 40/2026/TT-BXD)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadTemplate}
            className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" /> Tải Template
          </button>

          <label className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs">
            <Upload className="w-3.5 h-3.5 text-slate-600" /> Upload Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleUploadExcel} className="hidden" />
          </label>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Thêm hồ sơ bàn giao
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <th className="p-3.5 min-w-[100px]">Mã hồ sơ</th>
                <th className="p-3.5 min-w-[280px]">Tên hồ sơ bàn giao / Bản vẽ hoàn công</th>
                <th className="p-3.5 min-w-[160px]">Loại hồ sơ</th>
                <th className="p-3.5 min-w-[200px]">Đơn vị bàn giao</th>
                <th className="p-3.5 min-w-[110px]">Ngày nộp</th>
                <th className="p-3.5 min-w-[120px]">Trạng thái</th>
                <th className="p-3.5 text-center min-w-[130px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedHandovers.map(item => (
                <tr key={item.handoverId} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3.5 font-mono tabular-nums font-bold text-indigo-900">{item.dossierCode}</td>
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{item.dossierName}</div>
                    {item.fileName && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-indigo-600 hover:underline inline-flex items-center gap-1 mt-0.5 font-mono"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" /> {item.fileName}
                      </a>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className="bg-slate-100 text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-200">
                      {formatStatusOrCodeVN(item.dossierType)}
                    </span>
                  </td>
                  <td className="p-3.5 font-medium text-slate-700">{item.submittingUnit}</td>
                  <td className="p-3.5 font-mono tabular-nums text-slate-600">{item.handoverDate}</td>
                  <td className="p-3.5">
                    {item.status === 'ĐÃ_NGHIỆM_THU' || item.status === 'ĐÃ_PHÊ_DUYỆT' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {formatStatusOrCodeVN(item.status)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                        <AlertCircle className="w-3 h-3 text-amber-600" /> {formatStatusOrCodeVN(item.status)}
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Sửa hồ sơ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(item.handoverId)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Xóa hồ sơ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {displayedHandovers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Chưa có hồ sơ bàn giao nào trong hệ thống cho Gói thầu đã chọn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-indigo-600" />
                {editingId ? 'Cập nhật hồ sơ bàn giao' : 'Thêm mới hồ sơ bàn giao công trình'}
              </h4>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã hồ sơ *</label>
                  <input
                    type="text"
                    value={formData.dossierCode || ''}
                    onChange={e => setFormData({ ...formData, dossierCode: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono tabular-nums font-bold outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loại hồ sơ *</label>
                  <select
                    value={formData.dossierType || 'BIÊN_BẢN_NGHIỆM_THU'}
                    onChange={e => setFormData({ ...formData, dossierType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none"
                  >
                    <option value="BIÊN_BẢN_NGHIỆM_THU">Biên bản nghiệm thu</option>
                    <option value="BẢN_VẼ_HOÀN_CÔNG">Bản vẽ hoàn công (DWG/PDF)</option>
                    <option value="QUY_TRÌNH_VẬN_HÀNH">Quy trình vận hành & bảo trì</option>
                    <option value="HỒ_SƠ_KHÁC">Hồ sơ khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên hồ sơ bàn giao / Bản vẽ *</label>
                <input
                  type="text"
                  value={formData.dossierName || ''}
                  onChange={e => setFormData({ ...formData, dossierName: e.target.value })}
                  placeholder="VD: Biên bản nghiệm thu hoàn thành công trình..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị bàn giao</label>
                  <input
                    type="text"
                    value={formData.submittingUnit || ''}
                    onChange={e => setFormData({ ...formData, submittingUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bàn giao</label>
                  <input
                    type="date"
                    value={formData.handoverDate || ''}
                    onChange={e => setFormData({ ...formData, handoverDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono tabular-nums outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tệp đính kèm (PDF, DWG, ZIP ≤ 100MB)</label>
                <input
                  type="file"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl"
                >
                  Hủy thao tác
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-sm"
                >
                  Lưu hồ sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
