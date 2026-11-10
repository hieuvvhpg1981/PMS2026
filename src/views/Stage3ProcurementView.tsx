import React, { useState, useEffect } from 'react';
import { PmsService, ProjectData, SiteClearanceRecord, ProcurementPackageRecord, ContractManagementRecord } from '../pms/T2_Services';
import { PmsHandlers } from '../pms/T3_Handlers';
import { ProcurementMethod, ContractType, GpmbStatus, STAGE3_DOCUMENT_TYPES, CONTRACT_TEMPLATES_210, CapabilityGrade } from '../pms/T0_Config';
import { formatVND, safeNumber, safeString, calculateBiddingSavings, generateExcelTemplate, canEditProject, validateContractorAndCchn212, calculateIpcNetPayment210, formatCurrencyInputMask, parseCurrencyInputMask, formatStatusOrCodeVN } from '../pms/T1_Utils';
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

  // New Contract Form State (NĐ 210/2026 & NĐ 212/2026)
  const [newContractNo, setNewContractNo] = useState<string>('01/2026/HĐ-XL');
  const [newTemplateCode, setNewTemplateCode] = useState<string>('MẪU-01/210-BXD');
  const [newContractName, setNewContractName] = useState<string>('Gói thầu số 01: Thi công XL Cầu & Đường dẫn');
  const [newContractorName, setNewContractorName] = useState<string>('Tập đoàn Xây dựng Đèo Cả - Vinaconex');
  const [newContractType, setNewContractType] = useState<ContractType>(ContractType.DON_GIA_DIEU_CHINH);
  const [newContractValue, setNewContractValue] = useState<number>(880000000000);
  const [newAdvancePct, setNewAdvancePct] = useState<number>(20);
  const [newRetentionPct, setNewRetentionPct] = useState<number>(5);
  const [newPerformanceBondPct, setNewPerformanceBondPct] = useState<number>(10);
  const [newPriceAdjustmentPn, setNewPriceAdjustmentPn] = useState<number>(1.02);
  const [newPenaltyAmount, setNewPenaltyAmount] = useState<number>(0);

  // Contractor Capability & CCHN Validation State (NĐ 212/2026)
  const [contractorCertGrade, setContractorCertGrade] = useState<string>(CapabilityGrade.HANG_I);
  const [contractorCertExpiry, setContractorCertExpiry] = useState<string>('2030-12-31');
  const [commanderCchnGrade, setCommanderCchnGrade] = useState<string>(CapabilityGrade.HANG_I);
  const [commanderCchnExpiry, setCommanderCchnExpiry] = useState<string>('2029-10-15');

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
  const capabilityCheck212 = validateContractorAndCchn212(
    currentProject?.CAP_CONG_TRINH || 'CẤP I',
    contractorCertGrade,
    contractorCertExpiry,
    commanderCchnGrade,
    commanderCchnExpiry
  );

  const ipcPreview210 = calculateIpcNetPayment210(
    safeNumber(newContractValue) * 0.25, // Giả lập kỳ nghiệm thu IPC = 25% HĐ
    safeNumber(newAdvancePct),
    safeNumber(newRetentionPct),
    safeNumber(newPenaltyAmount),
    safeNumber(newPriceAdjustmentPn)
  );

  const handleAddNewContract = () => {
    if (!currentProject) return;
    if (!capabilityCheck212.isQualified) {
      toast.error(capabilityCheck212.message);
      return;
    }

    const newContract: ContractManagementRecord = {
      contractId: `HD-${Date.now().toString().slice(-4)}`,
      packageId: khlcntItems[0]?.packageId || 'GT-01',
      contractNo: newContractNo,
      templateCode: newTemplateCode,
      contractName: newContractName,
      contractorName: newContractorName,
      contractType: newContractType,
      contractValue: safeNumber(newContractValue),
      performanceBondPct: safeNumber(newPerformanceBondPct),
      advancePct: safeNumber(newAdvancePct),
      retentionPct: safeNumber(newRetentionPct),
      priceAdjustmentFactorPn: safeNumber(newPriceAdjustmentPn),
      penaltyAmountVnd: safeNumber(newPenaltyAmount),
      signDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2027-12-31',
      status: 'ĐANG_THỰC_HIỆN'
    };

    const updatedContracts = [...contractItems, newContract];
    const res = PmsHandlers.stage3ContractApi(currentProject.PROJECT_ID, updatedContracts);
    if (res.success) {
      toast.success(`Đã ký kết và khởi tạo hợp đồng số [${newContractNo}] chuẩn NĐ 210/2026/NĐ-CP!`);
      refreshProjectData();
    }
  };

  const handleGenerateContractSample = () => {
    if (!currentProject) return;
    const dummyContract: ContractManagementRecord = {
      contractId: 'HD-SAMPLE',
      packageId: 'GT-01',
      contractNo: newContractNo,
      templateCode: newTemplateCode,
      contractName: newContractName,
      contractorName: newContractorName,
      contractType: newContractType,
      contractValue: safeNumber(newContractValue),
      performanceBondPct: safeNumber(newPerformanceBondPct),
      advancePct: safeNumber(newAdvancePct),
      retentionPct: safeNumber(newRetentionPct),
      priceAdjustmentFactorPn: safeNumber(newPriceAdjustmentPn),
      penaltyAmountVnd: safeNumber(newPenaltyAmount),
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
      <div className="flex border-b border-slate-200 bg-white p-1.5 rounded-xl border gap-1.5">
        <button
          onClick={() => setActiveTab('gpmb')}
          className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'gpmb'
              ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600 font-semibold'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <MapPin className="w-4 h-4" /> 1. Giải phóng mặt bằng & tái định cư
        </button>

        <button
          onClick={() => setActiveTab('khlcnt')}
          className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'khlcnt'
              ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600 font-semibold'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Briefcase className="w-4 h-4" /> 2. Kế hoạch & tổ chức đấu thầu (LCNT)
        </button>

        <button
          onClick={() => setActiveTab('contract')}
          className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'contract'
              ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600 font-semibold'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-4 h-4" /> 3. Quản lý hợp đồng & phụ lục (QĐ 1040)
        </button>
      </div>

      {/* SUB-MODULE 1: GIẢI PHÓNG MẶT BẰNG & TÁI ĐỊNH CƯ */}
      {activeTab === 'gpmb' && currentProject && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Danh sách hộ gia đình & tổ chức thu hồi đất / GPMB
                </h3>
                <p className="text-xs text-slate-500">Quản lý kiểm đếm, phương án bồi thường tái định cư & bàn giao mặt bằng sạch</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate('GPMB')}
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-4 h-4 text-slate-600" /> Tải Template GPMB
                </button>

                <button
                  onClick={() => handleOpenExcelImport('GPMB')}
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Upload className="w-4 h-4 text-slate-600" /> Upload Excel kiểm đếm GPMB
                </button>

                <button
                  onClick={handleSaveGpmbAll}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Lưu dữ liệu GPMB
                </button>
              </div>
            </div>

            {/* Table GPMB with Action Column */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Mã hộ</th>
                    <th className="px-3 py-2.5">Họ và tên chủ hộ / Đại diện</th>
                    <th className="px-3 py-2.5">Tờ bản đồ / Số thửa</th>
                    <th className="px-3 py-2.5 text-right">Diện tích thu hồi (m²)</th>
                    <th className="px-3 py-2.5 text-right">Đơn giá bồi thường (VNĐ/m²)</th>
                    <th className="px-3 py-2.5 text-right">Tổng đền bù (VNĐ)</th>
                    <th className="px-3 py-2.5 text-center">Trạng thái GPMB</th>
                    <th className="px-3 py-2.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {gpmbItems.map(item => {
                    const isEditing = editingHouseholdId === item.householdId;
                    return (
                      <tr key={item.householdId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono tabular-nums font-bold text-indigo-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftHousehold.householdId || ''}
                              onChange={e => setDraftHousehold({ ...draftHousehold, householdId: e.target.value })}
                              className="w-20 px-1.5 py-0.5 border rounded font-mono tabular-nums"
                            />
                          ) : (
                            item.householdId
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
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
                        <td className="px-3 py-2 text-slate-700 font-mono tabular-nums">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftHousehold.mapPlotNo || ''}
                              onChange={e => setDraftHousehold({ ...draftHousehold, mapPlotNo: e.target.value })}
                              className="w-28 px-1.5 py-0.5 border rounded font-mono tabular-nums"
                            />
                          ) : (
                            item.mapPlotNo
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums font-bold">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draftHousehold.recoveredArea || 0}
                              onChange={e => setDraftHousehold({ ...draftHousehold, recoveredArea: Number(e.target.value) || 0 })}
                              className="w-20 px-1.5 py-0.5 border rounded text-right font-mono tabular-nums"
                            />
                          ) : (
                            item.recoveredArea.toLocaleString('vi-VN')
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatCurrencyInputMask(draftHousehold.unitPrice || 0)}
                              onChange={e => setDraftHousehold({ ...draftHousehold, unitPrice: parseCurrencyInputMask(e.target.value) })}
                              className="w-32 px-1.5 py-0.5 border rounded text-right font-mono tabular-nums"
                            />
                          ) : (
                            formatVND(item.unitPrice)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-emerald-700">
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
                              className="px-1.5 py-0.5 border rounded text-[11px] font-semibold"
                            >
                              <option value={GpmbStatus.CHO_KIEM_DEM}>{formatStatusOrCodeVN(GpmbStatus.CHO_KIEM_DEM)}</option>
                              <option value={GpmbStatus.DA_PHE_DUYET_PA}>{formatStatusOrCodeVN(GpmbStatus.DA_PHE_DUYET_PA)}</option>
                              <option value={GpmbStatus.DA_CHI_TRA}>{formatStatusOrCodeVN(GpmbStatus.DA_CHI_TRA)}</option>
                              <option value={GpmbStatus.DA_BAN_GIAO_MAT_BANG}>{formatStatusOrCodeVN(GpmbStatus.DA_BAN_GIAO_MAT_BANG)}</option>
                            </select>
                          ) : (
                            <span className={`px-2.5 py-0.5 rounded-full font-semibold text-[11px] ${
                              item.status === GpmbStatus.DA_BAN_GIAO_MAT_BANG ? 'bg-emerald-100 text-emerald-800' :
                              item.status === GpmbStatus.DA_CHI_TRA ? 'bg-indigo-100 text-indigo-800' :
                              item.status === GpmbStatus.DA_PHE_DUYET_PA ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {formatStatusOrCodeVN(item.status)}
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
                              <button onClick={() => handleEditGpmbHousehold(item)} className="text-indigo-600 hover:text-indigo-800 p-1"><Pencil className="w-4 h-4" /></button>
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
              className="w-full bg-slate-50 hover:bg-indigo-50/60 text-indigo-700 border-2 border-dashed border-indigo-200 font-semibold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Thêm hộ dân kiểm đếm GPMB mới
            </button>

            {/* GPMB Compensation Summary */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center text-xs font-bold text-slate-800">
              <span>Tổng kinh phí bồi thường GPMB dự kiến:</span>
              <span className="font-mono tabular-nums text-sm text-emerald-700">{formatVND(totalCompensationSum)}</span>
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
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Kế hoạch lựa chọn nhà thầu & kết quả đấu thầu
                </h3>
                <p className="text-xs text-slate-500">Tự động tính toán tỷ lệ tiết kiệm (%) = (1 - Giá trúng thầu / Giá gói thầu) * 100</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate('KHLCNT')}
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-4 h-4 text-slate-600" /> Tải Template KHLCNT
                </button>

                <button
                  onClick={() => handleOpenExcelImport('KHLCNT')}
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Upload className="w-4 h-4 text-slate-600" /> Upload Excel KHLCNT
                </button>

                <button
                  onClick={handleSaveKhlcntAll}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Lưu KHLCNT
                </button>
              </div>
            </div>

            {/* Table KHLCNT with Action Column */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Mã gói</th>
                    <th className="px-3 py-2.5">Tên gói thầu chi tiết</th>
                    <th className="px-3 py-2.5 text-right">Giá gói thầu (VNĐ)</th>
                    <th className="px-3 py-2.5">Hình thức LCNT</th>
                    <th className="px-3 py-2.5">Nhà thầu trúng thầu</th>
                    <th className="px-3 py-2.5 text-right">Giá trúng thầu (VNĐ)</th>
                    <th className="px-3 py-2.5 text-center">Tiết kiệm (%)</th>
                    <th className="px-3 py-2.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {khlcntItems.map(pkg => {
                    const isEditing = editingPackageId === pkg.packageId;
                    return (
                      <tr key={pkg.packageId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono tabular-nums font-bold text-indigo-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftPackage.packageId || ''}
                              onChange={e => setDraftPackage({ ...draftPackage, packageId: e.target.value })}
                              className="w-16 px-1.5 py-0.5 border rounded font-mono tabular-nums"
                            />
                          ) : (
                            pkg.packageId
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
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
                        <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatCurrencyInputMask(draftPackage.packagePrice || 0)}
                              onChange={e => setDraftPackage({ ...draftPackage, packagePrice: parseCurrencyInputMask(e.target.value) })}
                              className="w-32 px-1.5 py-0.5 border rounded text-right font-mono tabular-nums"
                            />
                          ) : (
                            formatVND(pkg.packagePrice)
                          )}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-700">
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
                            formatStatusOrCodeVN(pkg.procurementMethod)
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold text-indigo-950">
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
                        <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-emerald-700">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatCurrencyInputMask(draftPackage.winningPrice || 0)}
                              onChange={e => setDraftPackage({ ...draftPackage, winningPrice: parseCurrencyInputMask(e.target.value) })}
                              className="w-32 px-1.5 py-0.5 border rounded text-right font-mono tabular-nums"
                            />
                          ) : (
                            pkg.winningPrice ? formatVND(pkg.winningPrice) : '-'
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-mono tabular-nums font-bold text-purple-700">
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
                              <button onClick={() => handleEditKhlcntPackage(pkg)} className="text-indigo-600 hover:text-indigo-800 p-1"><Pencil className="w-4 h-4" /></button>
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
              className="w-full bg-slate-50 hover:bg-indigo-50/60 text-indigo-700 border-2 border-dashed border-indigo-200 font-semibold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" /> Thêm gói thầu KHLCNT mới
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
                <FileText className="w-5 h-5 text-indigo-600" />
                Cập nhật kết quả đấu thầu & sinh hợp đồng mẫu (NĐ 210/2026/NĐ-CP & QĐ 1040/QĐ-BXD)
              </h3>

              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Biểu mẫu hợp đồng chuẩn (NĐ 210/2026)</label>
                    <select
                      value={newTemplateCode}
                      onChange={e => setNewTemplateCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-indigo-50/40 outline-none font-semibold text-indigo-950 text-sm"
                    >
                      {CONTRACT_TEMPLATES_210.map(tpl => (
                        <option key={tpl.code} value={tpl.code}>
                          [{tpl.code}] {tpl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên gói thầu</label>
                    <input
                      type="text"
                      value={newContractName}
                      onChange={e => setNewContractName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số hợp đồng</label>
                    <input
                      type="text"
                      value={newContractNo}
                      onChange={e => setNewContractNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono tabular-nums font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên nhà thầu trúng thầu</label>
                    <input
                      type="text"
                      value={newContractorName}
                      onChange={e => setNewContractorName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Loại hợp đồng (NĐ 210/2026)</label>
                    <select
                      value={newContractType}
                      onChange={e => setNewContractType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold text-sm"
                    >
                      <option value={ContractType.DON_GIA_DIEU_CHINH}>Hợp đồng đơn giá điều chỉnh</option>
                      <option value={ContractType.DON_GIA_CO_DINH}>Hợp đồng đơn giá cố định</option>
                      <option value={ContractType.TRON_GOI}>Hợp đồng trọn gói</option>
                      <option value={ContractType.THEO_THOI_GIAN}>Hợp đồng theo thời gian</option>
                      <option value={ContractType.HOP_DONG_KET_HOP}>Hợp đồng kết hợp</option>
                      <option value={ContractType.HOP_DONG_EPC}>Hợp đồng tổng thầu EPC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị trúng thầu (VNĐ)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatCurrencyInputMask(newContractValue)}
                      onChange={e => setNewContractValue(parseCurrencyInputMask(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono tabular-nums font-bold text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tỷ lệ tạm ứng (%)</label>
                    <input
                      type="number"
                      value={newAdvancePct}
                      onChange={e => setNewAdvancePct(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-mono tabular-nums text-sm"
                    />
                  </div>
                </div>

                {/* NĐ 210/2026 Extended Parameters: Performance Bond, Retention, Pn, Penalty */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bảo lãnh THHĐ (%)</label>
                    <input
                      type="number"
                      value={newPerformanceBondPct}
                      onChange={e => setNewPerformanceBondPct(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Giữ lại bảo hành (%)</label>
                    <input
                      type="number"
                      value={newRetentionPct}
                      onChange={e => setNewRetentionPct(Number(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono tabular-nums font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Hệ số điều chỉnh giá (Pn)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPriceAdjustmentPn}
                      onChange={e => setNewPriceAdjustmentPn(Number(e.target.value) || 1)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono tabular-nums font-bold text-indigo-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phạt vi phạm HĐ (VNĐ)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatCurrencyInputMask(newPenaltyAmount)}
                      onChange={e => setNewPenaltyAmount(parseCurrencyInputMask(e.target.value))}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono tabular-nums font-bold text-red-600"
                    />
                  </div>
                </div>

                {/* NĐ 212/2026 Contractor Capability & CCHN Inputs */}
                <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3">
                  <div className="font-bold text-indigo-950 flex items-center justify-between">
                    <span>Kiểm tra điều kiện năng lực nhà thầu & CCHN chỉ huy trưởng (NĐ 212/2026/NĐ-CP)</span>
                    <span className="text-[11px] font-semibold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                      Công trình: {formatStatusOrCodeVN(currentProject.CAP_CONG_TRINH)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hạng CCNL tổ chức</label>
                      <select
                        value={contractorCertGrade}
                        onChange={e => setContractorCertGrade(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                      >
                        <option value={CapabilityGrade.HANG_I}>{CapabilityGrade.HANG_I}</option>
                        <option value={CapabilityGrade.HANG_II}>{CapabilityGrade.HANG_II}</option>
                        <option value={CapabilityGrade.HANG_III}>{CapabilityGrade.HANG_III}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hạn CCNL tổ chức</label>
                      <input
                        type="date"
                        value={contractorCertExpiry}
                        onChange={e => setContractorCertExpiry(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hạng CCHN chỉ huy trưởng</label>
                      <select
                        value={commanderCchnGrade}
                        onChange={e => setCommanderCchnGrade(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-semibold"
                      >
                        <option value={CapabilityGrade.HANG_I}>{CapabilityGrade.HANG_I}</option>
                        <option value={CapabilityGrade.HANG_II}>{CapabilityGrade.HANG_II}</option>
                        <option value={CapabilityGrade.HANG_III}>{CapabilityGrade.HANG_III}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Hạn CCHN chỉ huy trưởng</label>
                      <input
                        type="date"
                        value={commanderCchnExpiry}
                        onChange={e => setCommanderCchnExpiry(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white font-mono tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Capability Assessment Dynamic Badge */}
                <div className={`p-3.5 rounded-xl border flex justify-between items-center ${
                  capabilityCheck212.isQualified
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}>
                  <div className="flex items-center gap-2">
                    <Award className={`w-5 h-5 ${capabilityCheck212.isQualified ? 'text-emerald-600' : 'text-red-600'}`} />
                    <div>
                      <div className="font-bold">Đánh giá năng lực nhà thầu & CCHN tự động (CSDL BXD - NĐ 212/2026)</div>
                      <div className="text-[11px]">{capabilityCheck212.message}</div>
                    </div>
                  </div>
                  <span className={`font-semibold text-xs bg-white px-3 py-1 rounded-lg border ${
                    capabilityCheck212.isQualified ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-700'
                  }`}>
                    {capabilityCheck212.isQualified ? 'Đạt năng lực' : 'Chặn ký HĐ'}
                  </span>
                </div>

                {/* Live IPC Calculation Preview per NĐ 210/2026 */}
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2">
                  <div className="text-xs font-bold text-sky-400 flex justify-between">
                    <span>Mô phỏng tính toán kỳ thanh toán IPC (Giả định khối lượng đợt = 25% HĐ - NĐ 210/2026)</span>
                    <span className="font-mono tabular-nums">Pn = {newPriceAdjustmentPn}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                    <div className="bg-slate-800 p-2.5 rounded-lg">
                      <div className="text-slate-300">Giá trị sau điều chỉnh Pn</div>
                      <div className="font-mono tabular-nums font-bold text-white mt-0.5">{formatVND(ipcPreview210.adjustedGrossAmount)}</div>
                    </div>
                    <div className="bg-slate-800 p-2.5 rounded-lg">
                      <div className="text-slate-300 tabular-nums">Thu hồi tạm ứng ({newAdvancePct}%)</div>
                      <div className="font-mono tabular-nums font-bold text-amber-300 mt-0.5">-{formatVND(ipcPreview210.advanceRecoveryAmount)}</div>
                    </div>
                    <div className="bg-slate-800 p-2.5 rounded-lg">
                      <div className="text-slate-300 tabular-nums">Giữ lại bảo hành ({newRetentionPct}%)</div>
                      <div className="font-mono tabular-nums font-bold text-purple-300 mt-0.5">-{formatVND(ipcPreview210.retentionWarrantyAmount)}</div>
                    </div>
                    <div className="bg-emerald-950/80 border border-emerald-700 p-2.5 rounded-lg">
                      <div className="text-emerald-300">Thực nhận giải ngân (Net IPC)</div>
                      <div className="font-mono tabular-nums font-extrabold text-emerald-400 mt-0.5">{formatVND(ipcPreview210.netPayableAmount)}</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleGenerateContractSample}
                    className="flex-1 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium py-2.5 rounded-xl border border-slate-300 transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <Download className="w-4 h-4 text-slate-600" /> Xuất hợp đồng mẫu QĐ 1040 / NĐ 210
                  </button>

                  <button
                    type="button"
                    onClick={handleAddNewContract}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" /> Ký kết hợp đồng trúng thầu
                  </button>
                </div>
              </div>
            </div>

            {/* Signed Contracts Side Panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Danh sách hợp đồng đã ký kết
              </h3>

              <div className="space-y-3">
                {contractItems.map(c => (
                  <div key={c.contractId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono tabular-nums font-bold text-indigo-700">{c.contractNo}</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold text-[11px]">
                        {formatStatusOrCodeVN(c.contractType)}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-900">{c.contractName}</div>
                    <div className="text-[11px] text-slate-600">Nhà thầu: {c.contractorName}</div>
                    {c.templateCode && (
                      <div className="text-[11px] font-mono tabular-nums text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block">
                        Mẫu: {c.templateCode} | Pn: {c.priceAdjustmentFactorPn ?? 1.0}
                      </div>
                    )}
                    <div className="text-xs font-mono tabular-nums font-extrabold text-emerald-700">
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
