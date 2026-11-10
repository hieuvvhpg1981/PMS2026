import React, { useState, useEffect } from 'react';
import { ProjectData, ConstructionWorkRecord, ConsultingProductRecord, MaterialSubmittalRecord, ELogbookItem } from '../../pms/T2_Services';
import { PmsHandlers } from '../../pms/T3_Handlers';
import { formatVND, safeNumber, generateExcelTemplate, formatCurrencyInputMask, parseCurrencyInputMask, formatStatusOrCodeVN } from '../../pms/T1_Utils';
import ExcelDragDropUploader from '../ExcelDragDropUploader';
import { HardHat, MapPin, FileCheck, Calendar, Download, Upload, PlusCircle, Pencil, Trash2, Check, X, Building2, Camera, ShieldCheck, Leaf, AlertTriangle } from 'lucide-react';
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

  // Daily E-Logbook input (NĐ 207/2026 & TT 41/2026/TT-BXD)
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logWeather, setLogWeather] = useState<string>('Nắng đẹp, nhiệt độ 32°C');
  const [logWorkers, setLogWorkers] = useState<number>(120);
  const [logMachines, setLogMachines] = useState<string>('02 Máy đào, 01 Cẩu dầm 50T, 04 Xe tải');
  const [logVolume, setLogVolume] = useState<string>('Thi công đổ bê tông 250m3 dầm cầu đợt 2');
  const [contractorSigner, setContractorSigner] = useState<string>('KS. Lê Hoàng Nam (Chỉ huy trưởng - CCHN Hạng I)');
  const [supervisorSigner, setSupervisorSigner] = useState<string>('KS. Trần Quốc Tuấn (TVGS Trưởng - CCHN Hạng I)');
  const [safetyChecklistPassed, setSafetyChecklistPassed] = useState<boolean>(true);
  const [eLogs, setELogs] = useState<ELogbookItem[]>(project.NHAT_KY_THI_CONG || []);

  // Material Submittals & Conformity QC (NĐ 209/2026/NĐ-CP)
  const [materials, setMaterials] = useState<MaterialSubmittalRecord[]>(
    project.MATERIAL_SUBMITTALS_GDA4 || [
      {
        materialId: 'VL-2026-01',
        packageId: 'GT-XL-01',
        materialName: 'Thép thanh vằn D25 CB400-V Hòa Phát',
        batchCode: 'LÔ-HP-2026-08',
        originCoCq: 'CO/CQ Nhà máy Thép Hòa Phát Dung Quất',
        qcvnCertNo: 'QCVN 07:2026/BXD - Viện KHCN XD (IBST)',
        testLabName: 'LAS-XD 102',
        isGreenMaterial: true,
        approvalDate: '2026-05-18',
        status: 'ĐẠT_NGHIỆM_THU_ĐẦU_VÀO'
      },
      {
        materialId: 'VL-2026-02',
        packageId: 'GT-XL-01',
        materialName: 'Bê tông thương phẩm M400 phụ gia khoáng xỉ lò cao (VLXD Xanh)',
        batchCode: 'LÔ-BT-2026-15',
        originCoCq: 'Trạm trộn Bê tông Chèm - CO/CQ đầy đủ',
        qcvnCertNo: 'QCVN 16:2026/BXD - Chứng nhận Hợp quy',
        testLabName: 'LAS-XD 102',
        isGreenMaterial: true,
        approvalDate: '2026-05-19',
        status: 'ĐẠT_NGHIỆM_THU_ĐẦU_VÀO'
      }
    ]
  );
  const [newMatName, setNewMatName] = useState<string>('');
  const [newMatBatch, setNewMatBatch] = useState<string>('LÔ-2026-NEW');
  const [newMatQcvn, setNewMatQcvn] = useState<string>('QCVN 16:2026/BXD - Đạt Hợp quy');
  const [newMatIsGreen, setNewMatIsGreen] = useState<boolean>(true);

  useEffect(() => {
    setELogs(project.NHAT_KY_THI_CONG || []);
    if (project.MATERIAL_SUBMITTALS_GDA4 && project.MATERIAL_SUBMITTALS_GDA4.length > 0) {
      setMaterials(project.MATERIAL_SUBMITTALS_GDA4);
    }
  }, [project]);

  const handleSaveELogbookEntry = () => {
    if (!safetyChecklistPassed) {
      toast.error('CẢNH BÁO AN TOÀN (NĐ 207/2026): Chưa đạt Checklist An toàn lao động & Giàn giáo hiện trường! Không thể ký số Nhật ký.');
      return;
    }
    const newLog: ELogbookItem = {
      LOG_ID: `NK-${Date.now().toString().slice(-4)}`,
      PROJECT_ID: project.PROJECT_ID,
      NGAY_GHI: logDate,
      THOI_TIET: logWeather,
      NHAN_CONG_SO_LUONG: safeNumber(logWorkers),
      MAY_THI_CONG: logMachines,
      NOI_DUNG_CONG_VIEC: logVolume,
      GPS_COORDINATES: '20.8467° N, 106.6838° E',
      DA_KY_SO_SMART_CA: true,
      CONTRACTOR_SIGNER: contractorSigner,
      SUPERVISOR_SIGNER: supervisorSigner,
      SAFETY_CHECKLIST_PASSED: safetyChecklistPassed
    };
    const updatedLogs = [newLog, ...eLogs];
    setELogs(updatedLogs);
    const res = PmsHandlers.stage4ELogbookApi(project.PROJECT_ID, updatedLogs);
    if (res.success) {
      toast.success(res.message);
      onRefreshData();
    }
  };

  const handleAddMaterialSubmittal = () => {
    if (!newMatName.trim()) {
      toast.error('Vui lòng nhập tên Vật liệu xây dựng cần trình duyệt đầu vào!');
      return;
    }
    const newMat: MaterialSubmittalRecord = {
      materialId: `VL-${Date.now().toString().slice(-4)}`,
      packageId: selectedPackageId === 'ALL' ? 'GT-XL-01' : selectedPackageId,
      materialName: newMatName.trim(),
      batchCode: newMatBatch,
      originCoCq: 'Đầy đủ CO/CQ xuất xưởng',
      qcvnCertNo: newMatQcvn,
      testLabName: 'LAS-XD 102',
      isGreenMaterial: newMatIsGreen,
      approvalDate: new Date().toISOString().split('T')[0],
      status: 'ĐẠT_NGHIỆM_THU_ĐẦU_VÀO'
    };
    const updatedMats = [newMat, ...materials];
    setMaterials(updatedMats);
    const res = PmsHandlers.stage4MaterialSubmittalsApi(project.PROJECT_ID, updatedMats);
    if (res.success) {
      toast.success(res.message);
      setNewMatName('');
      onRefreshData();
    }
  };

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
    const approvedMaterials = materials.filter(m => m.status === 'ĐẠT_NGHIỆM_THU_ĐẦU_VÀO');
    if (approvedMaterials.length === 0) {
      toast.error('CHỐT CHẶN NĐ 209/2026: Chưa có Lô vật liệu xây dựng nào ĐẠT nghiệm thu đầu vào (CO/CQ & Hợp quy QCVN)! Không được phép nghiệm thu công việc xây dựng.');
      return;
    }
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
    toast.info(`Đã thêm mốc bóc tách mới (Đã đối chiếu lô vật liệu đạt chuẩn NĐ 209/2026).`);
  };

  const isAllPackages = selectedPackageId === 'ALL' || selectedPackageId === 'ALL_PACKAGES';
  const filteredWorks = isAllPackages
    ? constructionWorks
    : constructionWorks.filter(w => w.packageId === selectedPackageId);

  return (
    <div className="space-y-6">
      {/* E-Logbook GPS Form (NĐ 207/2026 & TT 41/2026/TT-BXD) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <HardHat className="w-5 h-5 text-indigo-600" />
            Nhật ký thi công điện tử hiện trường (Ký số kép SmartCA & GPS - NĐ 207/2026/NĐ-CP)
          </h3>
          <span className="bg-indigo-50 text-indigo-800 text-[11px] font-semibold px-3 py-1 rounded-full border border-indigo-200 tabular-nums">
            Đã lưu: {eLogs.length} bản ghi nhật ký điện tử
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-medium">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày thi công</label>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-mono tabular-nums text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Thời tiết hiện trường</label>
            <input type="text" value={logWeather} onChange={e => setLogWeather(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nhân công (Người)</label>
            <input type="number" value={logWorkers} onChange={e => setLogWorkers(Number(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 font-mono tabular-nums font-bold text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Máy thi công huy động</label>
            <input type="text" value={logMachines} onChange={e => setLogMachines(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung khối lượng thực hiện trong ngày</label>
          <textarea rows={2} value={logVolume} onChange={e => setLogVolume(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm" />
        </div>

        {/* Dual Digital Signatures & Safety Checklist per NĐ 207/2026 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-indigo-50/40 p-3.5 rounded-xl border border-indigo-200 text-xs">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chữ ký số 1: Chỉ huy trưởng nhà thầu</label>
            <input
              type="text"
              value={contractorSigner}
              onChange={e => setContractorSigner(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chữ ký số 2: Tư vấn giám sát trưởng</label>
            <input
              type="text"
              value={supervisorSigner}
              onChange={e => setSupervisorSigner(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
            />
          </div>
          <div className="flex items-center pt-4">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-900">
              <input
                type="checkbox"
                checked={safetyChecklistPassed}
                onChange={e => setSafetyChecklistPassed(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>Đạt Checklist ATLĐ, giàn giáo & thiết bị nâng (NĐ 207/2026)</span>
            </label>
          </div>
        </div>

        {/* GPS Image attachment simulation */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-semibold tabular-nums">
            <Camera className="w-4 h-4 text-indigo-600" />
            <span>Ảnh chụp hiện trường GPS (Định vị 20.8467° N, 106.6838° E)</span>
          </div>
          <span className="bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full text-[11px]">
            Đã gắn Geo-Tagging GPS
          </span>
        </div>

        <div className="flex justify-between items-center text-xs pt-1">
          <span className="text-slate-500 flex items-center gap-1 tabular-nums">
            <MapPin className="w-4 h-4 text-emerald-600" /> Vị trí GPS: 20.8467° N, 106.6838° E (Xác thực hiện trường)
          </span>
          <button
            onClick={handleSaveELogbookEntry}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <FileCheck className="w-4 h-4" /> Ký số kép & lưu nhật ký điện tử
          </button>
        </div>

        {/* Saved E-Logbook Records */}
        {eLogs.length > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="text-xs font-semibold text-slate-700">Lịch sử nhật ký điện tử đã ký số kép (TT 41/2026/TT-BXD):</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {eLogs.slice(0, 4).map(log => (
                <div key={log.LOG_ID} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono tabular-nums font-bold text-indigo-700">[{log.LOG_ID}] Ngày {log.NGAY_GHI}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                      Ký số kép SmartCA
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900">{log.NOI_DUNG_CONG_VIEC}</div>
                  <div className="text-[11px] text-slate-600">
                    CHT: {log.CONTRACTOR_SIGNER || 'Đã ký'} | TVGS: {log.SUPERVISOR_SIGNER || 'Đã ký'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* NĐ 209/2026/NĐ-CP: Material Submittals & Conformity QC Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Kiểm soát vật liệu xây dựng đầu vào: CO/CQ, Hợp quy QCVN & VLXD xanh (NĐ 209/2026/NĐ-CP)
            </h3>
            <p className="text-xs text-slate-500">
              Bắt buộc nghiệm thu vật liệu đầu vào đạt Hợp quy QCVN & thí nghiệm LAS-XD trước khi đưa vào thi công nghiệm thu
            </p>
          </div>
          <span className="bg-emerald-50 text-emerald-800 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 tabular-nums">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" /> VLXD xanh: {materials.filter(m => m.isGreenMaterial).length}/{materials.length} lô
          </span>
        </div>

        {/* Add Material Batch Form */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200 text-xs">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên vật liệu / Cấu kiện xây dựng</label>
            <input
              type="text"
              value={newMatName}
              onChange={e => setNewMatName(e.target.value)}
              placeholder="VD: Xi măng PCB40 Bỉm Sơn / Thép D20..."
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Số lô (Batch code)</label>
            <input
              type="text"
              value={newMatBatch}
              onChange={e => setNewMatBatch(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chứng nhận hợp quy QCVN</label>
            <input
              type="text"
              value={newMatQcvn}
              onChange={e => setNewMatQcvn(e.target.value)}
              className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>
          <div className="flex flex-col justify-between">
            <label className="flex items-center gap-1.5 font-semibold text-emerald-900 cursor-pointer mt-1">
              <input
                type="checkbox"
                checked={newMatIsGreen}
                onChange={e => setNewMatIsGreen(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-600"
              />
              <span>VLXD xanh / Tiết kiệm NL</span>
            </label>
            <button
              type="button"
              onClick={handleAddMaterialSubmittal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-3 rounded-lg transition-all"
            >
              + Duyệt lô VLXD
            </button>
          </div>
        </div>

        {/* Material Submittals Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Mã lô</th>
                <th className="px-3 py-2.5">Tên vật liệu xây dựng</th>
                <th className="px-3 py-2.5">Xuất xứ CO/CQ</th>
                <th className="px-3 py-2.5">Chứng nhận hợp quy (NĐ 209/2026)</th>
                <th className="px-3 py-2.5 text-center">VLXD xanh</th>
                <th className="px-3 py-2.5 text-center">Trạng thái QC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {materials.map(mat => (
                <tr key={mat.materialId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono tabular-nums font-bold text-indigo-700">{mat.batchCode}</td>
                  <td className="px-3 py-2 font-semibold text-slate-900">{mat.materialName}</td>
                  <td className="px-3 py-2">{mat.originCoCq}</td>
                  <td className="px-3 py-2 font-mono tabular-nums text-slate-700">{mat.qcvnCertNo} ({mat.testLabName})</td>
                  <td className="px-3 py-2 text-center">
                    {mat.isGreenMaterial ? (
                      <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                        Đạt VLXD xanh
                      </span>
                    ) : (
                      <span className="text-slate-400">Tiêu chuẩn</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                      {formatStatusOrCodeVN(mat.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Construction Accepted Quantities Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              Khối lượng thi công nghiệm thu theo gói <span className="font-mono tabular-nums">[{selectedPackageId}]</span>
            </h3>
            <p className="text-xs text-slate-500">Khối lượng nghiệm thu thực tế chi tiết làm cơ sở lập bảng giá trị thanh toán</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setExcelSchemaType('BOQ'); generateExcelTemplate('BOQ'); }}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-4 h-4 text-slate-600" /> Tải Template BOQ
            </button>

            <button
              onClick={() => { setExcelSchemaType('BOQ'); setIsExcelModalOpen(true); }}
              className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Upload className="w-4 h-4 text-slate-600" /> Upload bóc tách Excel
            </button>
          </div>
        </div>

        {/* Construction Works Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5">Mã ĐM</th>
                <th className="px-3 py-2.5">Tên công tác nghiệm thu</th>
                <th className="px-3 py-2.5 text-center">ĐVT</th>
                <th className="px-3 py-2.5 text-right">Khối lượng NT</th>
                <th className="px-3 py-2.5 text-right">Đơn giá (VNĐ)</th>
                <th className="px-3 py-2.5 text-right">Thành tiền (VNĐ)</th>
                <th className="px-3 py-2.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredWorks.map(work => {
                const isEditing = editingWorkId === work.workId;
                return (
                  <tr key={work.workId} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono tabular-nums font-bold text-indigo-700">
                      {isEditing ? (
                        <input
                          type="text"
                          value={draftWork.itemCode || ''}
                          onChange={e => setDraftWork({ ...draftWork, itemCode: e.target.value })}
                          className="w-20 px-1.5 py-0.5 border rounded font-mono tabular-nums"
                        />
                      ) : (
                        work.itemCode
                      )}
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
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
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-bold">
                      {isEditing ? (
                        <input
                          type="number"
                          value={draftWork.acceptedQty || 0}
                          onChange={e => setDraftWork({ ...draftWork, acceptedQty: Number(e.target.value) || 0 })}
                          className="w-20 px-1.5 py-0.5 border rounded text-right font-mono tabular-nums font-bold"
                        />
                      ) : (
                        work.acceptedQty.toLocaleString('vi-VN')
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {isEditing ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          value={formatCurrencyInputMask(draftWork.unitPrice || 0)}
                          onChange={e => setDraftWork({ ...draftWork, unitPrice: parseCurrencyInputMask(e.target.value) })}
                          className="w-32 px-1.5 py-0.5 border rounded text-right font-mono tabular-nums"
                        />
                      ) : (
                        formatVND(work.unitPrice)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-emerald-700">
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
                          <button onClick={() => handleEditWork(work)} className="text-indigo-600 hover:text-indigo-800 p-1"><Pencil className="w-4 h-4" /></button>
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
          className="w-full bg-slate-50 hover:bg-indigo-50/60 text-indigo-700 border-2 border-dashed border-indigo-200 font-semibold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4" /> Thêm khối lượng nghiệm thu thi công mới
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
