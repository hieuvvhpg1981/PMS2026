import React, { useState, useEffect } from 'react';
import { PmsService, ProjectData, BoqItem, GanttTaskItem, InternalReviewRecord } from '../pms/T2_Services';
import { PmsHandlers } from '../pms/T3_Handlers';
import { DesignType, ApprovalStatus, STAGE2_DOCUMENT_TYPES } from '../pms/T0_Config';
import { formatVND, safeNumber, safeString, checkEstimateExceedsTMDT, generateExcelTemplate, updateBoqRow } from '../pms/T1_Utils';
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

export default function Stage2DesignCostView() {
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

  // Tab 3 state: Approval & Review
  const [reviewerDept, setReviewerDept] = useState<string>('Phòng Kế hoạch - Tài chính');
  const [reviewerName, setReviewerName] = useState<string>('Phạm Minh Đức (Trưởng phòng)');
  const [reviewStatus, setReviewStatus] = useState<ApprovalStatus>(ApprovalStatus.APPROVED);
  const [reviewComments, setReviewComments] = useState<string>('Dự toán BOQ và bản vẽ thiết kế đạt tiêu chuẩn chất lượng.');
  const [smartCaToken, setSmartCaToken] = useState<string>('SMARTCA-TOKEN-REVIEWER-2026');

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
      setGanttTasks(currentProject.GANTT_TASKS_GDA2 || [
        { taskId: 'TSK-01', taskName: '1. Khảo sát địa chất & Thiết kế bản vẽ thi công', assignedDept: 'Phòng Kỹ thuật & TEDI', startDate: '2026-02-01', endDate: '2026-03-15', progressPct: 100, budgetAllocated: 15000000000 },
        { taskId: 'TSK-02', taskName: '2. Đo bóc khối lượng & Lập dự toán BOQ chi tiết', assignedDept: 'Phòng Kế hoạch Tổng hợp', startDate: '2026-03-16', endDate: '2026-04-05', progressPct: 100, budgetAllocated: 5000000000 },
        { taskId: 'TSK-03', taskName: '3. Thẩm định nội bộ & Trình duyệt QĐ Thiết kế', assignedDept: 'Hội đồng Thẩm định Nội bộ', startDate: '2026-04-06', endDate: '2026-04-20', progressPct: 100, budgetAllocated: 2000000000 }
      ]);
    }
  }, [selectedProjectId]);

  const boqSummary = PmsService.calculateBoqSummary(boqItems);
  const tmdtApproved = currentProject ? currentProject.TONG_MUC_DAU_TU : 0;
  const crossCheck = checkEstimateExceedsTMDT(boqSummary.tongDuToanBoq, tmdtApproved);

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
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-xl border">
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'plan' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CalendarDays className="w-4 h-4" /> BƯỚC 1: LẬP KẾ HOẠCH CHI TIẾT & KHLCNT
        </button>

        <button
          onClick={() => setActiveTab('boq')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'boq' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calculator className="w-4 h-4" /> BƯỚC 2: DỰ TOÁN BOQ & THIẾT KẾ
        </button>

        <button
          onClick={() => setActiveTab('approval')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'approval' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4" /> BƯỚC 3: THẨM ĐỊNH NỘI BỘ & PHÊ DUYỆT
        </button>
      </div>

      {/* TAB 1: LẬP KẾ HOẠCH CHI TIẾT (Phòng Kế hoạch Tổng hợp) */}
      {activeTab === 'plan' && currentProject && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                  KẾ HOẠCH TIẾN ĐỘ BASELINE GANTT & PHÂN BỔ NGUỒN LỰC
                </h3>
                <p className="text-xs text-slate-500">Cho phép Chỉnh sửa Inline trực tiếp hoặc Thêm/Xóa dòng tiến độ</p>
              </div>

              {/* Template Download & Import Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate('GANTT')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all border border-slate-300 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-blue-600" /> Tải Template Kế hoạch
                </button>

                <button
                  onClick={() => handleOpenExcelImport('GANTT')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> Upload File Excel Nhập Liệu
                </button>

                <button
                  onClick={handleSaveGanttPlan}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Lưu Kế Hoạch
                </button>
              </div>
            </div>

            {/* Gantt Tasks Table with Action Column */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Mã CV</th>
                    <th className="px-3 py-2.5">Nội dung công việc chi tiết</th>
                    <th className="px-3 py-2.5">Đơn vị chủ trì</th>
                    <th className="px-3 py-2.5">Ngày bắt đầu</th>
                    <th className="px-3 py-2.5">Ngày hoàn thành</th>
                    <th className="px-3 py-2.5 text-right">Ngân sách phân bổ (VND)</th>
                    <th className="px-3 py-2.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ganttTasks.map((t) => {
                    const isEditing = editingGanttTaskId === t.taskId;
                    return (
                      <tr key={t.taskId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-blue-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftGanttTask.taskId || ''}
                              onChange={e => setDraftGanttTask({ ...draftGanttTask, taskId: e.target.value })}
                              className="w-20 px-1.5 py-0.5 border rounded font-mono"
                            />
                          ) : (
                            t.taskId
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">
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
                        <td className="px-3 py-2 font-mono">
                          {isEditing ? (
                            <input
                              type="date"
                              value={draftGanttTask.startDate || ''}
                              onChange={e => setDraftGanttTask({ ...draftGanttTask, startDate: e.target.value })}
                              className="px-1.5 py-0.5 border rounded font-mono"
                            />
                          ) : (
                            t.startDate
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {isEditing ? (
                            <input
                              type="date"
                              value={draftGanttTask.endDate || ''}
                              onChange={e => setDraftGanttTask({ ...draftGanttTask, endDate: e.target.value })}
                              className="px-1.5 py-0.5 border rounded font-mono"
                            />
                          ) : (
                            t.endDate
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draftGanttTask.budgetAllocated || 0}
                              onChange={e => setDraftGanttTask({ ...draftGanttTask, budgetAllocated: Number(e.target.value) || 0 })}
                              className="w-28 px-1.5 py-0.5 border rounded text-right font-mono"
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
                                className="text-blue-600 hover:text-blue-800 p-1"
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
                className="w-full bg-slate-50 hover:bg-blue-50/60 text-blue-700 border-2 border-dashed border-blue-200 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> [+ THÊM CÔNG VIỆC TIẾN ĐỘ MỚI]
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
                  <Calculator className="w-5 h-5 text-blue-600" />
                  CẤU HÌNH THIẾT KẾ & BẢNG KHỐI LƯỢNG BOQ CHI TIẾT
                </h3>
                <p className="text-xs text-slate-500">Cột Thao tác Sửa/Xóa Inline trực tiếp & Tự động tính toán lại Dự toán</p>
              </div>

              {/* Template Download & Import Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate('BOQ')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all border border-slate-300 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-blue-600" /> Tải Template BOQ
                </button>

                <button
                  onClick={() => handleOpenExcelImport('BOQ')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4" /> Upload File Excel Nhập Liệu
                </button>

                <button
                  onClick={handleSaveBoqEstimate}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Lưu & Cập Nhật BOQ
                </button>
              </div>
            </div>

            {/* Design & Consultant Config */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Loại Hình Thiết Kế</label>
                <select
                  value={designType}
                  onChange={e => setDesignType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold"
                >
                  <option value={DesignType.THIET_KE_BVTC}>Thiết kế Bản vẽ thi công (TK BVTC)</option>
                  <option value={DesignType.THIET_KE_CO_SO}>Thiết kế cơ sở (TKCS)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Hình Thức Thực Hiện</label>
                <select
                  value={consultingMode}
                  onChange={e => setConsultingMode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold"
                >
                  <option value="THUÊ_TƯ_VẤN">Thuê Tổ chức Tư vấn Thiết kế</option>
                  <option value="TỰ_THỰC_HIỆN">Chủ đầu tư / Ban QLDA Tự thực hiện</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Tên Đơn Vị Tư Vấn (nếu thuê)</label>
                <input
                  type="text"
                  value={consultantName}
                  onChange={e => setConsultantName(e.target.value)}
                  placeholder="Nhập tên đơn vị tư vấn..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none"
                />
              </div>
            </div>

            {/* Add New BOQ Item Quick Form */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase">THÊM NHANH HẠNG MỤC BOQ</div>
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Mã Định Mức</label>
                  <input type="text" value={newItemCode} onChange={e => setNewItemCode(e.target.value)} className="w-full px-2.5 py-1.5 border rounded-lg bg-white font-mono" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-600 mb-1">Tên Công Việc</label>
                  <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} className="w-full px-2.5 py-1.5 border rounded-lg bg-white" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Đơn Vị / Khối Lượng</label>
                  <div className="flex gap-1">
                    <input type="text" value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} className="w-16 px-2 py-1.5 border rounded-lg bg-white" />
                    <input type="number" value={newItemQty} onChange={e => setNewItemQty(Number(e.target.value) || 0)} className="w-full px-2 py-1.5 border rounded-lg bg-white font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Đơn Giá (VND)</label>
                  <input type="number" value={newItemPrice} onChange={e => setNewItemPrice(Number(e.target.value) || 0)} className="w-full px-2 py-1.5 border rounded-lg bg-white font-mono" />
                </div>
                <div className="flex items-end">
                  <button onClick={handleAddBoqItemFromForm} type="button" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Thêm Hạng Mục
                  </button>
                </div>
              </div>
            </div>

            {/* BOQ Table List with Action Column */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-600">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">STT / Mã ĐM</th>
                    <th className="px-3 py-2.5">Tên Công Tác / Chi Phí</th>
                    <th className="px-3 py-2.5 text-center">ĐVT</th>
                    <th className="px-3 py-2.5 text-right">Khối Lượng</th>
                    <th className="px-3 py-2.5 text-right">Đơn Giá (VND)</th>
                    <th className="px-3 py-2.5 text-right">Thành Tiền (VND)</th>
                    <th className="px-3 py-2.5 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {boqItems.map((item) => {
                    const isEditing = editingBoqItemId === item.itemId;
                    return (
                      <tr key={item.itemId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-bold text-blue-700">
                          {isEditing ? (
                            <input
                              type="text"
                              value={draftBoqItem.itemCode || ''}
                              onChange={e => setDraftBoqItem({ ...draftBoqItem, itemCode: e.target.value })}
                              className="w-20 px-1.5 py-0.5 border rounded font-mono"
                            />
                          ) : (
                            item.itemCode
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">
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
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draftBoqItem.quantity || 0}
                              onChange={e => setDraftBoqItem({ ...draftBoqItem, quantity: Number(e.target.value) || 0 })}
                              className="w-20 px-1.5 py-0.5 border rounded text-right font-mono font-bold"
                            />
                          ) : (
                            item.quantity.toLocaleString()
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {isEditing ? (
                            <input
                              type="number"
                              value={draftBoqItem.unitPrice || 0}
                              onChange={e => setDraftBoqItem({ ...draftBoqItem, unitPrice: Number(e.target.value) || 0 })}
                              className="w-28 px-1.5 py-0.5 border rounded text-right font-mono"
                            />
                          ) : (
                            formatVND(item.unitPrice)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
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
                                className="text-blue-600 hover:text-blue-800 p-1"
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
                className="w-full bg-slate-50 hover:bg-emerald-50/60 text-emerald-700 border-2 border-dashed border-emerald-300 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" /> [+ THÊM HẠNG MỤC BOQ THỦ CÔNG MỚI]
              </button>
            </div>

            {/* Total BOQ Cost Summary Box */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 text-xs space-y-2">
              <div className="flex justify-between font-bold text-slate-800 border-b border-blue-200 pb-2">
                <span>1. Chi phí Xây lắp trực tiếp:</span>
                <span className="font-mono text-sm">{formatVND(boqSummary.chiPhiXayLap)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-800 border-b border-blue-200 pb-2">
                <span>2. Chi phí Thiết bị trực tiếp:</span>
                <span className="font-mono text-sm">{formatVND(boqSummary.chiPhiThietBi)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>3. Chi phí Quản lý dự án + Tư vấn + Khác (TT 38/2026):</span>
                <span className="font-mono">{formatVND(boqSummary.chiPhiQuanLyDuAn + boqSummary.chiPhiTuVan + boqSummary.chiPhiKhac)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>4. Chi phí Dự phòng trượt giá & phát sinh (5%):</span>
                <span className="font-mono">{formatVND(boqSummary.chiPhiDuPhong)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-blue-900 pt-2 border-t-2 border-blue-300">
                <span>TỔNG DỰ TOÁN BOQ TOÀN BỘ DỰ ÁN:</span>
                <span className="font-mono text-base">{formatVND(boqSummary.tongDuToanBoq)}</span>
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

      {/* TAB 3: THẨM ĐỊNH NỘI BỘ & PHÊ DUYỆT (Hội đồng Thẩm định) */}
      {activeTab === 'approval' && currentProject && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Approval Submit */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                <UserCheck className="w-5 h-5 text-blue-600" />
                HỘI ĐỒNG THẨM ĐỊNH NỘI BỘ PHÊ DUYỆT THIẾT KẾ & DỰ TOÁN
              </h3>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Phòng Ban Thẩm Định Trình Duyệt</label>
                  <select
                    value={reviewerDept}
                    onChange={e => setReviewerDept(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-semibold outline-none"
                  >
                    <option value="Phòng Kế hoạch - Tài chính">Phòng Kế hoạch - Tài chính</option>
                    <option value="Phòng Kỹ thuật & Thẩm định">Phòng Kỹ thuật & Thẩm định</option>
                    <option value="Hội đồng Thẩm định Nội bộ Ban QLDA">Hội đồng Thẩm định Nội bộ Ban QLDA</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Người Chủ Trì Thẩm Định / Ký Số</label>
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={e => setReviewerName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white outline-none font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Quyết Định Thẩm Định</label>
                  <select
                    value={reviewStatus}
                    onChange={e => setReviewStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white font-bold outline-none"
                  >
                    <option value={ApprovalStatus.APPROVED}>ĐẠT - Phê Duyệt Quyết Định Thiết Kế & Dự Toán (APPROVED)</option>
                    <option value={ApprovalStatus.REJECTED}>TỪ CHỐI - Yêu Cầu Chỉnh Sửa / Trình Điều Chỉnh TMĐT (REJECTED)</option>
                    <option value={ApprovalStatus.INTERNAL_REVIEW}>ĐANG TRONG QUÁ TRÌNH THẨM ĐỊNH (INTERNAL_REVIEW)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Ý Kiến & Kết Luận Thẩm Định</label>
                  <textarea
                    rows={3}
                    value={reviewComments}
                    onChange={e => setReviewComments(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl bg-white outline-none"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Xác thực Ký số SmartCA Phê duyệt
                  </span>
                  <input
                    type="text"
                    value={smartCaToken}
                    onChange={e => setSmartCaToken(e.target.value)}
                    className="px-3 py-1 font-mono text-xs border rounded-lg bg-white"
                  />
                </div>

                <button
                  onClick={handleSubmitReview}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm"
                >
                  <FileCheck2 className="w-4 h-4" /> Ký Số & Lưu Kết Quả Thẩm Định Nội Bộ
                </button>
              </div>
            </div>

            {/* Review Log History List */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                LỊCH SỬ THẨM ĐỊNH NỘI BỘ ĐÃ LƯU VẾT
              </h3>

              <div className="space-y-3">
                {currentProject.REVIEW_LOGS_GDA2?.map(log => (
                  <div key={log.reviewId} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{log.reviewerDept}</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${log.status === ApprovalStatus.APPROVED ? 'bg-emerald-100 text-emerald-800' : log.status === ApprovalStatus.REJECTED ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="text-slate-600">Người thẩm định: {log.reviewerName} ({log.reviewDate})</div>
                    <p className="text-slate-700 italic pt-1 border-t border-slate-200">"{log.comments}"</p>
                  </div>
                ))}

                {(!currentProject.REVIEW_LOGS_GDA2 || currentProject.REVIEW_LOGS_GDA2.length === 0) && (
                  <div className="text-center py-8 text-xs text-slate-400">Chưa có kết quả thẩm định nào.</div>
                )}
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
