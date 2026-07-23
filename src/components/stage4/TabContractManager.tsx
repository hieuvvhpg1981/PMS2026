import React, { useState } from 'react';
import { ProjectData, ContractManagementRecord } from '../../pms/T2_Services';
import ContractMasterTable from './ContractMasterTable';
import ContractDetailContainer from './ContractDetailContainer';
import { toast } from 'sonner';

interface TabContractManagerProps {
  project: ProjectData;
  selectedPackageId: string;
}

export default function TabContractManager({ project, selectedPackageId }: TabContractManagerProps) {
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<ContractManagementRecord[]>(
    project.CONTRACT_ITEMS_GDA3 || [
      {
        contractId: 'HD-01',
        packageId: selectedPackageId === 'ALL' ? 'GT-XL-01' : selectedPackageId,
        contractNo: '01/2026/HĐ-XL',
        contractName: 'Hợp đồng Thi công Xây lắp Cầu & Đường dẫn',
        contractorName: 'Tập đoàn Xây dựng Đèo Cả - Vinaconex',
        contractType: 'ĐƠN_GIÁ_ĐIỀU_CHỈNH',
        contractValue: project.TONG_GIA_TRI_HOP_DONG || 880000000000,
        advancePct: 20,
        retentionPct: 5,
        signDate: '2026-05-10',
        startDate: '2026-05-15',
        endDate: '2027-11-15',
        status: 'ĐANG_THỰC_HIỆN',
        addendums: [
          { addendumId: 'PL-01', addendumNo: 'PL-01/2026', signDate: '2026-06-01', adjustedValue: 15000000000, adjustedDurationDays: 30, reason: 'Bổ sung móng gia cố mặt đường' }
        ]
      },
      {
        contractId: 'HD-02',
        packageId: 'GT-TV-01',
        contractNo: '02/2026/HĐ-TV',
        contractName: 'Hợp đồng Tư vấn Khảo sát địa chất & Thiết kế BVTC',
        contractorName: 'Công ty Cổ phần Tư vấn Thiết kế TEDI',
        contractType: 'TRỌN_GÓI',
        contractValue: 15000000000,
        advancePct: 15,
        retentionPct: 5,
        signDate: '2026-02-15',
        startDate: '2026-02-20',
        endDate: '2026-04-30',
        status: 'ĐÃ_HOÀN_THÀNH',
        addendums: []
      }
    ]
  );

  // Filter contracts by package if specific package selected
  const filteredContracts = selectedPackageId === 'ALL' || selectedPackageId === 'ALL_PACKAGES'
    ? contracts
    : contracts.filter(c => c.packageId === selectedPackageId);

  const selectedContract = contracts.find(c => c.contractId === selectedContractId);

  const handleAddNewContract = () => {
    const newId = `HD-${Date.now().toString().slice(-4)}`;
    const newContract: ContractManagementRecord = {
      contractId: newId,
      packageId: selectedPackageId === 'ALL' ? 'GT-XL-01' : selectedPackageId,
      contractNo: `${contracts.length + 1}/2026/HĐ-MỚI`,
      contractName: `Hợp đồng Gói thầu ${selectedPackageId}`,
      contractorName: 'Tổng Công ty Cienco 4',
      contractType: 'ĐƠN_GIÁ_CỐ_ĐỊNH',
      contractValue: 35000000000,
      advancePct: 20,
      retentionPct: 5,
      signDate: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2027-12-31',
      status: 'ĐANG_THỰC_HIỆN',
      addendums: []
    };
    const updated = [...contracts, newContract];
    setContracts(updated);
    toast.success(`Đã tạo hợp đồng mới [${newContract.contractNo}]`);
    setSelectedContractId(newId);
  };

  const handleEditContract = (c: ContractManagementRecord) => {
    toast.info(`Đang mở chỉnh sửa hợp đồng ${c.contractNo}`);
  };

  const handleDeleteContract = (c: ContractManagementRecord) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa hợp đồng [${c.contractNo}] không?`)) {
      const updated = contracts.filter(item => item.contractId !== c.contractId);
      setContracts(updated);
      toast.success(`Đã xóa hợp đồng ${c.contractNo}`);
    }
  };

  return (
    <div>
      {!selectedContractId || !selectedContract ? (
        /* CẤP 1: MASTER VIEW - BẢNG TỔNG QUAN HỢP ĐỒNG */
        <ContractMasterTable
          contracts={filteredContracts}
          onSelectContract={(id) => setSelectedContractId(id)}
          onAddNewContract={handleAddNewContract}
          onEditContract={handleEditContract}
          onDeleteContract={handleDeleteContract}
        />
      ) : (
        /* CẤP 2: DETAIL VIEW - CHI TIẾT HỢP ĐỒNG MASTER-DETAIL */
        <ContractDetailContainer
          project={project}
          contract={selectedContract}
          onBackToMaster={() => setSelectedContractId(null)}
        />
      )}
    </div>
  );
}
