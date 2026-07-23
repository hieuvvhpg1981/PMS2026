import React, { useState } from 'react';
import { BoqItem, ProjectData } from '../../pms/T2_Services';
import { formatVND, safeNumber, generateExcelTemplate } from '../../pms/T1_Utils';
import ExcelDragDropUploader from '../ExcelDragDropUploader';
import { Building2, Download, Upload, PlusCircle, Pencil, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface ContractBoqTableProps {
  project: ProjectData;
  contractId: string;
  boqItems: BoqItem[];
  onUpdateBoqItems: (items: BoqItem[]) => void;
}

export default function ContractBoqTable({ project, contractId, boqItems: initialBoqItems, onUpdateBoqItems }: ContractBoqTableProps) {
  const [boqItems, setBoqItems] = useState<BoqItem[]>(initialBoqItems);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [draftItem, setDraftItem] = useState<Partial<BoqItem>>({});

  // Excel Modal
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);

  const handleEditItem = (item: BoqItem) => {
    setEditingItemId(item.itemId);
    setDraftItem({ ...item });
  };

  const handleSaveRow = (itemId: string) => {
    const updated = boqItems.map(item => {
      if (item.itemId === itemId) {
        const qty = safeNumber(draftItem.quantity);
        const price = safeNumber(draftItem.unitPrice);
        return {
          ...item,
          ...draftItem,
          quantity: qty,
          unitPrice: price,
          totalAmount: qty * price
        } as BoqItem;
      }
      return item;
    });
    setBoqItems(updated);
    onUpdateBoqItems(updated);
    setEditingItemId(null);
    toast.success(`Đã cập nhật hạng mục BOQ ${itemId}`);
  };

  const handleDeleteItem = (item: BoqItem) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa hạng mục [${item.itemName}] không?`)) {
      const updated = boqItems.filter(i => i.itemId !== item.itemId);
      setBoqItems(updated);
      onUpdateBoqItems(updated);
      toast.success(`Đã xóa hạng mục BOQ ${item.itemId}`);
    }
  };

  const handleAddNewRow = () => {
    const newId = `BOQ-${Date.now().toString().slice(-4)}`;
    const newItem: BoqItem = {
      itemId: newId,
      itemCode: `AF.${Math.floor(10000 + Math.random() * 90000)}`,
      itemName: 'Hạng mục bóc tách BOQ mới',
      unit: 'm3',
      quantity: 1000,
      unitPrice: 2500000,
      totalAmount: 2500000000,
      category: 'XÂY_LẮP'
    };
    const updated = [...boqItems, newItem];
    setBoqItems(updated);
    onUpdateBoqItems(updated);
    handleEditItem(newItem);
    toast.info(`Đã thêm dòng BOQ mới. Hãy chỉnh sửa.`);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            KHỐI A: BẢNG DỰ TOÁN BOQ HỢP ĐỒNG GỐC (CONTRACT BOQ)
          </h3>
          <p className="text-xs text-slate-500">Danh mục mã định mức, đơn giá và tổng giá trị gói thầu ký kết</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => generateExcelTemplate('BOQ')}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all border border-slate-300 flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-blue-600" /> Tải Template BOQ
          </button>

          <button
            onClick={() => setIsExcelModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" /> Upload Excel BOQ
          </button>
        </div>
      </div>

      {/* BOQ Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs text-left text-slate-600">
          <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
            <tr>
              <th className="px-3 py-2.5">Mã ĐM</th>
              <th className="px-3 py-2.5">Tên Hạng Mục Công Việc</th>
              <th className="px-3 py-2.5 text-center">ĐVT</th>
              <th className="px-3 py-2.5 text-right font-mono">Khối Lượng HĐ</th>
              <th className="px-3 py-2.5 text-right font-mono">Đơn Giá HĐ (VND)</th>
              <th className="px-3 py-2.5 text-right font-mono">Thành Tiền (VND)</th>
              <th className="px-3 py-2.5 text-center">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {boqItems.map(item => {
              const isEditing = editingItemId === item.itemId;
              return (
                <tr key={item.itemId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono font-bold text-blue-700">
                    {isEditing ? (
                      <input
                        type="text"
                        value={draftItem.itemCode || ''}
                        onChange={e => setDraftItem({ ...draftItem, itemCode: e.target.value })}
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
                        value={draftItem.itemName || ''}
                        onChange={e => setDraftItem({ ...draftItem, itemName: e.target.value })}
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
                        value={draftItem.unit || ''}
                        onChange={e => setDraftItem({ ...draftItem, unit: e.target.value })}
                        className="w-14 px-1 py-0.5 border rounded text-center"
                      />
                    ) : (
                      item.unit
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold">
                    {isEditing ? (
                      <input
                        type="number"
                        value={draftItem.quantity || 0}
                        onChange={e => setDraftItem({ ...draftItem, quantity: Number(e.target.value) || 0 })}
                        className="w-24 px-1.5 py-0.5 border rounded text-right font-mono font-bold"
                      />
                    ) : (
                      item.quantity.toLocaleString('vi-VN')
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={draftItem.unitPrice || 0}
                        onChange={e => setDraftItem({ ...draftItem, unitPrice: Number(e.target.value) || 0 })}
                        className="w-28 px-1.5 py-0.5 border rounded text-right font-mono"
                      />
                    ) : (
                      formatVND(item.unitPrice)
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">
                    {isEditing ? (
                      formatVND(safeNumber(draftItem.quantity) * safeNumber(draftItem.unitPrice))
                    ) : (
                      formatVND(item.quantity * item.unitPrice)
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isEditing ? (
                      <div className="flex justify-center gap-1">
                        <button onClick={() => handleSaveRow(item.itemId)} className="p-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingItemId(null)} className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEditItem(item)} className="text-blue-600 hover:text-blue-800 p-1"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteItem(item)} className="text-red-500 hover:text-red-700 p-1"><Trash2 className="w-4 h-4" /></button>
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
        onClick={handleAddNewRow}
        className="w-full bg-slate-50 hover:bg-blue-50/60 text-blue-700 border-2 border-dashed border-blue-200 font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <PlusCircle className="w-4 h-4" /> [+ THÊM CÔNG TÁC BOQ MỚI]
      </button>

      {/* Excel Import Drag-and-Drop Modal */}
      <ExcelDragDropUploader
        projectId={project.PROJECT_ID}
        schemaType="BOQ"
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImportSuccess={() => toast.success('Đã import Excel BOQ thành công')}
      />
    </div>
  );
}
