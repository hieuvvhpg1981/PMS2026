import React, { useState } from 'react';
import { ProjectData, ContractManagementRecord, BoqItem, ContractAddendum } from '../../pms/T2_Services';
import { formatVND } from '../../pms/T1_Utils';
import ContractBoqTable from './ContractBoqTable';
import ContractAddendumTable from './ContractAddendumTable';
import { ArrowLeft, FileText, Building2, ShieldCheck, DollarSign } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ContractDetailContainerProps {
  project: ProjectData;
  contract: ContractManagementRecord;
  onBackToMaster: () => void;
}

export default function ContractDetailContainer({ project, contract, onBackToMaster }: ContractDetailContainerProps) {
  const [subTab, setSubTab] = useState<'BOQ' | 'ADDENDUM'>('BOQ');
  const [boqItems, setBoqItems] = useState<BoqItem[]>(project.BOQ_ITEMS_GDA2 || []);
  const [addendums, setAddendums] = useState<ContractAddendum[]>(contract.addendums || []);

  const totalAddendumValue = addendums.reduce((acc, curr) => acc + curr.adjustedValue, 0);
  const totalAdjustedContractVal = contract.contractValue + totalAddendumValue;

  return (
    <div className="space-y-6">
      {/* Detail View Header with Back Button */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToMaster}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2.5 rounded-xl transition-all border border-slate-300 flex items-center justify-center shrink-0"
            title="Quay lại danh sách Hợp đồng"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <span>CHI TIẾT HỢP ĐỒNG MASTER-DETAIL (LEVEL 2 DETAIL VIEW)</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900">
              {contract.contractNo} - {contract.contractorName}
            </h2>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-xs space-y-0.5">
          <div className="font-bold text-blue-900">
            Giá trị HĐ sau phụ lục: <span className="font-mono text-base font-extrabold text-emerald-700">{formatVND(totalAdjustedContractVal)}</span>
          </div>
          <div className="text-[11px] text-blue-800">
            Giá gốc: {formatVND(contract.contractValue)} | Điều chỉnh: +{formatVND(totalAddendumValue)}
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation for Level 2 Detail View */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
        <button
          onClick={() => setSubTab('BOQ')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all",
            subTab === 'BOQ'
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <Building2 className="w-4 h-4" />
          <span>Khối A: Dự Toán BOQ Hợp Đồng Gốc</span>
        </button>

        <button
          onClick={() => setSubTab('ADDENDUM')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all",
            subTab === 'ADDENDUM'
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <FileText className="w-4 h-4" />
          <span>Khối B: Danh Sách Phụ LụcHợp Đồng ({addendums.length})</span>
        </button>
      </div>

      {/* Render Selected Sub-Tab Section */}
      {subTab === 'BOQ' ? (
        <ContractBoqTable
          project={project}
          contractId={contract.contractId}
          boqItems={boqItems}
          onUpdateBoqItems={setBoqItems}
        />
      ) : (
        <ContractAddendumTable
          contractId={contract.contractId}
          addendums={addendums}
          onUpdateAddendums={setAddendums}
        />
      )}
    </div>
  );
}
