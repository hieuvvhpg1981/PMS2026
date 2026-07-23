import React, { useState } from 'react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Plus, X, Save, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import type { WorkflowDefinition, WorkflowStep, ChecklistItem, InputField } from '../config/workflowDefinitions';

interface Props {
  workflows: WorkflowDefinition[];
  onClose: () => void;
}

export default function WorkflowManager({ workflows, onClose }: Props) {
  const [editing, setEditing] = useState<WorkflowDefinition | null>(null);
  const [isNew, setIsNew] = useState(false);

  const handleNew = () => {
    setEditing({
      id: `wf_${Date.now()}`,
      name: '',
      shortName: '',
      steps: [{ stepIndex: 0, title: 'Bước 1', checklist: [], inputFields: [] }],
    });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editing || !editing.name || !editing.shortName) {
      toast.error('Vui lòng nhập đầy đủ tên và mã ngắn.');
      return;
    }
    const toastId = toast.loading('Đang lưu quy trình...');
    try {
      const data = {
        ...editing,
        steps: editing.steps.map((s, i) => ({ ...s, stepIndex: i })),
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'system',
      };
      if (isNew) data.createdAt = new Date().toISOString();
      await setDoc(doc(db, 'workflow_definitions', editing.id), data, { merge: true });
      toast.success('Đã lưu quy trình thành công!', { id: toastId });
      setEditing(null);
      setIsNew(false);
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message, { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa quy trình này? Hành động không thể hoàn tác.')) return;
    try {
      await deleteDoc(doc(db, 'workflow_definitions', id));
      toast.success('Đã xóa quy trình.');
      if (editing?.id === id) setEditing(null);
    } catch (err: any) {
      toast.error('Lỗi: ' + err.message);
    }
  };

  const updateStep = (idx: number, patch: Partial<WorkflowStep>) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[idx] = { ...steps[idx], ...patch };
    setEditing({ ...editing, steps });
  };

  const addStep = () => {
    if (!editing) return;
    setEditing({
      ...editing,
      steps: [...editing.steps, { stepIndex: editing.steps.length, title: `Bước ${editing.steps.length + 1}`, checklist: [], inputFields: [] }],
    });
  };

  const removeStep = (idx: number) => {
    if (!editing || editing.steps.length <= 1) return;
    setEditing({ ...editing, steps: editing.steps.filter((_, i) => i !== idx) });
  };

  const addChecklist = (stepIdx: number) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[stepIdx] = {
      ...steps[stepIdx],
      checklist: [...steps[stepIdx].checklist, { id: `cl_${Date.now()}`, label: '' }],
    };
    setEditing({ ...editing, steps });
  };

  const updateChecklist = (stepIdx: number, clIdx: number, label: string) => {
    if (!editing) return;
    const steps = [...editing.steps];
    const cl = [...steps[stepIdx].checklist];
    cl[clIdx] = { ...cl[clIdx], label };
    steps[stepIdx] = { ...steps[stepIdx], checklist: cl };
    setEditing({ ...editing, steps });
  };

  const removeChecklist = (stepIdx: number, clIdx: number) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[stepIdx] = { ...steps[stepIdx], checklist: steps[stepIdx].checklist.filter((_, i) => i !== clIdx) };
    setEditing({ ...editing, steps });
  };

  const addInput = (stepIdx: number) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[stepIdx] = {
      ...steps[stepIdx],
      inputFields: [...steps[stepIdx].inputFields, { id: `inp_${Date.now()}`, label: '', type: 'text', required: true, placeholder: '' }],
    };
    setEditing({ ...editing, steps });
  };

  const updateInput = (stepIdx: number, inpIdx: number, patch: Partial<InputField>) => {
    if (!editing) return;
    const steps = [...editing.steps];
    const inputs = [...steps[stepIdx].inputFields];
    inputs[inpIdx] = { ...inputs[inpIdx], ...patch };
    steps[stepIdx] = { ...steps[stepIdx], inputFields: inputs };
    setEditing({ ...editing, steps });
  };

  const removeInput = (stepIdx: number, inpIdx: number) => {
    if (!editing) return;
    const steps = [...editing.steps];
    steps[stepIdx] = { ...steps[stepIdx], inputFields: steps[stepIdx].inputFields.filter((_, i) => i !== inpIdx) };
    setEditing({ ...editing, steps });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-bold text-lg">⚙️ Quản lý Quy trình Đấu thầu</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* List existing workflows */}
          {!editing && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Danh sách quy trình ({workflows.length})</p>
                <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 text-sm shadow-lg shadow-emerald-200">
                  <Plus size={16} /> Thêm quy trình mới
                </button>
              </div>
              <div className="space-y-3">
                {workflows.map(wf => (
                  <div key={wf.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors">
                    <div>
                      <p className="font-bold text-slate-900">{wf.name}</p>
                      <p className="text-xs text-slate-500">Mã: {wf.shortName} · {wf.steps.length} bước</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditing(JSON.parse(JSON.stringify(wf))); setIsNew(false); }} className="px-3 py-1.5 bg-blue-100 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-200">Sửa</button>
                      <button onClick={() => handleDelete(wf.id)} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200">Xóa</button>
                    </div>
                  </div>
                ))}
                {workflows.length === 0 && <p className="text-center text-slate-400 py-8">Chưa có quy trình nào. Hãy thêm mới!</p>}
              </div>
            </>
          )}

          {/* Edit form */}
          {editing && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900">{isNew ? '➕ Thêm quy trình mới' : '✏️ Chỉnh sửa quy trình'}</h4>
                <button onClick={() => { setEditing(null); setIsNew(false); }} className="text-sm text-slate-500 hover:text-slate-700 underline">← Quay lại danh sách</button>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tên quy trình</label>
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="VD: Chỉ định thầu thông thường" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Mã ngắn</label>
                  <input value={editing.shortName} onChange={e => setEditing({ ...editing, shortName: e.target.value })} placeholder="VD: CĐTTT" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-slate-700 text-sm">CÁC BƯỚC ({editing.steps.length})</h5>
                  <button onClick={addStep} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"><Plus size={14} /> Thêm bước</button>
                </div>

                {editing.steps.map((step, si) => (
                  <StepEditor
                    // @ts-ignore key is a React-only prop
                    key={`step-${si}`}
                    step={step}
                    index={si}
                    canDelete={editing.steps.length > 1}
                    onUpdate={(patch) => updateStep(si, patch)}
                    onRemove={() => removeStep(si)}
                    onAddChecklist={() => addChecklist(si)}
                    onUpdateChecklist={(ci, label) => updateChecklist(si, ci, label)}
                    onRemoveChecklist={(ci) => removeChecklist(si, ci)}
                    onAddInput={() => addInput(si)}
                    onUpdateInput={(ii, patch) => updateInput(si, ii, patch)}
                    onRemoveInput={(ii) => removeInput(si, ii)}
                  />
                ))}
              </div>

              {/* Save */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => { setEditing(null); setIsNew(false); }} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200">Hủy</button>
                <button onClick={handleSave} className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center justify-center gap-2"><Save size={18} /> Lưu quy trình</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === Step Editor Sub-component ===
function StepEditor({ step, index, canDelete, onUpdate, onRemove, onAddChecklist, onUpdateChecklist, onRemoveChecklist, onAddInput, onUpdateInput, onRemoveInput }: {
  step: WorkflowStep; index: number; canDelete: boolean;
  onUpdate: (patch: Partial<WorkflowStep>) => void; onRemove: () => void;
  onAddChecklist: () => void; onUpdateChecklist: (ci: number, label: string) => void; onRemoveChecklist: (ci: number) => void;
  onAddInput: () => void; onUpdateInput: (ii: number, patch: Partial<InputField>) => void; onRemoveInput: (ii: number) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      {/* Step header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{index + 1}</div>
        <input value={step.title} onChange={e => { e.stopPropagation(); onUpdate({ title: e.target.value }); }} onClick={e => e.stopPropagation()} className="flex-1 px-2 py-1 bg-transparent border-b border-transparent hover:border-blue-200 focus:border-blue-500 outline-none text-sm font-semibold" placeholder="Tên bước..." />
        <button onClick={e => { e.stopPropagation(); setCollapsed(!collapsed); }} className="p-1 text-slate-400 hover:text-slate-600">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
        {canDelete && <button onClick={e => { e.stopPropagation(); onRemove(); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>}
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Checklist section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-600 uppercase">📋 Checklist hồ sơ ({step.checklist.length})</span>
              <button onClick={onAddChecklist} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold hover:bg-emerald-100"><Plus size={12} /> Thêm</button>
            </div>
            {step.checklist.map((cl, ci) => (
              <div key={cl.id} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 w-5 text-right shrink-0">{ci + 1}.</span>
                <input value={cl.label} onChange={e => onUpdateChecklist(ci, e.target.value)} className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 outline-none" placeholder="Nội dung hồ sơ cần kiểm tra..." />
                <button onClick={() => onRemoveChecklist(ci)} className="p-1 text-red-300 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>

          {/* Input fields section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-blue-600 uppercase">📝 Trường nhập liệu ({step.inputFields.length})</span>
              <button onClick={onAddInput} className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-100"><Plus size={12} /> Thêm</button>
            </div>
            {step.inputFields.map((inp, ii) => (
              <div key={inp.id} className="flex items-center gap-2 flex-wrap">
                <input value={inp.label} onChange={e => onUpdateInput(ii, { label: e.target.value })} className="flex-1 min-w-[150px] px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Nhãn trường..." />
                <select value={inp.type} onChange={e => onUpdateInput(ii, { type: e.target.value as any })} className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <option value="text">Text</option>
                  <option value="date">Date</option>
                  <option value="datetime-local">DateTime</option>
                </select>
                <label className="flex items-center gap-1 text-[10px] text-slate-500">
                  <input type="checkbox" checked={inp.required} onChange={e => onUpdateInput(ii, { required: e.target.checked })} className="w-3 h-3" /> Bắt buộc
                </label>
                <button onClick={() => onRemoveInput(ii)} className="p-1 text-red-300 hover:text-red-500"><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
