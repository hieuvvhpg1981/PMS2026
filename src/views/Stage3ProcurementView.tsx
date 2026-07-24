import React, { useState, useEffect } from 'react';
import { PmsService, ProjectData, SiteClearanceRecord, ProcurementPackageRecord, ContractManagementRecord } from '../pms/T2_Services';
import { PmsHandlers } from '../pms/T3_Handlers';
import { ProcurementMethod, ContractType, GpmbStatus, STAGE3_DOCUMENT_TYPES } from '../pms/T0_Config';
import { formatVND, safeNumber, safeString, calculateBiddingSavings, generateExcelTemplate, canEditProject } from '../pms/T1_Utils';
import { UserProfile } from '../pms/T2_Services';
import Stage3DocumentUploader from '../components/Stage3DocumentUploader';
import ExcelDragDropUploader from '../components/ExcelDragDropUploader';
import {
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle,
  Award,
  Download,
  Upload,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  PlusCircle,
  FileCheck2,
  ShieldCheck,
  MapPin,
  Briefcase,
  Layers,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function Stage3ProcurementView({ currentUser }: { currentUser?: UserProfile | null }) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'gpmb' | 'khlcnt' | 'contract'>('gpmb');

  // Excel Uploader Modal state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [excelSchemaType, setExcelSchemaType] = useState<'GPMB' | 'KHLCNT'>('GPMB');

  // Tab 1 State: GPMB & Tái định cư
  const [gpmbItems, setGpmbItems] = useState<SiteClearanceRecord[]>([]);
  const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(null);
  const [draftHousehold, setDraftHousehold] = useState<Partial<SiteClearanceRecord>>({});

  // Tab 2 State: KHLCNT & Bidding
  const [khlcntItems, setKhlcntItems] = useState<ProcurementPackageRecord[]>([]);
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null);
  const [draftPackage, setDraftPackage] = useState<Partial<ProcurementPackageRecord>>({});

  // Tab 3 State: Contract & Addendum
  const [contractItems, setContractItems] = useState<ContractManagementRecord[]>([]);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [draftContract, setDraftContract] = useState<Partial<ContractManagementRecord>>({});

  // New Contract Form State
  const [newContractNo, setNewContractNo] = useState<string>('01/2026/HĐ-XL');
  const [newContractName, setNewContractName] = useState<string>('Gói thầu số 01: Thi công XL Cầu & Đường dẫn');
  const [newContractorName, setNewContractorName] = useState<string>('Tập đoàn Xây dựng Đèo Cả - Vinaconex');
  const [newContractType, setNewContractType] = useState<ContractType>(ContractType.DON_GIA_DIEU_CHINH);
  const [newContractValue, setNewContractValue] = useState<number>(880000000000);
  const [newAdvancePct, setNewAdvancePct] = useState<number>(20);
  const [newRetentionPct, setNewRetentionPct] = useState<number>(5);

  // Contract Document Sample Modal
  const [showContractDocModal, setShowContractDocModal] = useState<boolean>(false);
  const [sampleContractText, setSampleContractText] = useState<string>('');

  useEffect(() => {
    const list = PmsService.getProjects();
    setProjects(list);
    if (list.length > 0 && !selectedProjectId) {
      setSelectedProjectId(list[0].PROJECT_ID);
    }
  }, []);

  const currentProject = projects.find(p => p.PROJECT_ID === selectedProjectId);

  useEffect(() => {
    if (currentProject) {
      setGpmbItems(currentProject.GPMB_ITEMS_GDA3 || [
        { householdId: 'HO-001', ownerName: 'Nguyễn Văn An', mapPlotNo: 'TĐ-05/ST-12', recoveredArea: 350.5, unitPrice: 12000000, totalCompensation: 4206000000, status: GpmbStatus.DA_BAN_GIAO_MAT_BANG },
        { householdId: 'HO-002', ownerName: 'Trần Thị Bình', mapPlotNo: 'TĐ-05/ST-14', recoveredArea: 520.0, unitPrice: 12000000, totalCompensation: 6240000000, status: GpmbStatus.DA_CHI_TRA },
        { householdId: 'HO-003', ownerName: 'Phạm Quốc Cường', mapPlotNo: 'TĐ-06/ST-01', recoveredArea: 180.2, unitPrice: 15000000, totalCompensation: 2703000000, status: GpmbStatus.DA_PHE_DUYET_PA }
      ]);

      setKhlcntItems(currentProject.KHLCNT_ITEMS_GDA3 || [
        { packageId: 'GT-01', packageName: 'Gói thầu số 01: Thi công XL Cầu & Đường dẫn', packagePrice: 910000000000, fundingSource: 'Ngân sách Đầu tư công', procurementMethod: ProcurementMethod.DAU_THAU_RONG_RAI, contractType: ContractType.DON_GIA_DIEU_CHINH, executionMonths: 18, winningContractor: 'Tập đoàn Xây dựng Đèo Cả - Vinaconex', winningPrice: 880000000000, savingsAmount: 30000000000, savingsPct: 3.3, status: 'ĐÃ_KÝ_HỢP_ĐỒNG' }
      ]);

      setContractItems(currentProject.CONTRACT_ITEMS_GDA3 || [
        { contractId: 'HD-2026-01', packageId: 'GT-01', contractNo: '01/2026/HĐ-XL', contractName: 'Hợp đồng Thi công Xây lắp Cầu & Đường dẫn', contractorName: 'Tập đoàn Xây dựng Đèo Cả - Vinaconex', contractType: ContractType.DON_GIA_DIEU_CHINH, contractValue: 880000000000, advancePct: 20, retentionPct: 5, signDate: '2026-05-10', startDate: '2026-05-15', endDate: '2027-11-15', status: 'ĐANG_THỰC_HIỆN' }
      ]);
    }
  }, [selectedProjectId]);

  const refreshProjectData = () => {
    const list = PmsService.getProjects();
    setProjects(list);
    if (selectedProjectId) {
      const proj = list.find(p => p.PROJECT_ID === selectedProjectId);
      if (proj) {
        setGpmbItems(proj.GPMB_ITEMS_GDA3 || []);
        setKhlcntItems(proj.KHLCNT_ITEMS_GDA3 || []);
        setContractItems(proj.CONTRACT_ITEMS_GDA3 || []);
      }
    }
  };

  const handleDownloadTemplate = (type: 'GPMB' | 'KHLCNT') => {
    generateExcelTemplate(type);
    toast.success(`Đã tải xuống tệp mẫu Excel .xlsx cho ${type === 'GPMB' ? 'Giải phóng mặt bằng' : 'Kế hoạch LCNT'}`);
  };

  const handleOpenExcelImport = (type: 'GPMB' | 'KHLCNT') => {
    setExcelSchemaType(type);
    setIsExcelModalOpen(true);
  };

  // ================= TAB 1: GPMB & TÁI ĐỊNH CƯ =================
  const handleEditGpmbHousehold = (item: SiteClearanceRecord) => {
    setEditingHouseholdId(item.householdId);
    setDraftHousehold({ ...item });
  };

  const handleSaveGpmbRow = (householdId: string) => {
    const updated = gpmbItems.map(item => {
      if (item.householdId === householdId) {
        const area = safeNumber(draftHousehold.recoveredArea);
        const price = safeNumber(draftHousehold.unitPrice);
        return {
          ...item,
          ...draftHousehold,
          recoveredArea: area,
          unitPrice: price,
          totalCompensation: area * price
        } as SiteClearanceRecord;
      }
      return item;
    });
    setGpmbItems(updated);
    setEditingHouseholdId(null);
    toast.success(`Đã lưu cập nhật cho hộ ${draftHousehold.ownerName || householdId}`);
  };

  const handleCancelGpmbEdit = () => {
    setEditingHouseholdId(null);
    setDraftHousehold({});
  };

  const handleDeleteGpmbItem = (item: SiteClearanceRecord) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa thông tin GPMB hộ [${item.ownerName}] không?`)) {
      const updated = gpmbItems.filter(i => i.householdId !== item.householdId);
      setGpmbItems(updated);
      toast.success(`Đã xóa hộ dân ${item.householdId}`);
    }
  };

  const handleAddNewGpmbRow = () => {
    const newId = `HO-${Date.now().toString().slice(-4)}`;
    const newItem: SiteClearanceRecord = {
      householdId: newId,
      ownerName: 'Hộ dân mới bổ sung thủ công',
      mapPlotNo: 'TĐ-01/ST-01',
      recoveredArea: 200,
      unitPrice: 12000000,
      totalCompensation: 2400000000,
      status: GpmbStatus.CHO_KIEM_DEM
    };
    setGpmbItems([...gpmbItems, newItem]);
    handleEditGpmbHousehold(newItem);
    toast.info(`Đã thêm hộ dân mới. Hãy chỉnh sửa và bấm Lưu.`);
  };

  const handleSaveGpmbAll = () => {
    if (!currentProject) return;
    const res = PmsHandlers.stage3GpmbApi(currentProject.PROJECT_ID, gpmbItems);
    if (res.success) {
      toast.success(res.message);
      refreshProjectData();
    }
  };

  // ================= TAB 2: KHLCNT & BÁN THẦU =================
  const handleEditKhlcntPackage = (pkg: ProcurementPackageRecord) => {
    setEditingPackageId(pkg.packageId);
    setDraftPackage({ ...pkg });
  };

  const handleSaveKhlcntRow = (packageId: string) => {
    const updated = khlcntItems.map(pkg => {
      if (pkg.packageId === packageId) {
        const pkgPrice = safeNumber(draftPackage.packagePrice);
        const winPrice = safeNumber(draftPackage.winningPrice);
        const savings = winPrice > 0 ? calculateBiddingSavings(pkgPrice, winPrice) : { savingsAmount: 0, savingsPct: 0 };
        return {
          ...pkg,
          ...draftPackage,
          packagePrice: pkgPrice,
          winningPrice: winPrice > 0 ? winPrice : undefined,
          savingsAmount: savings.savingsAmount,
          savingsPct: savings.savingsPct,
          status: winPrice > 0 ? ('ĐÃ_PHE_DUYET_KQLCNT' as const) : ('DỰ_THẢO' as const)
        } as ProcurementPackageRecord;
      }
      return pkg;
    });
    setKhlcntItems(updated);
    setEditingPackageId(null);
    toast.success(`Đã lưu thay đổi cho gói thầu ${packageId}`);
  };

  const handleCancelKhlcntEdit = () => {
    setEditingPackageId(null);
    setDraftPackage({});
  };

  const handleDeleteKhlcntItem = (pkg: ProcurementPackageRecord) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa gói thầu [${pkg.packageName}] không?`)) {
      const updated = khlcntItems.filter(p => p.packageId !== pkg.packageId);
      setKhlcntItems(updated);
      toast.success(`Đã xóa gói thầu ${pkg.packageId}`);
    }
  };

  const handleAddNewKhlcntRow = () => {
    const newId = `GT-${Date.now().toString().slice(-4)}`;
    const newPkg: ProcurementPackageRecord = {
      packageId: newId,
      packageName: 'Gói thầu xây lắp mới bổ sung',
      packagePrice: 50000000000,
      fundingSource: 'Ngân sách Nhà nước',
      procurementMethod: ProcurementMethod.DAU_THAU_RONG_RAI,
      contractType: ContractType.DON_GIA_DIEU_CHINH,
      executionMonths: 12,
      status: 'DỰ_THẢO'
    };
    setKhlcntItems([...khlcntItems, newPkg]);
    handleEditKhlcntPackage(newPkg);
    toast.info(`Đã thêm gói thầu mới. Hãy chỉnh sửa thông tin.`);
  };

  const handleSaveKhlcntAll = () => {
    if (!currentProject) return;
    const res = PmsHandlers.stage3KhlcntApi(currentProject.PROJECT_ID, khlcntItems);
    if (res.success) {
      toast.success(res.message);
      refreshProjectData();
    }
  };

  // ================= TAB 3: CONTRACT MANAGEMENT =================
  const handleAddNewContract = () => {
    if (!currentProject) return;
    const newContract: ContractManagementRecord = {
      contractId: `HD-${Date.now().toString().slice(-4)}`,
      packageId: khlcntItems[0]?.packageId || 'GT-01',
      contractNo: newContractNo,
      contractName: newContractName,
      contractorName: newContractorName,
      contractType: newContractType,
      contractValue: safeNumber(newContractValue),
      advancePct: safeNumber(newAdvancePct),
      retentionPct: safeNumber(newRetentionPct),
      signDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2027-12-31',
      status: 'ĐANG_THỰC_HIỆN'
    };

    const updatedContracts = [...contractItems, newContract];
    const res = PmsHandlers.stage3ContractApi(currentProject.PROJECT_ID, updatedContracts);
    if (res.success) {
      toast.success(`Đã ký kết và khởi tạo hợp đồng số [${newContractNo}]!`);
      refreshProjectData();
    }
  };

  const handleGenerateContractSample = () => {
    if (!currentProject) return;
    const dummyContract: ContractManagementRecord = {
      contractId: 'HD-SAMPLE',
      packageId: 'GT-01',
      contractNo: newContractNo,
      contractName: newContractName,
      contractorName: newContractorName,
      contractType: newContractType,
      contractValue: safeNumber(newContractValue),
      advancePct: safeNumber(newAdvancePct),
      retentionPct: safeNumber(newRetentionPct),
      signDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2027-12-31',
      status: 'ĐANG_THỰC_HIỆN'
    };

    const docText = PmsService.generateSampleContractDocument(dummyContract, currentProject);
    setSampleContractText(docText);
    setShowContractDocModal(true);
  };

  const totalCompensationSum = gpmbItems.reduce((acc, i) => acc + safeNumber(i.totalCompensation), 0);
  const totalContractValSum = contractItems.reduce((acc, c) => acc + safeNumber(c.contractValue), 0);

  return (
    <div className="space-y-6">
      {/* 3 Main Action Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-xl border">
        <button
          onClick={() => setActiveTab('gpmb')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'gpmb' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <MapPin className="w-4 h-4" /> SUB-MODULE 1: GIẢI PHÓNG MẶT BẰNG & TÁI ĐỊNH CƯ
        </button>

        <button
          onClick={() => setActiveTab('khlcnt')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'khlcnt' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-4 h-4" /> SUB-MODULE 2: KẾ HOẠCH & TỔ CHỨC ĐẤU THẦU (LCNT)
        </button>

        <button
          onClick={() => setActiveTab('contract')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'contract' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" /> SUB-MODULE 3: QUẢN LÝ HỢP ĐỒNG & PHỤ LỤC (QĐ 1040)
        </button>
      </div>

      {/* SUB-MODULE 1: GIẢI PHÓNG MẶT BẰNG & TÁI ĐỊNH CƯ */}
      {activeTab === 'gpmb' && currentProject && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  DANH SÁCH HỘ GIA ĐÌNH & TỔ CHỨC THU HỒI ĐẤT / GPMB
                </h3>
                <p className="text-xs text-slate-500">Quản lý kiểm đếm, phương án bồi thường tái định cư & bàn giao mặt bằng sạch</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate('GPMB')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all border border-slate-300 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-blue-600" /> Tải Template GPMB
                </button>

                <button
                  onClick={() => handleOpenExcelImport('GPMB')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> Upload Excel Kiểm Đếm GPMB
                </button>

                <button
                  onClick={handleSaveGpmbAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Lưu Dữ Liệu GPMB
                </button>
              </div>
            </div>

            {/* Table GPMB with Action Column */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Mã Hộ</th>
                    <th className="px-3 py-2.5">Họ Và Tên Chủ Hộ / Đại Diện</th>
                    <th className="px-3 py-2.5">Tờ Bản Đồ / Số Thửa</th>
                    <th className="px-3 py-2.5 text-right">Diện Tích Thu Hồi (m2)</th>
                    <th className="px-3 py-2.5 text-right">Đơn Giá Bồi Thường (VND/m2)</th>
                    <th className="px-3 py-2.5 text-right">Tổng Đền Bù (VND)</th>
                    <th className="px-3 py-2.5 text-center">Trạng Thái GPMB</th>
                    <th className="px-3 py-2.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {gpmbItems.map(item => {
                    const isEditing = editingHouseholdId === item.householdId;
                    return (
                      <tr key={item.householdId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-blue-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftHousehold.householdId || ''}
                              onChange={e => setDraftHousehold({ ...draftHousehold, householdId: e.target.value })}
                              className="w-20 px-1.5 py-0.5 border rounded font-mono"
                            />
                          ) : (
                            item.householdId
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftHousehold.ownerName || ''}
                              onChange={e => setDraftHousehold({ ...draftHousehold, ownerName: e.target.value })}
                              className="w-full px-1.5 py-0.5 border rounded"
                            />
                          ) : (
                            item.ownerName
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftHousehold.mapPlotNo || ''}
                              onChange={e => setDraftHousehold({ ...draftHousehold, mapPlotNo: e.target.value })}
                              className="w-28 px-1.5 py-0.5 border rounded"
                            />
                          ) : (
                            item.mapPlotNo
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draftHousehold.recoveredArea || 0}
                              onChange={e => setDraftHousehold({ ...draftHousehold, recoveredArea: Number(e.target.value) || 0 })}
                              className="w-20 px-1.5 py-0.5 border rounded text-right font-mono"
                            />
                          ) : (
                            item.recoveredArea.toLocaleString('vi-VN')
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draftHousehold.unitPrice || 0}
                              onChange={e => setDraftHousehold({ ...draftHousehold, unitPrice: Number(e.target.value) || 0 })}
                              className="w-28 px-1.5 py-0.5 border rounded text-right font-mono"
                            />
                          ) : (
                            formatVND(item.unitPrice)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                          {isEditing ? (
                            formatVND((safeNumber(draftHousehold.recoveredArea) * safeNumber(draftHousehold.unitPrice)))
                          ) : (
                            formatVND(item.recoveredArea * item.unitPrice)
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <select
                              value={draftHousehold.status || GpmbStatus.CHO_KIEM_DEM}
                              onChange={e => setDraftHousehold({ ...draftHousehold, status: e.target.value as any })}
                              className="px-1.5 py-0.5 border rounded text-[11px] font-bold"
                            >
                              <option value={GpmbStatus.CHO_KIEM_DEM}>CHỜ_KIỂM_ĐẾM</option>
                              <option value={GpmbStatus.DA_PHE_DUYET_PA}>ĐÃ_PHÊ_DUYỆT_PA</option>
                              <option value={GpmbStatus.DA_CHI_TRA}>ĐÃ_CHI_TRẢ</option>
                              <option value={GpmbStatus.DA_BAN_GIAO_MAT_BANG}>ĐÃ_BÀN_GIAO_MẶT_BẰNG</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                              item.status === GpmbStatus.DA_BAN_GIAO_MAT_BANG ? 'bg-emerald-100 text-emerald-800' :
                              item.status === GpmbStatus.DA_CHI_TRA ? 'bg-blue-100 text-blue-800' :
                              item.status === GpmbStatus.DA_PHE_DUYET_PA ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.status}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button onClick={() => handleSaveGpmbRow(item.householdId)} className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"><Check className="w-4 h-4" /></button>
                              <button onClick={handleCancelGpmbEdit} className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleEditGpmbHousehold(item)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteGpmbItem(item)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add New Household Button */}
            <button
              onClick={handleAddNewGpmbRow}
              className="w-full bg-slate-50 hover:bg-blue-50/60 text-blue-700 border-2 border-dashed border-blue-200 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> [+ THÊM HỘ DÂN KIỂM ĐẾM GPMB MỚI]
            </button>

            {/* GPMB Compensation Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
              <span>TỔNG KINH PHÍ BỒI THƯỜNG GPMB DỰ KIẾN:</span>
              <span className="font-mono text-sm text-emerald-700">{formatVND(totalCompensationSum)}</span>
            </div>
          </div>

          {/* Document Matrix Step 1 */}
          <Stage3DocumentUploader
            projectId={currentProject.PROJECT_ID}
            stepId={1}
            stepName={STAGE3_DOCUMENT_TYPES[0].stepName}
            requiredDocs={STAGE3_DOCUMENT_TYPES[0].requiredDocs}
            uploadedDocs={currentProject.DOCUMENT_MATRIX_GDA3 || []}
            onUploadSuccess={refreshProjectData}
          />
        </div>
      )}

      {/* SUB-MODULE 2: KẾ HOẠCH & TỔ CHỨC ĐẤU THẦU (LCNT) */}
      {activeTab === 'khlcnt' && currentProject && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  KẾ HOẠCH LỰA CHỌN NHÀ THẦU & KẾT QUẢ ĐẤU THẦU
                </h3>
                <p className="text-xs text-slate-500">Tự động tính toán Tỷ lệ tiết kiệm (%) = (1 - Giá trúng thầu / Giá gói thầu) * 100</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate('KHLCNT')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all border border-slate-300 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-blue-600" /> Tải Template KHLCNT
                </button>

                <button
                  onClick={() => handleOpenExcelImport('KHLCNT')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> Upload Excel KHLCNT
                </button>

                <button
                  onClick={handleSaveKhlcntAll}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Lưu KHLCNT
                </button>
              </div>
            </div>

            {/* Table KHLCNT with Action Column */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Mã Gói</th>
                    <th className="px-3 py-2.5">Tên Gói Thầu Chi Tiết</th>
                    <th className="px-3 py-2.5 text-right">Giá Gói Thầu (VND)</th>
                    <th className="px-3 py-2.5">Hình Thức LCNT</th>
                    <th className="px-3 py-2.5">Nhà Thầu Trúng Thầu</th>
                    <th className="px-3 py-2.5 text-right">Giá Trúng Thầu (VND)</th>
                    <th className="px-3 py-2.5 text-center">Tiết Kiệm (%)</th>
                    <th className="px-3 py-2.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {khlcntItems.map(pkg => {
                    const isEditing = editingPackageId === pkg.packageId;
                    return (
                      <tr key={pkg.packageId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-blue-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftPackage.packageId || ''}
                              onChange={e => setDraftPackage({ ...draftPackage, packageId: e.target.value })}
                              className="w-16 px-1.5 py-0.5 border rounded font-mono"
                            />
                          ) : (
                            pkg.packageId
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftPackage.packageName || ''}
                              onChange={e => setDraftPackage({ ...draftPackage, packageName: e.target.value })}
                              className="w-full px-1.5 py-0.5 border rounded"
                            />
                          ) : (
                            pkg.packageName
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draftPackage.packagePrice || 0}
                              onChange={e => setDraftPackage({ ...draftPackage, packagePrice: Number(e.target.value) || 0 })}
                              className="w-28 px-1.5 py-0.5 border rounded text-right font-mono"
                            />
                          ) : (
                            formatVND(pkg.packagePrice)
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold">
                          {isEditing ? (
                            <select
                              value={draftPackage.procurementMethod || ProcurementMethod.DAU_THAU_RONG_RAI}
                              onChange={e => setDraftPackage({ ...draftPackage, procurementMethod: e.target.value as any })}
                              className="px-1.5 py-0.5 border rounded text-[11px]"
                            >
                              <option value={ProcurementMethod.DAU_THAU_RONG_RAI}>Đấu thầu rộng rãi</option>
                              <option value={ProcurementMethod.CHI_DINH_THAU_RUT_GON}>Chỉ định thầu rút gọn</option>
                              <option value={ProcurementMethod.CHI_DINH_THAU_THONG_THUONG}>Chỉ định thầu thông thường</option>
                              <option value={ProcurementMethod.CHAO_HANG_CANH_TRANH}>Chào hàng cạnh tranh</option>
                            </select>
                          ) : (
                            pkg.procurementMethod
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-blue-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftPackage.winningContractor || ''}
                              onChange={e => setDraftPackage({ ...draftPackage, winningContractor: e.target.value })}
                              className="w-full px-1.5 py-0.5 border rounded"
                              placeholder="Tên nhà thầu..."
                            />
                          ) : (
                            pkg.winningContractor || '-'
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draftPackage.winningPrice || 0}
                              onChange={e => setDraftPackage({ ...draftPackage, winningPrice: Number(e.target.value) || 0 })}
                              className="w-28 px-1.5 py-0.5 border rounded text-right font-mono"
                            />
                          ) : (
                            pkg.winningPrice ? formatVND(pkg.winningPrice) : '-'
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-purple-700">
                          {pkg.savingsPct ? `${pkg.savingsPct}%` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button onClick={() => handleSaveKhlcntRow(pkg.packageId)} className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"><Check className="w-4 h-4" /></button>
                              <button onClick={handleCancelKhlcntEdit} className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleEditKhlcntPackage(pkg)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteKhlcntItem(pkg)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add New Package Button */}
            <button
              onClick={handleAddNewKhlcntRow}
              className="w-full bg-slate-50 hover:bg-emerald-50/60 text-emerald-700 border-2 border-dashed border-emerald-300 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> [+ THÊM GÓI THẦU KHLCNT MỚI]
            </button>
          </div>

          {/* Document Matrix Step 2 */}
          <Stage3DocumentUploader
            projectId={currentProject.PROJECT_ID}
            stepId={2}
            stepName={STAGE3_DOCUMENT_TYPES[1].stepName}
            requiredDocs={STAGE3_DOCUMENT_TYPES[1].requiredDocs}
            uploadedDocs={currentProject.DOCUMENT_MATRIX_GDA3 || []}
            onUploadSuccess={refreshProjectData}
          />
        </div>
      )}

      {/* SUB-MODULE 3: QUẢN LÝ HỢP ĐỒNG & PHỤ LỤC (QĐ 1040 / NĐ 210) */}
      {activeTab === 'contract' && currentProject && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* New Contract Setup Form */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="w-5 h-5 text-blue-600" />
                CẬP NHẬT KẾT QUẢ ĐẤU THẦU & SINH HỢP ĐỒNG MẪU (QĐ 1040/QĐ-BXD)
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tên Gói Thầu</label>
                  <input
                    type="text"
                    value={newContractName}
                    onChange={e => setNewContractName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Số Hợp Đồng</label>
                    <input
                      type="text"
                      value={newContractNo}
                      onChange={e => setNewContractNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Tên Nhà Thầu Trúng Thầu</label>
                    <input
                      type="text"
                      value={newContractorName}
                      onChange={e => setNewContractorName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Loại Hợp Đồng</label>
                    <select
                      value={newContractType}
                      onChange={e => setNewContractType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold"
                    >
                      <option value={ContractType.DON_GIA_DIEU_CHINH}>Hợp đồng Đơn giá điều chỉnh</option>
                      <option value={ContractType.DON_GIA_CO_DINH}>Hợp đồng Đơn giá cố định</option>
                      <option value={ContractType.TRON_GOI}>Hợp đồng Trọn gói</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Giá Trị Trúng Thầu (VND)</label>
                    <input
                      type="number"
                      value={newContractValue}
                      onChange={e => setNewContractValue(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Tỷ Lệ Tạm Ứng (%)</label>
                    <input
                      type="number"
                      value={newAdvancePct}
                      onChange={e => setNewAdvancePct(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Capability Assessment Badge */}
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-900 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="font-bold">ĐÁNH GIÁ NĂNG LỰC NHÀ THẦU TỰ ĐỘNG (CSDL BXD)</div>
                      <div className="text-[11px] text-emerald-800">Nhà thầu đạt Chứng chỉ Năng lực Hạng I - Đáp ứng dự án Cấp I</div>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-extrabold bg-white px-3 py-1 rounded-lg border border-emerald-300 text-emerald-700">
                    95/100 ĐIỂM
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateContractSample}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4 text-blue-600" /> Xuất Hợp Đồng Mẫu QĐ 1040
                  </button>

                  <button
                    type="button"
                    onClick={handleAddNewContract}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Ký Kết Hợp Đồng Trúng Thầu
                  </button>
                </div>
              </div>
            </div>

            {/* Signed Contracts Side Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                DANH SÁCH HỢP ĐỒNG ĐÃ KÝ KẾT
              </h3>

              <div className="space-y-3">
                {contractItems.map(c => (
                  <div key={c.contractId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-blue-700">{c.contractNo}</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                        {c.contractType}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{c.contractName}</div>
                    <div className="text-[11px] text-slate-600">Nhà thầu: {c.contractorName}</div>
                    <div className="text-xs font-mono font-extrabold text-emerald-700">
                      Giá trị: {formatVND(c.contractValue)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Document Matrix Step 3 */}
          <Stage3DocumentUploader
            projectId={currentProject.PROJECT_ID}
            stepId={3}
            stepName={STAGE3_DOCUMENT_TYPES[2].stepName}
            requiredDocs={STAGE3_DOCUMENT_TYPES[2].requiredDocs}
            uploadedDocs={currentProject.DOCUMENT_MATRIX_GDA3 || []}
            onUploadSuccess={refreshProjectData}
          />
        </div>
      )}

      {/* Contract Document Sample Modal */}
      {showContractDocModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                HỢP ĐỒNG THI CÔNG MẪU CHUẨN QĐ 1040/QĐ-BXD & NĐ 210/2026/NĐ-CP
              </h3>
              <button onClick={() => setShowContractDocModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-800 whitespace-pre-wrap bg-slate-50 flex-1 border-b">
              {sampleContractText}
            </div>
            <div className="p-4 bg-white flex justify-end gap-3">
              <button
                onClick={() => setShowContractDocModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Drag-and-Drop Modal */}
      {currentProject && (
        <ExcelDragDropUploader
          projectId={currentProject.PROJECT_ID}
          schemaType={excelSchemaType}
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          onImportSuccess={refreshProjectData}
        />
      )}
    </div>
  );
}
