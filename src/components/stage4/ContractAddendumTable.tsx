import React, { useState } from 'react';
import { ContractAddendum } from '../../pms/T2_Services';
import { formatVND, formatCurrencyInputMask, parseCurrencyInputMask } from '../../pms/T1_Utils';
import { FileText, Plus, Pencil, Trash2, Check, X, Paperclip } from 'lucide-react';
import { toast } from 'sonner';

interface ContractAddendumTableProps {
  contractId: string;
  addendums: ContractAddendum[];
  onUpdateAddendums: (addendums: ContractAddendum[]) => void;
}

export default function ContractAddendumTable({ contractId, addendums: initialAddendums, onUpdateAddendums }: ContractAddendumTableProps) {
  const [addendums, setAddendums] = useState<ContractAddendum[]>(initialAddendums);
  const [editingAddendumId, setEditingAddendumId] = useState<string | null>(null);
  const [draftAddendum, setDraftAddendum] = useState<Partial<ContractAddendum>>({});

  const handleEditAddendum = (add: ContractAddendum) => {
    setEditingAddendumId(add.addendumId);
    setDraftAddendum({ ...add });
  };

  const handleSaveRow = (addendumId: string) => {
    const updated = addendums.map(add => {
      if (add.addendumId === addendumId) {
        return {
          ...add,
          ...draftAddendum,
          adjustedValue: Number(draftAddendum.adjustedValue) || 0,
          adjustedDurationDays: Number(draftAddendum.adjustedDurationDays) || 0
        } as ContractAddendum;
      }
      return add;
    });
    setAddendums(updated);
    onUpdateAddendums(updated);
    setEditingAddendumId(null);
    toast.success(`Đã cập nhật phụ lục ${addendumId}`);
  };

  const handleDeleteAddendum = (add: ContractAddendum) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phụ lục hợp đồng [${add.addendumNo}] không?`)) {
      const updated = addendums.filter(a => a.addendumId !== add.addendumId);
      setAddendums(updated);
      onUpdateAddendums(updated);
      toast.success(`Đã xóa phụ lục ${add.addendumId}`);
    }
  };

  const handleAddNewAddendum = () => {
    const newId = `PL-${Date.now().toString().slice(-4)}`;
    const newAdd: ContractAddendum = {
      addendumId: newId,
      addendumNo: `PL-${newId}/2026`,
      signDate: new Date().toISOString().split('T')[0],
      adjustedValue: 5000000000,
      adjustedDurationDays: 15,
      reason: 'Bổ sung móng cọc chịu lực đợt 2'
    };
    const updated = [...addendums, newAdd];
    setAddendums(updated);
    onUpdateAddendums(updated);
    handleEditAddendum(newAdd);
    toast.info(`Đã thêm phụ lục mới. Hãy chỉnh sửa.`);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Khối B: Danh sách phụ lục hợp đồng điều chỉnh
          </h3>
          <p className="text-xs text-slate-500">Quản lý các phụ lục điều chỉnh giá trị, tiến độ và bổ sung khối lượng</p>
        </div>

        <button
          onClick={handleAddNewAddendum}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Tạo phụ lục mới
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs text-left text-slate-600">
          <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-3 py-2.5">Mã PL</th>
              <th className="px-3 py-2.5">Số phụ lục hợp đồng</th>
              <th className="px-3 py-2.5">Ngày ký</th>
              <th className="px-3 py-2.5 text-right">Giá trị điều chỉnh (+/- VNĐ)</th>
              <th className="px-3 py-2.5 text-center">Gia hạn (Ngày)</th>
              <th className="px-3 py-2.5">Lý do & nội dung điều chỉnh</th>
              <th className="px-3 py-2.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {addendums.map(add => {
              const isEditing = editingAddendumId === add.addendumId;
              return (
                <tr key={add.addendumId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono tabular-nums font-bold text-indigo-700">
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftAddendum.addendumId || ''}
                        onChange={e => setDraftAddendum({ ...draftAddendum, addendumId: e.target.value })}
                        className="w-16 px-1.5 py-0.5 border rounded font-mono tabular-nums"
                      />
                    ) : (
                      add.addendumId
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums font-bold text-slate-900">
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftAddendum.addendumNo || ''}
                        onChange={e => setDraftAddendum({ ...draftAddendum, addendumNo: e.target.value })}
                        className="w-full px-1.5 py-0.5 border rounded font-mono tabular-nums font-bold"
                      />
                    ) : (
                      add.addendumNo
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums">
                    {isEditing ? (
                      <input
                        type="date"
                        value={draftAddendum.signDate || ''}
                        onChange={e => setDraftAddendum({ ...draftAddendum, signDate: e.target.value })}
                        className="px-1.5 py-0.5 border rounded font-mono tabular-nums"
                      />
                    ) : (
                      add.signDate
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-emerald-700">
                    {isEditing ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatCurrencyInputMask(draftAddendum.adjustedValue || 0)}
                        onChange={e => setDraftAddendum({ ...draftAddendum, adjustedValue: parseCurrencyInputMask(e.target.value) })}
                        className="w-36 px-1.5 py-0.5 border rounded text-right font-mono tabular-nums font-bold"
                      />
                    ) : (
                      `+${formatVND(add.adjustedValue)}`
                    )}
                  </td>
                  <td className="px-3 py-2 text-center font-mono tabular-nums font-bold text-indigo-700">
                    {isEditing ? (
                      <input
                        type="number"
                        value={draftAddendum.adjustedDurationDays || 0}
                        onChange={e => setDraftAddendum({ ...draftAddendum, adjustedDurationDays: Number(e.target.value) || 0 })}
                        className="w-16 px-1 py-0.5 border rounded text-center font-mono tabular-nums font-bold"
                      />
                    ) : (
                      `+${add.adjustedDurationDays}`
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftAddendum.reason || ''}
                        onChange={e => setDraftAddendum({ ...draftAddendum, reason: e.target.value })}
                        className="w-full px-1.5 py-0.5 border rounded"
                      />
                    ) : (
                      add.reason
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isEditing ? (
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleSaveRow(add.addendumId)} className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingAddendumId(null)} className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditAddendum(add)} className="text-indigo-600 hover:text-indigo-800 p-1"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteAddendum(add)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
