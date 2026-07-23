import React from 'react';
import { ContractManagementRecord } from '../../pms/T2_Services';
import { formatVND } from '../../pms/T1_Utils';
import { FileText, Search, Plus, Pencil, Trash2, ShieldCheck, ArrowRight } from 'lucide-react';

interface ContractMasterTableProps {
  contracts: ContractManagementRecord[];
  onSelectContract: (contractId: string) => void;
  onAddNewContract: () => void;
  onEditContract: (contract: ContractManagementRecord) => void;
  onDeleteContract: (contract: ContractManagementRecord) => void;
}

export default function ContractMasterTable({
  contracts,
  onSelectContract,
  onAddNewContract,
  onEditContract,
  onDeleteContract
}: ContractMasterTableProps) {
  const totalContractVal = contracts.reduce((acc, c) => acc + c.contractValue, 0);
  const totalAddendumVal = contracts.reduce((acc, c) => {
    const addVal = (c.addendums || []).reduce((a, item) => a + item.adjustedValue, 0);
    return acc + addVal;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Mini-Dashboard Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500">Tổng Số Hợp Đồng Đã Ký</div>
          <div className="text-xl font-extrabold text-blue-900 font-mono">{contracts.length} Hợp đồng</div>
          <div className="text-[11px] text-slate-400">Tất cả các gói thầu dự án</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500">Tổng Giá Trị Hợp Đồng Toàn Dự Án</div>
          <div className="text-xl font-extrabold text-blue-700 font-mono">{formatVND(totalContractVal)}</div>
          <div className="text-[11px] text-emerald-600 font-semibold">Theo Hợp đồng ký kết ban đầu</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500">Tổng Giá Trị Phụ Lục Phát Sinh</div>
          <div className="text-xl font-extrabold text-purple-700 font-mono">+{formatVND(totalAddendumVal)}</div>
          <div className="text-[11px] text-purple-600 font-semibold">Đã phê duyệt điều chỉnh</div>
        </div>
      </div>

      {/* Contract Summary Master Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              DANH SÁCH TỔNG QUAN HỢP ĐỒNG DỰ ÁN (MASTER CONTRACT LIST)
            </h3>
            <p className="text-xs text-slate-500">Quản lý pháp lý, hạn mức hợp đồng và đối tác nhà thầu trúng thầu</p>
          </div>

          <button
            onClick={onAddNewContract}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> [+ Thêm Hợp Đồng Mới]
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 text-center">STT</th>
                <th className="px-3 py-2.5">Số Hợp Đồng</th>
                <th className="px-3 py-2.5">Tên Hợp Đồng / Gói Thầu</th>
                <th className="px-3 py-2.5">Nhà Thầu Thực Hiện</th>
                <th className="px-3 py-2.5">Hình Thức HĐ</th>
                <th className="px-3 py-2.5 text-right font-mono">Giá Trị HĐ (VND)</th>
                <th className="px-3 py-2.5 font-mono">Ngày Ký</th>
                <th className="px-3 py-2.5 text-center">Trạng Thái</th>
                <th className="px-3 py-2.5 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {contracts.map((c, index) => (
                <tr key={c.contractId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-center font-bold text-slate-500">{index + 1}</td>
                  <td className="px-3 py-2 font-mono font-bold text-blue-700">{c.contractNo}</td>
                  <td className="px-3 py-2 font-bold text-slate-900">{c.contractName}</td>
                  <td className="px-3 py-2 text-slate-800 font-semibold">{c.contractorName}</td>
                  <td className="px-3 py-2 text-slate-600">{c.contractType}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-blue-900">{formatVND(c.contractValue)}</td>
                  <td className="px-3 py-2 font-mono">{c.signDate}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex justify-center items-center gap-1.5">
                      <button
                        onClick={() => onSelectContract(c.contractId)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Search className="w-3.5 h-3.5" /> <span>Xem BOQ & Phụ Lục</span>
                      </button>

                      <button
                        onClick={() => onEditContract(c)}
                        className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteContract(c)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
