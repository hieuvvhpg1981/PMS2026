import React, { useState } from 'react';
import { ProjectData, ConstructionWorkRecord, ConsultingProductRecord } from '../../pms/T2_Services';
import { formatVND, safeNumber, generateExcelTemplate } from '../../pms/T1_Utils';
import ExcelDragDropUploader from '../ExcelDragDropUploader';
import { HardHat, MapPin, FileCheck, Calendar, Download, Upload, PlusCircle, Pencil, Trash2, Check, X, Building2, Camera } from 'lucide-react';
import { toast } from 'sonner';

interface TabDailyLogbookProps {
  project: ProjectData;
  selectedPackageId: string;
  onRefreshData: () => void;
}

export default function TabDailyLogbook({ project, selectedPackageId, onRefreshData }: TabDailyLogbookProps) {
  // Excel Modal
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [excelSchemaType, setExcelSchemaType] = useState<'CONSULTING' | 'BOQ'>('BOQ');

  // Daily E-Logbook input
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logWeather, setLogWeather] = useState<string>('Nắng đẹp, nhiệt độ 32°C');
  const [logWorkers, setLogWorkers] = useState<number>(120);
  const [logMachines, setLogMachines] = useState<string>('02 Máy đào, 01 Cẩu dầm 50T, 04 Xe tải');
  const [logVolume, setLogVolume] = useState<string>('Thi công đổ bê tông 250m3 dầm cầu đợt 2');

  // Construction Works state
  const [constructionWorks, setConstructionWorks] = useState<ConstructionWorkRecord[]>(
    project.CONSTRUCTION_WORKS_GDA4 || [
      { workId: 'NT-01', packageId: 'GT-XL-01', itemCode: 'AF.11111', itemName: 'Đào đất hố móng bằng máy đào 1.25m3', unit: '100m3', acceptedQty: 1500, unitPrice: 2500000, totalAcceptedAmount: 3750000000, logDate: '2026-05-25', status: 'ĐÃ_GIẢI_NGÂN' },
      { workId: 'NT-02', packageId: 'GT-XL-01', itemCode: 'AF.22222', itemName: 'Đổ bê tông dầm cầu mác M400', unit: 'm3', acceptedQty: 4500, unitPrice: 3200000, totalAcceptedAmount: 14400000000, logDate: '2026-06-20', status: 'ĐÃ_LẬP_BẢNG_XÁC_NHẬN' }
    ]
  );
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [draftWork, setDraftWork] = useState<Partial<ConstructionWorkRecord>>({});

  const handleEditWork = (work: ConstructionWorkRecord) => {
    setEditingWorkId(work.workId);
    setDraftWork({ ...work });
  };

  const handleSaveWorkRow = (workId: string) => {
    const updated = constructionWorks.map(w => {
      if (w.workId === workId) {
        const qty = safeNumber(draftWork.acceptedQty);
        const price = safeNumber(draftWork.unitPrice);
        return {
          ...w,
          ...draftWork,
          acceptedQty: qty,
          unitPrice: price,
          totalAcceptedAmount: qty * price
        } as ConstructionWorkRecord;
      }
      return w;
    });
    setConstructionWorks(updated);
    setEditingWorkId(null);
    toast.success(`Đã cập nhật dòng nghiệm thu ${workId}`);
  };

  const handleDeleteWork = (work: ConstructionWorkRecord) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa hạng mục [${work.itemName}] không?`)) {
      const updated = constructionWorks.filter(w => w.workId !== work.workId);
      setConstructionWorks(updated);
      toast.success(`Đã xóa hạng mục ${work.workId}`);
    }
  };

  const handleAddNewWorkRow = () => {
    const newId = `NT-${Date.now().toString().slice(-4)}`;
    const newWork: ConstructionWorkRecord = {
      workId: newId,
      packageId: selectedPackageId,
      itemCode: `AF.${Math.floor(10000 + Math.random() * 90000)}`,
      itemName: 'Hạng mục bóc tách nghiệm thu mới',
      unit: 'm3',
      acceptedQty: 500,
      unitPrice: 3200000,
      totalAcceptedAmount: 1600000000,
      logDate: new Date().toISOString().split('T')[0],
      status: 'ĐÃ_LẬP_BẢNG_XÁC_NHẬN'
    };
    const updated = [...constructionWorks, newWork];
    setConstructionWorks(updated);
    handleEditWork(newWork);
    toast.info(`Đã thêm mốc bóc tách mới. Hãy chỉnh sửa thông tin.`);
  };

  const isAllPackages = selectedPackageId === 'ALL' || selectedPackageId === 'ALL_PACKAGES';
  const filteredWorks = isAllPackages
    ? constructionWorks
    : constructionWorks.filter(w => w.packageId === selectedPackageId);

  return (
    <div className="space-y-6">
      {/* E-Logbook GPS Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <HardHat className="w-5 h-5 text-blue-600" />
          NHẬT KÝ THI CÔNG ĐIỆN TỬ HIỆN TRƯỜNG (KÝ SỐ SMARTCA & GPS)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-medium">
          <div>
            <label className="block text-slate-700 font-bold mb-1">Ngày Thi Công</label>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50 font-mono" />
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Thời Tiết Hiện Trường</label>
            <input type="text" value={logWeather} onChange={e => setLogWeather(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50" />
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Nhân Công (Người)</label>
            <input type="number" value={logWorkers} onChange={e => setLogWorkers(Number(e.target.value) || 0)} className="w-full px-3 py-2 border rounded-xl bg-slate-50 font-mono font-bold" />
          </div>
          <div>
            <label className="block text-slate-700 font-bold mb-1">Máy Thi Công Huy Động</label>
            <input type="text" value={logMachines} onChange={e => setLogMachines(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50" />
          </div>
        </div>

        <div>
          <label className="block text-slate-700 font-bold text-xs mb-1">Nội dung Khối lượng thực hiện trong ngày</label>
          <textarea rows={2} value={logVolume} onChange={e => setLogVolume(e.target.value)} className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-xs" />
        </div>

        {/* GPS Image attachment simulation */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-semibold">
            <Camera className="w-4 h-4 text-blue-600" />
            <span>Ảnh chụp hiện trường GPS (Định vị 20.8467° N, 106.6838° E)</span>
          </div>
          <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
            Đã gắn Geo-Tagting GPS
          </span>
        </div>

        <div className="flex justify-between items-center text-xs pt-1">
          <span className="text-slate-500 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-emerald-600" /> Vị trí GPS: 20.8467° N, 106.6838° E (Xác thực hiện trường)
          </span>
          <button
            onClick={() => toast.success('Đã lưu nhật ký thi công điện tử và xác thực Ký số SmartCA!')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <FileCheck className="w-4 h-4" /> Lưu Nhật Ký Điện Tử
          </button>
        </div>
      </div>

      {/* Construction Accepted Quantities Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              KHỐI LƯỢNG THI CÔNG NGHIỆM THU THEO GÓI [{selectedPackageId}]
            </h3>
            <p className="text-xs text-slate-500">Khối lượng nghiệm thu thực tế chi tiết làm cơ sở lập bảng giá trị thanh toán</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setExcelSchemaType('BOQ'); generateExcelTemplate('BOQ'); }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all border border-slate-300 flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-blue-600" /> Tải Template BOQ
            </button>

            <button
              onClick={() => { setExcelSchemaType('BOQ'); setIsExcelModalOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" /> Upload Bóc Tách Excel
            </button>
          </div>
        </div>

        {/* Construction Works Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Mã ĐM</th>
                <th className="px-3 py-2.5">Tên Công Tác Nghiệm Thu</th>
                <th className="px-3 py-2.5 text-center">ĐVT</th>
                <th className="px-3 py-2.5 text-right">Khối Lượng NT</th>
                <th className="px-3 py-2.5 text-right">Đơn Giá (VND)</th>
                <th className="px-3 py-2.5 text-right">Thành Tiền (VND)</th>
                <th className="px-3 py-2.5 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredWorks.map(work => {
                const isEditing = editingWorkId === work.workId;
                return (
                  <tr key={work.workId} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono font-bold text-blue-700">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draftWork.itemCode || ''}
                          onChange={e => setDraftWork({ ...draftWork, itemCode: e.target.value })}
                          className="w-20 px-1.5 py-0.5 border rounded font-mono"
                        />
                      ) : (
                        work.itemCode
                      )}
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draftWork.itemName || ''}
                          onChange={e => setDraftWork({ ...draftWork, itemName: e.target.value })}
                          className="w-full px-1.5 py-0.5 border rounded"
                        />
                      ) : (
                        work.itemName
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draftWork.unit || ''}
                          onChange={e => setDraftWork({ ...draftWork, unit: e.target.value })}
                          className="w-14 px-1 py-0.5 border rounded text-center"
                        />
                      ) : (
                        work.unit
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold">
                      {isEditing ? (
                        <input
                          type="number"
                          value={draftWork.acceptedQty || 0}
                          onChange={e => setDraftWork({ ...draftWork, acceptedQty: Number(e.target.value) || 0 })}
                          className="w-20 px-1.5 py-0.5 border rounded text-right font-mono font-bold"
                        />
                      ) : (
                        work.acceptedQty.toLocaleString('vi-VN')
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          value={draftWork.unitPrice || 0}
                          onChange={e => setDraftWork({ ...draftWork, unitPrice: Number(e.target.value) || 0 })}
                          className="w-28 px-1.5 py-0.5 border rounded text-right font-mono"
                        />
                      ) : (
                        formatVND(work.unitPrice)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                      {isEditing ? (
                        formatVND((safeNumber(draftWork.acceptedQty) * safeNumber(draftWork.unitPrice)))
                      ) : (
                        formatVND(work.acceptedQty * work.unitPrice)
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isEditing ? (
                        <div className="flex justify-center gap-1">
                          <button onClick={() => handleSaveWorkRow(work.workId)} className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingWorkId(null)} className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleEditWork(work)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteWork(work)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={handleAddNewWorkRow}
          className="w-full bg-slate-50 hover:bg-emerald-50/60 text-emerald-700 border-2 border-dashed border-emerald-300 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" /> [+ THÊM KHỐI LƯỢNG NGHIỆM THU THI CÔNG MỚI]
        </button>
      </div>

      {/* Excel Import Drag-and-Drop Modal */}
      <ExcelDragDropUploader
        projectId={project.PROJECT_ID}
        schemaType={excelSchemaType}
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImportSuccess={onRefreshData}
      />
    </div>
  );
}
