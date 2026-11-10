import React, { useState, useEffect } from 'react';
import { PmsService, ProjectData, BoqItem, GanttTaskItem, InternalReviewRecord, ConstructionPermitRecord } from '../pms/T2_Services';
import { PmsHandlers } from '../pms/T3_Handlers';
import { DesignType, ApprovalStatus, STAGE2_DOCUMENT_TYPES } from '../pms/T0_Config';
import { formatVND, safeNumber, safeString, checkEstimateExceedsTMDT, generateExcelTemplate, updateBoqRow, canEditProject, evaluateCostOverrunRisk206, formatCurrencyInputMask, parseCurrencyInputMask, formatStatusOrCodeVN } from '../pms/T1_Utils';
import { UserProfile } from '../pms/T2_Services';
import Stage2DocumentUploader from '../components/Stage2DocumentUploader';
import ExcelDragDropUploader from '../components/ExcelDragDropUploader';
import {
  Calculator,
  AlertOctagon,
  CalendarDays,
  CheckCircle,
  Plus,
  Trash2,
  FileCheck2,
  ShieldCheck,
  UserCheck,
  Download,
  Upload,
  Pencil,
  Check,
  X,
  PlusCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function Stage2DesignCostView({ currentUser }: { currentUser?: UserProfile | null }) {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'plan' | 'boq' | 'approval'>('plan');

  // Excel Uploader Modal state
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [excelSchemaType, setExcelSchemaType] = useState<'GANTT' | 'BOQ'>('BOQ');

  // Tab 1 state: Plan & Gantt tasks
  const [ganttTasks, setGanttTasks] = useState<GanttTaskItem[]>([]);
  const [editingGanttTaskId, setEditingGanttTaskId] = useState<string | null>(null);
  const [draftGanttTask, setDraftGanttTask] = useState<Partial<GanttTaskItem>>({});

  // Tab 2 state: Design & BOQ
  const [designType, setDesignType] = useState<DesignType>(DesignType.THIET_KE_BVTC);
  const [consultingMode, setConsultingMode] = useState<'TỰ_THỰC_HIỆN' | 'THUÊ_TƯ_VẤN'>('THUÊ_TƯ_VẤN');
  const [consultantName, setConsultantName] = useState<string>('Tổng Công ty Tư vấn Thiết kế Giao thông Vận tải (TEDI)');
  const [boqItems, setBoqItems] = useState<BoqItem[]>([]);
  const [editingBoqItemId, setEditingBoqItemId] = useState<string | null>(null);
  const [draftBoqItem, setDraftBoqItem] = useState<Partial<BoqItem>>({});

  // BOQ Item Form input
  const [newItemCode, setNewItemCode] = useState('AF.11111');
  const [newItemName, setNewItemName] = useState('Đổ bê tông dầm mác M400');
  const [newItemUnit, setNewItemUnit] = useState('m3');
  const [newItemQty, setNewItemQty] = useState<number>(1000);
  const [newItemPrice, setNewItemPrice] = useState<number>(3200000);
  const [newItemCategory, setNewItemCategory] = useState<'XÂY_LẮP' | 'THIẾT_BỊ' | 'QUẢN_LÝ' | 'TƯ_VẤN' | 'KHIÊN_TỔN_DỰ_PHÒNG'>('XÂY_LẮP');

  // Tab 3 state: Approval, Review & Construction Permit Gate (NĐ 217/2026)
  const [reviewerDept, setReviewerDept] = useState<string>('Phòng Kế hoạch - Tài chính');
  const [reviewerName, setReviewerName] = useState<string>('Phạm Minh Đức (Trưởng phòng)');
  const [reviewStatus, setReviewStatus] = useState<ApprovalStatus>(ApprovalStatus.APPROVED);
  const [reviewComments, setReviewComments] = useState<string>('Dự toán BOQ và bản vẽ thiết kế đạt tiêu chuẩn chất lượng.');
  const [smartCaToken, setSmartCaToken] = useState<string>('SMARTCA-TOKEN-REVIEWER-2026');

  const [permitStatus, setPermitStatus] = useState<'THUỘC_DIỆN_MIỄN_GPXD' | 'ĐANG_XIN_CẤP_PHÉP_XD' | 'ĐÃ_CẤP_GIẤY_PHÉP_XD'>('THUỘC_DIỆN_MIỄN_GPXD');
  const [permitNo, setPermitNo] = useState<string>('GPXD-2026-0089/SXD');
  const [appraisalNoticeNo, setAppraisalNoticeNo] = useState<string>('158/CV-CQLHĐXD-BXD');
  const [exemptionLegalBasis, setExemptionLegalBasis] = useState<string>('Công trình thuộc dự án đầu tư công đã được CQCM về XD thẩm định Thiết kế triển khai sau TKCS (NĐ 217/2026/NĐ-CP)');

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
      setDesignType(currentProject.LOAI_THIET_KE || DesignType.THIET_KE_BVTC);
      setConsultingMode(currentProject.TU_THUC_HIEN_HAY_THUE_TU_VAN || 'THUÊ_TƯ_VẤN');
      setConsultantName(currentProject.TEN_DON_VI_TU_VAN || '');
      setBoqItems(currentProject.BOQ_ITEMS_GDA2 || []);
      if (currentProject.CONSTRUCTION_PERMIT_GDA2) {
        setPermitStatus(currentProject.CONSTRUCTION_PERMIT_GDA2.permitStatus);
        setPermitNo(currentProject.CONSTRUCTION_PERMIT_GDA2.permitNo || 'GPXD-2026-0089/SXD');
        setAppraisalNoticeNo(currentProject.CONSTRUCTION_PERMIT_GDA2.appraisalNoticeNo || '158/CV-CQLHĐXD-BXD');
        setExemptionLegalBasis(currentProject.CONSTRUCTION_PERMIT_GDA2.exemptionLegalBasis || '');
      }
      setGanttTasks(currentProject.GANTT_TASKS_GDA2 || [
        { taskId: 'TSK-01', taskName: '1. Khảo sát địa chất & Thiết kế bản vẽ thi công', assignedDept: 'Phòng Kỹ thuật & TEDI', startDate: '2026-02-01', endDate: '2026-03-15', progressPct: 100, budgetAllocated: 15000000000 },
        { taskId: 'TSK-02', taskName: '2. Đo bóc khối lượng & Lập dự toán BOQ chi tiết', assignedDept: 'Phòng Kế hoạch Tổng hợp', startDate: '2026-03-16', endDate: '2026-04-05', progressPct: 100, budgetAllocated: 5000000000 },
        { taskId: 'TSK-03', taskName: '3. Thẩm định nội bộ & Trình duyệt QĐ Thiết kế', assignedDept: 'Hội đồng Thẩm định Nội bộ', startDate: '2026-04-06', endDate: '2026-04-20', progressPct: 100, budgetAllocated: 2000000000 }
      ]);
    }
  }, [selectedProjectId]);

  const gpmbTotalCost = (currentProject?.GPMB_ITEMS_GDA3 || []).reduce((acc, g) => acc + safeNumber(g.totalCompensation), 0);
  const boqSummary = PmsService.calculateBoqSummary(boqItems, gpmbTotalCost);
  const tmdtApproved = currentProject ? currentProject.TONG_MUC_DAU_TU : 0;
  const crossCheck = checkEstimateExceedsTMDT(boqSummary.tongDuToanBoq, tmdtApproved);
  const overrunRisk206 = evaluateCostOverrunRisk206(
    tmdtApproved,
    currentProject?.TONG_GIA_TRI_HOP_DONG || boqSummary.tongDuToanBoq,
    0,
    gpmbTotalCost,
    boqSummary.chiPhiDuPhong
  );

  const refreshProjectData = () => {
    const list = PmsService.getProjects();
    setProjects(list);
    if (selectedProjectId) {
      const proj = list.find(p => p.PROJECT_ID === selectedProjectId);
      if (proj) {
        setBoqItems(proj.BOQ_ITEMS_GDA2 || []);
        setGanttTasks(proj.GANTT_TASKS_GDA2 || []);
      }
    }
  };

  // Trigger Template Download
  const handleDownloadTemplate = (type: 'GANTT' | 'BOQ') => {
    generateExcelTemplate(type);
    toast.success(`Đã tải xuống file Excel mẫu .xlsx chuẩn cột cho ${type === 'GANTT' ? 'Kế hoạch tiến độ' : 'Dự toán BOQ'}`);
  };

  // Open Excel Import Modal
  const handleOpenExcelImport = (type: 'GANTT' | 'BOQ') => {
    setExcelSchemaType(type);
    setIsExcelModalOpen(true);
  };

  // ================= TAB 1: GANTT SCHEDULE INLINE EDITING & ACTIONS =================
  const handleEditGanttTask = (task: GanttTaskItem) => {
    setEditingGanttTaskId(task.taskId);
    setDraftGanttTask({ ...task });
  };

  const handleSaveGanttTaskRow = (taskId: string) => {
    const updated = ganttTasks.map(t => {
      if (t.taskId === taskId) {
        return {
          ...t,
          ...draftGanttTask,
          budgetAllocated: safeNumber(draftGanttTask.budgetAllocated)
        } as GanttTaskItem;
      }
      return t;
    });
    setGanttTasks(updated);
    setEditingGanttTaskId(null);
    toast.success(`Đã cập nhật công việc ${taskId}`);
  };

  const handleCancelGanttEdit = () => {
    setEditingGanttTaskId(null);
    setDraftGanttTask({});
  };

  const handleDeleteGanttTask = (task: GanttTaskItem) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa công việc [${task.taskName}] này không?`)) {
      const updated = ganttTasks.filter(t => t.taskId !== task.taskId);
      setGanttTasks(updated);
      toast.success(`Đã xóa công việc ${task.taskId}`);
    }
  };

  const handleAddNewGanttTaskRow = () => {
    const newTaskId = `TSK-${Date.now().toString().slice(-4)}`;
    const newTask: GanttTaskItem = {
      taskId: newTaskId,
      taskName: 'Công việc mới bổ sung thủ công',
      assignedDept: 'Phòng Kỹ thuật',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      progressPct: 100,
      budgetAllocated: 1000000000
    };
    setGanttTasks([...ganttTasks, newTask]);
    handleEditGanttTask(newTask);
    toast.info(`Đã thêm dòng mới [${newTaskId}]. Hãy điền thông tin và bấm Lưu.`);
  };

  const handleSaveGanttPlan = () => {
    if (!currentProject) return;
    const res = PmsHandlers.stage2PlanApi(currentProject.PROJECT_ID, ganttTasks);
    if (res.success) {
      toast.success(res.message);
      refreshProjectData();
    }
  };

  // ================= TAB 2: BOQ ESTIMATE INLINE EDITING & ACTIONS =================
  const handleEditBoqItem = (item: BoqItem) => {
    setEditingBoqItemId(item.itemId);
    setDraftBoqItem({ ...item });
  };

  const handleSaveBoqItemRow = (itemId: string) => {
    const updated = boqItems.map(i => {
      if (i.itemId === itemId) {
        const qty = safeNumber(draftBoqItem.quantity);
        const price = safeNumber(draftBoqItem.unitPrice);
        return {
          ...i,
          ...draftBoqItem,
          quantity: qty,
          unitPrice: price,
          totalAmount: qty * price
        } as BoqItem;
      }
      return i;
    });
    setBoqItems(updated);
    setEditingBoqItemId(null);
    toast.success(`Đã lưu thay đổi cho hạng mục ${draftBoqItem.itemCode || itemId}`);
  };

  const handleCancelBoqEdit = () => {
    setEditingBoqItemId(null);
    setDraftBoqItem({});
  };

  const handleDeleteBoqItem = (item: BoqItem) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa hạng mục [${item.itemName}] không?`)) {
      const updated = boqItems.filter(i => i.itemId !== item.itemId);
      setBoqItems(updated);
      toast.success(`Đã xóa hạng mục ${item.itemCode || item.itemName}`);
    }
  };

  const handleAddNewBoqRow = () => {
    const newItemId = `BOQ-${Date.now().toString().slice(-4)}`;
    const newItem: BoqItem = {
      itemId: newItemId,
      itemCode: `AF.${Math.floor(10000 + Math.random() * 90000)}`,
      itemName: 'Hạng mục bóc tách mới',
      unit: 'm3',
      quantity: 100,
      unitPrice: 2500000,
      totalAmount: 250000000,
      category: 'XÂY_LẮP'
    };
    setBoqItems([...boqItems, newItem]);
    handleEditBoqItem(newItem);
    toast.info(`Đã thêm dòng BOQ mới. Hãy chỉnh sửa và bấm Lưu.`);
  };

  const handleAddBoqItemFromForm = () => {
    const newItem: BoqItem = {
      itemId: `BOQ-${Date.now()}`,
      itemCode: safeString(newItemCode) || 'AF.00000',
      itemName: safeString(newItemName) || 'Hạng mục mới',
      unit: safeString(newItemUnit) || 'Bộ',
      quantity: safeNumber(newItemQty),
      unitPrice: safeNumber(newItemPrice),
      totalAmount: safeNumber(newItemQty) * safeNumber(newItemPrice),
      category: newItemCategory
    };
    setBoqItems([...boqItems, newItem]);
    toast.success(`Đã thêm hạng mục: ${newItem.itemName}`);
  };

  const handleSaveBoqEstimate = () => {
    if (!currentProject) return;
    const res = PmsHandlers.stage2EstimateApi({
      projectId: currentProject.PROJECT_ID,
      designType,
      consultingMode,
      consultantName,
      boqItems
    });

    if (res.success) {
      if (res.data?.crossCheck.isExceeded) {
        toast.error(res.message);
      } else {
        toast.success(res.message);
      }
      refreshProjectData();
    }
  };

  // Tab 3: Submit Approval Review
  const handleSubmitReview = () => {
    if (!currentProject) return;

    const res = PmsHandlers.stage2ApprovalApi({
      projectId: currentProject.PROJECT_ID,
      reviewerDept,
      reviewerName,
      status: reviewStatus,
      comments: reviewComments,
      smartCaToken
    });

    if (res.success) {
      toast.success(res.message);
      refreshProjectData();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* CROSS-CHECK ALERT BOX */}
      {crossCheck.isExceeded && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-900 shadow-sm animate-pulse">
          <AlertOctagon className="w-6 h-6 text-red-600 shrink-0" />
          <div className="flex-1 text-xs">
            <span className="font-bold text-sm">CROSS-CHECK ALERT: TỔNG DỰ TOÁN BOQ VƯỢT TỔNG MỨC ĐẦU TƯ!</span>
            <p className="mt-0.5">{crossCheck.alertMessage}</p>
          </div>
        </div>
      )}

      {/* 3 Main Action Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1.5 rounded-xl border gap-1.5">
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'plan'
              ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600 font-semibold'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" /> Bước 1: Lập kế hoạch chi tiết & KHLCNT
        </button>

        <button
          onClick={() => setActiveTab('boq')}
          className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'boq'
              ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600 font-semibold'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Calculator className="w-4 h-4" /> Bước 2: Dự toán BOQ & thiết kế
        </button>

        <button
          onClick={() => setActiveTab('approval')}
          className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'approval'
              ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600 font-semibold'
              : 'text-slate-700 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4" /> Bước 3: Thẩm định nội bộ & phê duyệt
        </button>
      </div>

      {/* TAB 1: LẬP KẾ HOẠCH CHI TIẾT (Phòng Kế hoạch Tổng hợp) */}
      {activeTab === 'plan' && currentProject && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-indigo-600" />
                  Kế hoạch tiến độ Baseline Gantt & phân bổ nguồn lực
                </h3>
                <p className="text-xs text-slate-500">Cho phép chỉnh sửa inline trực tiếp hoặc thêm/xóa dòng tiến độ</p>
              </div>

              {/* Template Download & Import Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate('GANTT')}
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-4 h-4 text-slate-600" /> Tải Template kế hoạch
                </button>

                <button
                  onClick={() => handleOpenExcelImport('GANTT')}
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Upload className="w-4 h-4 text-slate-600" /> Upload Excel nhập liệu
                </button>

                <button
                  onClick={handleSaveGanttPlan}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Lưu kế hoạch
                </button>
              </div>
            </div>

            {/* Gantt Tasks Table with Action Column */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Mã CV</th>
                    <th className="px-3 py-2.5">Nội dung công việc chi tiết</th>
                    <th className="px-3 py-2.5">Đơn vị chủ trì</th>
                    <th className="px-3 py-2.5">Ngày bắt đầu</th>
                    <th className="px-3 py-2.5">Ngày hoàn thành</th>
                    <th className="px-3 py-2.5 text-right">Ngân sách phân bổ (VNĐ)</th>
                    <th className="px-3 py-2.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ganttTasks.map((t) => {
                    const isEditing = editingGanttTaskId === t.taskId;
                    return (
                      <tr key={t.taskId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono tabular-nums font-bold text-indigo-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftGanttTask.taskId || ''}
                              onChange={e => setDraftGanttTask({ ...draftGanttTask, taskId: e.target.value })}
                              className="w-20 px-1.5 py-0.5 border rounded font-mono tabular-nums"
                            />
                          ) : (
                            t.taskId
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftGanttTask.taskName || ''}
                              onChange={e => setDraftGanttTask({ ...draftGanttTask, taskName: e.target.value })}
                              className="w-full px-1.5 py-0.5 border rounded"
                            />
                          ) : (
                            t.taskName
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftGanttTask.assignedDept || ''}
                              onChange={e => setDraftGanttTask({ ...draftGanttTask, assignedDept: e.target.value })}
                              className="w-full px-1.5 py-0.5 border rounded"
                            />
                          ) : (
                            t.assignedDept
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums">
                          {isEditing ? (
                            <input
                              type="date"
                              value={draftGanttTask.startDate || ''}
                              onChange={e => setDraftGanttTask({ ...draftGanttTask, startDate: e.target.value })}
                              className="px-1.5 py-0.5 border rounded font-mono tabular-nums"
                            />
                          ) : (
                            t.startDate
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono tabular-nums">
                          {isEditing ? (
                            <input
                              type="date"
                              value={draftGanttTask.endDate || ''}
                              onChange={e => setDraftGanttTask({ ...draftGanttTask, endDate: e.target.value })}
                              className="px-1.5 py-0.5 border rounded font-mono tabular-nums"
                            />
                          ) : (
                            t.endDate
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatCurrencyInputMask(draftGanttTask.budgetAllocated || 0)}
                              onChange={e => setDraftGanttTask({ ...draftGanttTask, budgetAllocated: parseCurrencyInputMask(e.target.value) })}
                              className="w-32 px-1.5 py-0.5 border rounded text-right font-mono tabular-nums"
                            />
                          ) : (
                            formatVND(t.budgetAllocated)
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => handleSaveGanttTaskRow(t.taskId)}
                                className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"
                                title="Lưu"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelGanttEdit}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                                title="Hủy"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEditGanttTask(t)}
                                className="text-indigo-600 hover:text-indigo-800 p-1"
                                title="Chỉnh sửa inline"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteGanttTask(t)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add New Gantt Task Button */}
            <div className="pt-2">
              <button
                onClick={handleAddNewGanttTaskRow}
                className="w-full bg-slate-50 hover:bg-indigo-50/60 text-indigo-700 border-2 border-dashed border-indigo-200 font-semibold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Thêm công việc tiến độ mới
              </button>
            </div>
          </div>

          {/* Document Matrix Upload Step 1 */}
          <Stage2DocumentUploader
            projectId={currentProject.PROJECT_ID}
            stepId={1}
            stepName={STAGE2_DOCUMENT_TYPES[0].stepName}
            requiredDocs={STAGE2_DOCUMENT_TYPES[0].requiredDocs}
            uploadedDocs={currentProject.DOCUMENT_MATRIX_GDA2 || []}
            onUploadSuccess={refreshProjectData}
          />
        </div>
      )}

      {/* TAB 2: LẬP THIẾT KẾ & DỰ TOÁN BOQ (Phòng Kỹ thuật / Tư vấn) */}
      {activeTab === 'boq' && currentProject && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  Cấu hình thiết kế & bảng khối lượng BOQ chi tiết
                </h3>
                <p className="text-xs text-slate-500">Cột thao tác sửa/xóa inline trực tiếp & tự động tính toán lại dự toán</p>
              </div>

              {/* Template Download & Import Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate('BOQ')}
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Download className="w-4 h-4 text-slate-600" /> Tải Template BOQ
                </button>

                <button
                  onClick={() => handleOpenExcelImport('BOQ')}
                  className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Upload className="w-4 h-4 text-slate-600" /> Upload Excel nhập liệu
                </button>

                <button
                  onClick={handleSaveBoqEstimate}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Lưu & cập nhật BOQ
                </button>
              </div>
            </div>

            {/* Design & Consultant Config */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Loại hình thiết kế</label>
                <select
                  value={designType}
                  onChange={e => setDesignType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold text-sm"
                >
                  <option value={DesignType.THIET_KE_BVTC}>Thiết kế bản vẽ thi công (TK BVTC)</option>
                  <option value={DesignType.THIET_KE_CO_SO}>Thiết kế cơ sở (TKCS)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hình thức thực hiện</label>
                <select
                  value={consultingMode}
                  onChange={e => setConsultingMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold text-sm"
                >
                  <option value="THUÊ_TƯ_VẤN">Thuê tổ chức tư vấn thiết kế</option>
                  <option value="TỰ_THỰC_HIỆN">Chủ đầu tư / Ban QLDA tự thực hiện</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên đơn vị tư vấn (nếu thuê)</label>
                <input
                  type="text"
                  value={consultantName}
                  onChange={e => setConsultantName(e.target.value)}
                  placeholder="Nhập tên đơn vị tư vấn..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none text-sm"
                />
              </div>
            </div>

            {/* Add New BOQ Item Quick Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-sm font-semibold text-slate-800">Thêm nhanh hạng mục BOQ</div>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã định mức</label>
                  <input type="text" value={newItemCode} onChange={e => setNewItemCode(e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white font-mono tabular-nums" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc</label>
                  <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đơn vị / Khối lượng</label>
                  <div className="flex gap-1">
                    <input type="text" value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} className="w-16 px-2 py-2 border border-slate-300 rounded-lg bg-white" />
                    <input type="number" value={newItemQty} onChange={e => setNewItemQty(Number(e.target.value) || 0)} className="w-full px-2 py-2 border border-slate-300 rounded-lg bg-white font-mono tabular-nums" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Đơn giá (VNĐ)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInputMask(newItemPrice)}
                    onChange={e => setNewItemPrice(parseCurrencyInputMask(e.target.value))}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg bg-white font-mono tabular-nums font-bold"
                  />
                </div>
                <div className="flex items-end">
                  <button onClick={handleAddBoqItemFromForm} type="button" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Thêm hạng mục
                  </button>
                </div>
              </div>
            </div>

            {/* BOQ Table List with Action Column */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">STT / Mã ĐM</th>
                    <th className="px-3 py-2.5">Tên công tác / Chi phí</th>
                    <th className="px-3 py-2.5 text-center">ĐVT</th>
                    <th className="px-3 py-2.5 text-right">Khối lượng</th>
                    <th className="px-3 py-2.5 text-right">Đơn giá (VNĐ)</th>
                    <th className="px-3 py-2.5 text-right">Thành tiền (VNĐ)</th>
                    <th className="px-3 py-2.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {boqItems.map((item) => {
                    const isEditing = editingBoqItemId === item.itemId;
                    return (
                      <tr key={item.itemId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono tabular-nums font-bold text-indigo-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftBoqItem.itemCode || ''}
                              onChange={e => setDraftBoqItem({ ...draftBoqItem, itemCode: e.target.value })}
                              className="w-20 px-1.5 py-0.5 border rounded font-mono tabular-nums"
                            />
                          ) : (
                            item.itemCode
                          )}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftBoqItem.itemName || ''}
                              onChange={e => setDraftBoqItem({ ...draftBoqItem, itemName: e.target.value })}
                              className="w-full px-1.5 py-0.5 border rounded"
                            />
                          ) : (
                            item.itemName
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftBoqItem.unit || ''}
                              onChange={e => setDraftBoqItem({ ...draftBoqItem, unit: e.target.value })}
                              className="w-14 px-1 py-0.5 border rounded text-center"
                            />
                          ) : (
                            item.unit
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draftBoqItem.quantity || 0}
                              onChange={e => setDraftBoqItem({ ...draftBoqItem, quantity: Number(e.target.value) || 0 })}
                              className="w-20 px-1.5 py-0.5 border rounded text-right font-mono tabular-nums font-bold"
                            />
                          ) : (
                            item.quantity.toLocaleString('vi-VN')
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-700">
                          {isEditing ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatCurrencyInputMask(draftBoqItem.unitPrice || 0)}
                              onChange={e => setDraftBoqItem({ ...draftBoqItem, unitPrice: parseCurrencyInputMask(e.target.value) })}
                              className="w-32 px-1.5 py-0.5 border rounded text-right font-mono tabular-nums"
                            />
                          ) : (
                            formatVND(item.unitPrice)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-emerald-700">
                          {isEditing ? (
                            formatVND((safeNumber(draftBoqItem.quantity) * safeNumber(draftBoqItem.unitPrice)))
                          ) : (
                            formatVND(item.quantity * item.unitPrice)
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {isEditing ? (
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => handleSaveBoqItemRow(item.itemId)}
                                className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"
                                title="Lưu"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={handleCancelBoqEdit}
                                className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"
                                title="Hủy"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => handleEditBoqItem(item)}
                                className="text-indigo-600 hover:text-indigo-800 p-1"
                                title="Chỉnh sửa inline"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBoqItem(item)}
                                className="text-red-500 hover:text-red-700 p-1"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add New BOQ Row Button */}
            <div className="pt-2">
              <button
                onClick={handleAddNewBoqRow}
                className="w-full bg-slate-50 hover:bg-indigo-50/60 text-indigo-700 border-2 border-dashed border-indigo-200 font-semibold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> Thêm hạng mục BOQ thủ công mới
              </button>
            </div>

            {/* Total BOQ Cost Summary Box (7 Khoản mục Chi phí theo NĐ 206/2026/NĐ-CP) */}
            <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-200 text-xs space-y-2">
              <div className="text-xs font-bold text-indigo-950 pb-1 border-b border-indigo-200">
                Tổng hợp dự toán 7 khoản mục chi phí (Nghị định 206/2026/NĐ-CP & TT 38/2026/TT-BXD)
              </div>
              <div className="flex justify-between font-semibold text-slate-700 border-b border-indigo-100 pb-1.5">
                <span>1. Chi phí bồi thường, hỗ trợ & tái định cư (G_GPMB):</span>
                <span className="font-mono tabular-nums">{formatVND(boqSummary.chiPhiGpmb)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 border-b border-indigo-100 pb-1.5">
                <span>2. Chi phí xây dựng trực tiếp (G_XD):</span>
                <span className="font-mono tabular-nums text-sm">{formatVND(boqSummary.chiPhiXayLap)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 border-b border-indigo-100 pb-1.5">
                <span>3. Chi phí thiết bị công nghệ (G_TB):</span>
                <span className="font-mono tabular-nums text-sm">{formatVND(boqSummary.chiPhiThietBi)}</span>
              </div>
              <div className="flex justify-between text-slate-700 border-b border-indigo-100 pb-1.5">
                <span>4. Chi phí quản lý dự án (G_QLDA - Định mức 2.45%):</span>
                <span className="font-mono tabular-nums">{formatVND(boqSummary.chiPhiQuanLyDuAn)}</span>
              </div>
              <div className="flex justify-between text-slate-700 border-b border-indigo-100 pb-1.5">
                <span>5. Chi phí tư vấn đầu tư xây dựng (G_TV - Định mức 4.15%):</span>
                <span className="font-mono tabular-nums">{formatVND(boqSummary.chiPhiTuVan)}</span>
              </div>
              <div className="flex justify-between text-slate-700 border-b border-indigo-100 pb-1.5">
                <span>6. Chi phí khác & hạng mục chung (G_K - 1.80%):</span>
                <span className="font-mono tabular-nums">{formatVND(boqSummary.chiPhiKhac)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span className="tabular-nums">7. Chi phí dự phòng (G_DP1 phát sinh KL: {formatVND(boqSummary.chiPhiDuPhongPhatSinh)} + G_DP2 trượt giá: {formatVND(boqSummary.chiPhiDuPhongTruotGia)}):</span>
                <span className="font-mono tabular-nums font-bold">{formatVND(boqSummary.chiPhiDuPhong)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-indigo-950 pt-2 border-t-2 border-indigo-300">
                <span>Tổng dự toán xây dựng công trình (7 khoản mục NĐ 206/2026):</span>
                <span className="font-mono tabular-nums text-base">{formatVND(boqSummary.tongDuToanBoq)}</span>
              </div>

              {/* 3-Tier Early Warning Guardrail (NĐ 206/2026) */}
              <div className={`mt-2 p-3 rounded-xl border font-bold text-xs flex items-center justify-between ${
                overrunRisk206.level === 'HARD_BLOCK_RED'
                  ? 'bg-red-100 border-red-400 text-red-900'
                  : overrunRisk206.level === 'HIGH_ORANGE'
                  ? 'bg-amber-100 border-amber-400 text-amber-900'
                  : 'bg-emerald-100 border-emerald-400 text-emerald-900'
              }`}>
                <span>{overrunRisk206.message}</span>
                <span className="font-mono tabular-nums px-2 py-0.5 rounded bg-white/80 text-[11px]">
                  Sử dụng TMĐT: {overrunRisk206.tmdtUsagePct}%
                </span>
              </div>
            </div>
          </div>

          {/* Document Matrix Upload Step 2 */}
          <Stage2DocumentUploader
            projectId={currentProject.PROJECT_ID}
            stepId={2}
            stepName={STAGE2_DOCUMENT_TYPES[1].stepName}
            requiredDocs={STAGE2_DOCUMENT_TYPES[1].requiredDocs}
            uploadedDocs={currentProject.DOCUMENT_MATRIX_GDA2 || []}
            onUploadSuccess={refreshProjectData}
          />
        </div>
      )}

      {/* TAB 3: THẨM ĐỊNH, PHÊ DUYỆT & CẤP GIẤY PHÉP XÂY DỰNG (NĐ 217/2026/NĐ-CP) */}
      {activeTab === 'approval' && currentProject && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Approval Submit */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                Hội đồng thẩm định nội bộ phê duyệt thiết kế & dự toán
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phòng ban thẩm định trình duyệt</label>
                  <select
                    value={reviewerDept}
                    onChange={e => setReviewerDept(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-semibold outline-none text-sm"
                  >
                    <option value="Phòng Kế hoạch - Tài chính">Phòng Kế hoạch - Tài chính</option>
                    <option value="Phòng Kỹ thuật & Thẩm định">Phòng Kỹ thuật & Thẩm định</option>
                    <option value="Hội đồng Thẩm định Nội bộ Ban QLDA">Hội đồng Thẩm định Nội bộ Ban QLDA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Người chủ trì thẩm định / Ký số</label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={e => setReviewerName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quyết định thẩm định</label>
                  <select
                    value={reviewStatus}
                    onChange={e => setReviewStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-semibold outline-none text-sm"
                  >
                    <option value={ApprovalStatus.APPROVED}>Đạt - Phê duyệt quyết định thiết kế & dự toán</option>
                    <option value={ApprovalStatus.REJECTED}>Từ chối - Yêu cầu chỉnh sửa / Trình điều chỉnh TMĐT</option>
                    <option value={ApprovalStatus.INTERNAL_REVIEW}>Đang trong quá trình thẩm định nội bộ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ý kiến & kết luận thẩm định</label>
                  <textarea
                    rows={3}
                    value={reviewComments}
                    onChange={e => setReviewComments(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white outline-none text-sm"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Xác thực ký số SmartCA phê duyệt
                  </span>
                  <input
                    type="text"
                    value={smartCaToken}
                    onChange={e => setSmartCaToken(e.target.value)}
                    className="px-3 py-1 font-mono tabular-nums text-xs border rounded-lg bg-white"
                  />
                </div>

                <button
                  onClick={handleSubmitReview}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                >
                  <FileCheck2 className="w-4 h-4" /> Ký số & lưu kết quả thẩm định nội bộ
                </button>
              </div>
            </div>

            {/* Construction Permit / Exemption Gate (NĐ 217/2026/NĐ-CP) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  Chốt chặn giấy phép xây dựng / Miễn GPXD (NĐ 217/2026)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                  Điều kiện khởi công
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Hình thức quản lý cấp phép xây dựng</label>
                  <select
                    value={permitStatus}
                    onChange={e => setPermitStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-semibold text-emerald-900 outline-none text-sm"
                  >
                    <option value="THUỘC_DIỆN_MIỄN_GPXD">Thuộc diện miễn giấy phép xây dựng (Khoản 2 Điều 89 Luật XD & NĐ 217/2026)</option>
                    <option value="ĐÃ_CẤP_GIẤY_PHÉP_XD">Đã được cấp giấy phép xây dựng hợp lệ</option>
                    <option value="ĐANG_XIN_CẤP_PHÉP_XD">Đang trình hồ sơ xin cấp giấy phép xây dựng</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số văn bản thông báo KQ thẩm định CQCM XD</label>
                    <input
                      type="text"
                      value={appraisalNoticeNo}
                      onChange={e => setAppraisalNoticeNo(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono tabular-nums font-bold text-indigo-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Số giấy phép XD (Nếu thuộc diện cấp phép)</label>
                    <input
                      type="text"
                      value={permitNo}
                      onChange={e => setPermitNo(e.target.value)}
                      disabled={permitStatus === 'THUỘC_DIỆN_MIỄN_GPXD'}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono tabular-nums disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Căn cứ pháp lý miễn GPXD / Ghi chú cấp phép</label>
                  <textarea
                    rows={2}
                    value={exemptionLegalBasis}
                    onChange={e => setExemptionLegalBasis(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 text-sm"
                  />
                </div>

                <button
                  onClick={() => {
                    const res = PmsHandlers.stage2PermitApi(currentProject.PROJECT_ID, {
                      permitStatus,
                      permitNo: permitStatus === 'ĐÃ_CẤP_GIẤY_PHÉP_XD' ? permitNo : undefined,
                      appraisalNoticeNo,
                      exemptionLegalBasis,
                      issueDate: new Date().toISOString().split('T')[0],
                      issuedBy: 'Cơ quan chuyên môn về Xây dựng'
                    });
                    if (res.success) {
                      toast.success(res.message);
                      refreshProjectData();
                    } else {
                      toast.error(res.message);
                    }
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle className="w-4 h-4" /> Xác nhận hồ sơ cấp phép / Miễn GPXD (NĐ 217/2026)
                </button>

                {/* Review Log History List */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="font-semibold text-slate-700 text-xs">Lịch sử thẩm định đã lưu vết:</div>
                  {currentProject.REVIEW_LOGS_GDA2?.map(log => (
                    <div key={log.reviewId} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-900">{log.reviewerDept}</span> • <span className="text-slate-600">{log.reviewerName}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded font-semibold bg-emerald-100 text-emerald-800 text-[11px]">{formatStatusOrCodeVN(log.status)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Document Matrix Upload Step 3 */}
          <Stage2DocumentUploader
            projectId={currentProject.PROJECT_ID}
            stepId={3}
            stepName={STAGE2_DOCUMENT_TYPES[2].stepName}
            requiredDocs={STAGE2_DOCUMENT_TYPES[2].requiredDocs}
            uploadedDocs={currentProject.DOCUMENT_MATRIX_GDA2 || []}
            onUploadSuccess={refreshProjectData}
          />
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
