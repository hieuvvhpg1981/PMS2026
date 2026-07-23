import React, { useState, useEffect, useMemo } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, doc, setDoc, addDoc, deleteDoc, query, where } from 'firebase/firestore';
import { toast } from 'sonner';
import { Rocket, Check, ChevronRight, Play, Settings2, RotateCcw, Trash2, Eye, Search, X, CheckCircle2, Clock, FileCheck, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_WORKFLOWS, type WorkflowDefinition, type TaskExecution } from '../config/workflowDefinitions';
import WorkflowManager from './WorkflowManager';
import { sanitizePlan, sanitizeContract } from '../lib/sanitize';
import { calculateRollupBudgets, calculateRollupActualCosts, isSuperUser } from '../lib/hierarchy';

interface Props { profile: any; }

export default function ExecutionView({ profile }: Props) {
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [rawPlans, setRawPlans] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const plans = useMemo(() => {
    const budgetRolledUp = calculateRollupBudgets(rawPlans);
    return calculateRollupActualCosts(budgetRolledUp, contracts);
  }, [rawPlans, contracts]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);

  // New execution form
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedWorkflowId, setSelectedWorkflowId] = useState('');
  const [formDept, setFormDept] = useState('');
  const [formTaskName, setFormTaskName] = useState('');
  const [formAssignee, setFormAssignee] = useState('');
  const [formEstimatedPrice, setFormEstimatedPrice] = useState('');

  const years = [2024, 2025, 2026, 2027, 2028];

  // Active execution stepper
  const [activeExecution, setActiveExecution] = useState<TaskExecution | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = isSuperUser(profile);
  const userDept = profile?.phongBan;

  // === FIRESTORE SUBSCRIPTIONS ===
  useEffect(() => {
    // 1. Load workflow definitions (or seed defaults)
    const unsubWf = onSnapshot(collection(db, 'workflow_definitions'), async (snap) => {
      if (snap.empty) {
        // Seed defaults
        for (const wf of DEFAULT_WORKFLOWS) {
          await setDoc(doc(db, 'workflow_definitions', wf.id), { ...wf, createdAt: new Date().toISOString(), createdBy: 'system' });
        }
        return; // onSnapshot will fire again after seeding
      }
      setWorkflows(snap.docs.map(d => ({ ...d.data(), id: d.id } as WorkflowDefinition)));
    });

    // 2. Load task_executions
    const unsubExec = onSnapshot(collection(db, 'task_executions'), (snap) => {
      const all = snap.docs.map(d => ({ ...d.data(), id: d.id } as TaskExecution));
      setExecutions(all);
      setLoading(false);
    });
    // 3. Load plans for dropdown
    const unsubPlans = onSnapshot(collection(db, 'plans'), (snap) => {
      const raw = snap.docs.map(d => sanitizePlan(d.id, d.data()));
      setRawPlans(raw);
    });

    // 4. Load contracts
    const unsubContracts = onSnapshot(collection(db, 'contracts'), (snap) => {
      const raw = snap.docs.map(d => sanitizeContract(d.id, d.data()));
      setContracts(raw);
    });

    // 5. Load departments
    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap) => {
      setDepartments(snap.docs.map(d => (d.data().name as string)).sort((a, b) => a.localeCompare(b, 'vi')));
    });

    return () => {
      unsubWf();
      unsubExec();
      unsubPlans();
      unsubContracts();
      unsubDepts();
    };
  }, []);
  // Filter executions by role
  const filteredExecutions = useMemo(() => {
    let list = executions;
    if (!isAdmin && userDept) {
      list = list.filter(e => e.departmentName?.toLowerCase().trim() === userDept.toLowerCase().trim());
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(e => e.planId?.toLowerCase().includes(s) || e.workflowName?.toLowerCase().includes(s) || e.planDescription?.toLowerCase().includes(s) || e.taskName?.toLowerCase().includes(s) || e.assignee?.toLowerCase().includes(s));
    }
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [executions, isAdmin, userDept, searchTerm]);

  // Filter plans by year + department
  const activeDept = isAdmin ? formDept : (userDept || '');
  const availablePlans = useMemo(() => {
    let list = plans;
    // Filter by year
    list = list.filter((p: any) => p.namKeHoach === selectedYear);
    // Filter by department: show own dept + 'Các phòng' (dùng chung)
    if (activeDept) {
      const normActive = activeDept.toLowerCase().trim();
      list = list.filter((p: any) => 
        (p.departmentName && p.departmentName.toLowerCase().trim() === normActive) || 
        (p.departmentName && (p.departmentName.toLowerCase().includes('các phòng') || p.departmentName.toLowerCase().includes('dùng chung')))
      );
    } else if (!isAdmin && userDept) {
      const normUser = userDept.toLowerCase().trim();
      list = list.filter((p: any) => 
        (p.departmentName && p.departmentName.toLowerCase().trim() === normUser) || 
        (p.departmentName && (p.departmentName.toLowerCase().includes('các phòng') || p.departmentName.toLowerCase().includes('dùng chung')))
      );
    }
    return list;
  }, [plans, selectedYear, activeDept, isAdmin, userDept]);

  // Auto-clear planId when year or dept changes
  useEffect(() => {
    setSelectedPlanId('');
  }, [selectedYear, formDept]);

  // === START NEW EXECUTION ===
  const handleStartExecution = async () => {
    const plan = plans.find(p => p.id === selectedPlanId);
    const wf = workflows.find(w => w.id === selectedWorkflowId);
    if (!plan || !wf) { toast.error('Vui lòng chọn Mã KH và Hình thức thực hiện.'); return; }
    if (!formTaskName.trim()) { toast.error('Vui lòng nhập Tên công việc.'); return; }

    const deptToSave = isAdmin ? formDept : (userDept || '');
    const toastId = toast.loading('Đang khởi tạo quy trình...');
    try {
      const newExec: Omit<TaskExecution, 'id'> = {
        planDocId: plan.id,
        planId: plan.planId || plan.id,
        planDescription: plan.description || '',
        workflowId: wf.id,
        workflowName: wf.name,
        currentStep: 0,
        totalSteps: wf.steps.length,
        status: 'in_progress',
        stepsData: {},
        metadata: {},
        taskName: formTaskName.trim(),
        assignee: formAssignee.trim(),
        estimatedPrice: Number(formEstimatedPrice) || 0,
        createdBy: auth.currentUser?.email || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        departmentName: deptToSave,
        namKeHoach: plan.namKeHoach || new Date().getFullYear(),
      };
      const docRef = await addDoc(collection(db, 'task_executions'), newExec);
      toast.success('Đã khởi tạo quy trình triển khai!', { id: toastId });
      setActiveExecution({ ...newExec, id: docRef.id } as TaskExecution);
      setSelectedPlanId(''); setSelectedWorkflowId(''); setFormTaskName(''); setFormAssignee(''); setFormEstimatedPrice(''); if (isAdmin) setFormDept('');
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message, { id: toastId });
    }
  };

  // === STEP ACTIONS ===
  const handleChecklistToggle = async (exec: TaskExecution, stepIdx: number, checkId: string, checked: boolean) => {
    const stepsData = { ...exec.stepsData };
    if (!stepsData[stepIdx]) stepsData[stepIdx] = { checklist: {}, inputs: {} };
    stepsData[stepIdx] = { ...stepsData[stepIdx], checklist: { ...stepsData[stepIdx].checklist, [checkId]: checked } };
    const updated = { ...exec, stepsData, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'task_executions', exec.id), updated, { merge: true });
    setActiveExecution(updated);
  };

  const handleInputChange = async (exec: TaskExecution, stepIdx: number, inputId: string, value: string) => {
    const stepsData = { ...exec.stepsData };
    if (!stepsData[stepIdx]) stepsData[stepIdx] = { checklist: {}, inputs: {} };
    stepsData[stepIdx] = { ...stepsData[stepIdx], inputs: { ...stepsData[stepIdx].inputs, [inputId]: value } };

    // Also save to metadata for cross-system sync
    const metadata = { ...exec.metadata };
    if (inputId.includes('maKHLCNT')) metadata.maKHLCNT = value;
    if (inputId.includes('ngayDangTai')) metadata.ngayDangTai = value;
    if (inputId.includes('maTBMT')) metadata.maTBMT = value;
    if (inputId.includes('thoiGianMoThau')) metadata.thoiGianMoThau = value;
    if (inputId.includes('ngayTBKQ')) metadata.ngayThongBaoKetQua = value;

    const updated = { ...exec, stepsData, metadata, updatedAt: new Date().toISOString() };
    await setDoc(doc(db, 'task_executions', exec.id), updated, { merge: true });
    setActiveExecution(updated);
  };

  const canAdvanceStep = (exec: TaskExecution, wf: WorkflowDefinition, stepIdx: number): boolean => {
    const step = wf.steps[stepIdx];
    if (!step) return false;
    const data = exec.stepsData?.[stepIdx];
    // All checklist items must be checked
    for (const cl of step.checklist) {
      if (!data?.checklist?.[cl.id]) return false;
    }
    // All required inputs must be filled
    for (const inp of step.inputFields) {
      if (inp.required && !data?.inputs?.[inp.id]?.trim()) return false;
    }
    // Steps with no checklist and no inputs can always advance
    return true;
  };

  const handleAdvanceStep = async (exec: TaskExecution) => {
    const nextStep = exec.currentStep + 1;
    const stepsData = { ...exec.stepsData };
    if (stepsData[exec.currentStep]) {
      stepsData[exec.currentStep] = { ...stepsData[exec.currentStep], completedAt: new Date().toISOString() };
    }
    const isComplete = nextStep >= exec.totalSteps;
    const updated: TaskExecution = {
      ...exec,
      currentStep: isComplete ? exec.currentStep : nextStep,
      status: isComplete ? 'completed' : 'in_progress',
      stepsData,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'task_executions', exec.id), updated, { merge: true });
    setActiveExecution(isComplete ? null : updated);
    if (isComplete) toast.success('🎉 Quy trình đã hoàn thành!');
    else toast.success(`Đã chuyển sang ${exec.currentStep + 2}/${exec.totalSteps}`);
  };

  const handleDeleteExecution = async (id: string) => {
    if (!confirm('Xóa triển khai này?')) return;
    await deleteDoc(doc(db, 'task_executions', id));
    if (activeExecution?.id === id) setActiveExecution(null);
    toast.success('Đã xóa.');
  };

  // Get workflow for active execution
  const activeWorkflow = activeExecution ? workflows.find(w => w.id === activeExecution.workflowId) : null;

  // === RENDER ===
  return (
    <div className="space-y-6">
      {showManager && <WorkflowManager workflows={workflows} onClose={() => setShowManager(false)} />}

      {/* === HEADER + NEW EXECUTION FORM === */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Rocket size={22} className="text-blue-600" /> Triển khai Kế hoạch</h2>
            <p className="text-sm text-slate-500 mt-0.5">Quản lý quy trình thực hiện theo hình thức đấu thầu</p>
          </div>
          {isAdmin && (
            <button onClick={() => setShowManager(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 text-sm shadow-lg">
              <Settings2 size={16} /> Quản lý Quy trình
            </button>
          )}
        </div>

        {/* New execution form */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          {/* Row 1: Năm + Phòng ban + Mã KH + Hình thức */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-[110px] space-y-1 shrink-0">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Năm kế hoạch</label>
              <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[160px] space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Phòng ban thực hiện</label>
              {isAdmin ? (
                <select value={formDept} onChange={e => setFormDept(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">-- Chọn phòng ban --</option>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              ) : (
                <input value={userDept || ''} disabled className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm opacity-70 cursor-not-allowed" />
              )}
            </div>
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Mã Kế hoạch <span className="text-slate-300 font-normal normal-case">({availablePlans.length} mã)</span></label>
              <select value={selectedPlanId} onChange={e => setSelectedPlanId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- Chọn mã KH --</option>
                {availablePlans.map(p => (
                  <option key={p.id} value={p.id}>{p.planId} — {(p.description || '').substring(0, 50)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px] space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Hình thức thực hiện</label>
              <select value={selectedWorkflowId} onChange={e => setSelectedWorkflowId(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">-- Chọn hình thức --</option>
                {workflows.map(w => (
                  <option key={w.id} value={w.id}>{w.name} ({w.steps.length} bước)</option>
                ))}
              </select>
            </div>
          </div>
          {/* Row 2: Tên công việc + Người thực hiện + Giá dự toán + Button */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Tên công việc <span className="text-red-500">*</span></label>
              <input value={formTaskName} onChange={e => setFormTaskName(e.target.value)} placeholder="VD: Mua sắm thiết bị PCCC" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex-1 min-w-[160px] space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Người thực hiện / Phụ trách</label>
              <input value={formAssignee} onChange={e => setFormAssignee(e.target.value)} placeholder="Họ và tên" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div className="flex-1 min-w-[160px] space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Giá dự toán (VNĐ)</label>
              <input type="number" value={formEstimatedPrice} onChange={e => setFormEstimatedPrice(e.target.value)} placeholder="0" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <button onClick={handleStartExecution} disabled={!selectedPlanId || !selectedWorkflowId || !formTaskName.trim()} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold rounded-xl hover:from-blue-700 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg shadow-blue-200 flex items-center gap-2 whitespace-nowrap">
              <Play size={16} /> Bắt đầu triển khai
            </button>
          </div>
        </div>
      </div>

      {/* === STEPPER VIEW === */}
      <AnimatePresence mode="wait">
        {activeExecution && activeWorkflow && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Stepper header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider">Đang triển khai</p>
                  <h3 className="font-bold text-lg">{plans.find(p => p.id === activeExecution.planDocId)?.planId || activeExecution.planId} — {activeWorkflow.name}</h3>
                  <p className="text-blue-200 text-sm mt-0.5">{activeExecution.planDescription}</p>
                </div>
                <button onClick={() => setActiveExecution(null)} className="p-2 hover:bg-white/10 rounded-lg text-blue-200 hover:text-white"><X size={20} /></button>
              </div>
            </div>

            {/* Horizontal stepper */}
            <div className="px-6 py-6 overflow-x-auto">
              <div className="flex items-center min-w-max gap-0">
                {activeWorkflow.steps.map((step, idx) => {
                  const isCurrent = idx === activeExecution.currentStep;
                  const isCompleted = idx < activeExecution.currentStep;
                  const isFuture = idx > activeExecution.currentStep;
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && (
                        <div className={`h-0.5 w-8 sm:w-12 flex-shrink-0 transition-colors duration-300 ${isCompleted ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                      )}
                      <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer" onClick={() => { if (isCompleted || isCurrent) { /* allow reviewing completed steps but stay on current */ } }}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' :
                          isCurrent ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-4 ring-blue-100' :
                          'bg-slate-100 text-slate-400'
                        }`}>
                          {isCompleted ? <Check size={18} /> : idx + 1}
                        </div>
                        <span className={`text-[10px] font-semibold text-center max-w-[80px] leading-tight ${
                          isCurrent ? 'text-blue-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          Bước {idx + 1}
                        </span>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Current step content */}
            {(() => {
              const step = activeWorkflow.steps[activeExecution.currentStep];
              if (!step) return null;
              const stepData = activeExecution.stepsData?.[activeExecution.currentStep];
              const canAdvance = canAdvanceStep(activeExecution, activeWorkflow, activeExecution.currentStep);
              const isLastStep = activeExecution.currentStep === activeWorkflow.steps.length - 1;
              const hasNoRequirements = step.checklist.length === 0 && step.inputFields.length === 0;

              return (
                <div className="px-6 pb-6 space-y-5">
                  <div className="p-5 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 border border-slate-200/80">
                    <h4 className="font-bold text-slate-900 text-lg mb-1">{step.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={12} /> Bước {activeExecution.currentStep + 1}/{activeExecution.totalSteps}</span>
                      {step.checklist.length > 0 && <span className="flex items-center gap-1"><FileCheck size={12} /> {Object.values(stepData?.checklist || {}).filter(Boolean).length}/{step.checklist.length} hồ sơ</span>}
                    </div>
                  </div>

                  {/* Checklist */}
                  {step.checklist.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">📋 Checklist hồ sơ</h5>
                      <div className="space-y-1.5">
                        {step.checklist.map(cl => {
                          const checked = !!stepData?.checklist?.[cl.id];
                          return (
                            <label key={cl.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${checked ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200 hover:border-blue-200'}`}>
                              <input type="checkbox" checked={checked} onChange={e => handleChecklistToggle(activeExecution, activeExecution.currentStep, cl.id, e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                              <span className={`text-sm ${checked ? 'text-emerald-700 line-through opacity-70' : 'text-slate-700'}`}>{cl.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Input fields */}
                  {step.inputFields.length > 0 && (
                    <div className="space-y-3">
                      <h5 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">📝 Trường dữ liệu bắt buộc</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {step.inputFields.map(inp => (
                          <div key={inp.id} className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">{inp.label} {inp.required && <span className="text-red-500">*</span>}</label>
                            <input
                              type={inp.type}
                              value={stepData?.inputs?.[inp.id] || ''}
                              onChange={e => handleInputChange(activeExecution, activeExecution.currentStep, inp.id, e.target.value)}
                              placeholder={inp.placeholder || ''}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* No requirements message */}
                  {hasNoRequirements && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-center gap-2">
                      <AlertCircle size={16} className="shrink-0" /> Bước này không yêu cầu hồ sơ bổ sung. Bạn có thể chuyển sang bước tiếp theo.
                    </div>
                  )}

                  {/* Advance button */}
                  <div className="pt-2">
                    <button onClick={() => handleAdvanceStep(activeExecution)} disabled={!canAdvance} className={`w-full px-6 py-3.5 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                      canAdvance
                        ? 'bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-lg shadow-blue-200 hover:from-blue-700 hover:to-emerald-600 active:scale-[0.98]'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}>
                      {isLastStep ? (
                        <><CheckCircle2 size={18} /> Hoàn thành quy trình</>
                      ) : (
                        <><ChevronRight size={18} /> Hoàn thành bước {activeExecution.currentStep + 1} → Chuyển bước {activeExecution.currentStep + 2}</>
                      )}
                    </button>
                    {!canAdvance && (step.checklist.length > 0 || step.inputFields.filter(i => i.required).length > 0) && (
                      <p className="text-[10px] text-center text-red-400 mt-2">⚠ Vui lòng hoàn thành tất cả checklist và trường bắt buộc để chuyển bước.</p>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* === EXECUTIONS TABLE === */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-bold text-slate-900">Danh sách triển khai</h3>
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Tìm kiếm..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Mã KH</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Tên công việc</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Hình thức</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Phòng ban</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Người thực hiện</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Giá dự toán</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Tiến độ</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Ngày tạo</th>
                <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="px-6 py-8 text-center text-slate-400">Đang tải...</td></tr>
              ) : filteredExecutions.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-8 text-center text-slate-400">Chưa có triển khai nào.</td></tr>
              ) : filteredExecutions.map(exec => {
                const progress = exec.totalSteps > 0 ? Math.round((exec.currentStep / exec.totalSteps) * 100) : 0;
                const isComplete = exec.status === 'completed';
                return (
                  <tr key={exec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm text-blue-600 font-semibold">{plans.find(p => p.id === exec.planDocId)?.planId || exec.planId}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium max-w-[200px] truncate" title={exec.taskName}>{exec.taskName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{exec.workflowName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{exec.departmentName}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{exec.assignee || '-'}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-bold text-right">{(exec.estimatedPrice || 0).toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                          <div className={`h-full rounded-full transition-all ${isComplete ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${isComplete ? 100 : progress}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-500">{isComplete ? exec.totalSteps : exec.currentStep}/{exec.totalSteps}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isComplete ? 'Hoàn thành' : 'Đang xử lý'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{exec.createdAt ? new Date(exec.createdAt).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!isComplete && (
                          <button onClick={() => setActiveExecution(exec)} className="px-3 py-1 bg-blue-100 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-200">Tiếp tục</button>
                        )}
                        {isComplete && (
                          <button onClick={() => setActiveExecution(exec)} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200">Xem</button>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleDeleteExecution(exec.id)} className="px-3 py-1 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200">Xóa</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
