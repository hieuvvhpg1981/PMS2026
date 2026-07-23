// DocumentView v3.0 — updated 2026-05-08: expiry tracking, financial installments, EmailJS notification
import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, onSnapshot, addDoc, query, deleteDoc, doc, where, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { extractContractData, extractInvoiceData } from '../services/aiService';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG, EMAILJS_IS_CONFIGURED } from '../config/emailjsConfig';
import { FileUp, FileText, Receipt, CheckCircle2, Loader2, Search, Eye, ChevronDown, Plus, Filter, Trash2, Edit3, X, Calendar, Download, AlertTriangle, Clock, DollarSign, Info, FileSpreadsheet, ArrowUp, ArrowDown } from 'lucide-react';
import { generateContractTemplate, exportFilteredContracts, exportFilteredInvoices, exportVendors, FilterMeta } from '../services/excelService';
import { groupVendors, calculateSimilarity } from '../lib/vendorMatcher';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { sanitizePlan, sanitizeContract, sanitizeInvoice } from '../lib/sanitize';
import { calculateRollupBudgets, isSuperUser } from '../lib/hierarchy';


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DocumentView({ profile }: { profile: any }) {
  const isSuper = isSuperUser(profile);
  const [contracts, setContracts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [masterAppendices, setMasterAppendices] = useState<any[]>([]);
  const [vendorsDB, setVendorsDB] = useState<any[]>([]);
  const [procurementMethods, setProcurementMethods] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'contract' | 'invoice' | 'vendor'>('contract');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'contract' | 'invoice' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  const [isEditVendorModalOpen, setIsEditVendorModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilterYear, setTableFilterYear] = useState<string>('all');
  const [tableFilterMonth, setTableFilterMonth] = useState<string>('all');
  const [tableFilterDate, setTableFilterDate] = useState<string>('');
  const [filterContractor, setFilterContractor] = useState<string>('all');
  const [filterProcurementMethod, setFilterProcurementMethod] = useState<string>('all');
  const [filterPlanId, setFilterPlanId] = useState<string>('');

  // Cascading Filter States (for confirmation form)
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  const [filterAppendix, setFilterAppendix] = useState<string>('');

  // Tooltip state for financial summary
  const [tooltipContractId, setTooltipContractId] = useState<string | null>(null);

  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const formatDateDisplay = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    const cleaned = dateStr.trim();
    if (!cleaned) return '-';
    
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleaned)) {
      return cleaned;
    }
    
    try {
      const parts = cleaned.split('T')[0].split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        if (year.length === 4 && month.length === 2 && day.length === 2) {
          return `${day}/${month}/${year}`;
        }
      }
      
      const date = new Date(cleaned);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch (e) {}
    return dateStr;
  };

  const formatDateTimeDisplay = (dateTimeStr: string | null | undefined): string => {
    if (!dateTimeStr) return '-';
    try {
      const date = new Date(dateTimeStr);
      if (!isNaN(date.getTime())) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
      }
    } catch (e) {}
    return dateTimeStr;
  };

  // ─── HELPER: Số ngày đến khi hết hạn (âm = đã hết hạn) ───────────────
  const getDaysUntilExpiry = (ngayHetHan: string): number | null => {
    if (!ngayHetHan) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(ngayHetHan);
    expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // ─── HELPER: Tóm tắt tài chính ──────────────────────────────────────
  const getFinancialSummary = (contract: any) => {
    const total = contract.value || 0;
    const advance = contract.tien_tam_ung || 0;
    const installments: any[] = contract.thanh_toan_dot || [];
    const paid = installments
      .filter(i => i.trang_thai === 'Đã chi')
      .reduce((sum, i) => sum + (Number(i.so_tien) || 0), 0);
    return { total, advance, paid, remaining: total - advance - paid };
  };

  // ─── HELPER: Tính trạng tiến độ hợp đồng ──────────────────────────
  type ContractStatus = 'dang_thuc_hien' | 'canh_bao' | 'qua_han' | 'hoan_thanh';
  const getContractStatus = (contract: any, allInvoices: any[]): ContractStatus => {
    // ⭐ Ưu tiên: Nếu có bất kỳ hóa đơn nào liên kết → Hoàn thành ngay
    const hasLinkedInvoice = allInvoices.some(inv =>
      (contract.id && inv.contractId === contract.id) ||
      (contract.planId && inv.planId === contract.planId)
    );
    if (hasLinkedInvoice) return 'hoan_thanh';

    // Chưa có hóa đơn — kiểm tra theo ngày kết thúc (nếu có)
    const ngayKetThuc = contract.ngay_ket_thuc;
    if (!ngayKetThuc) return 'dang_thuc_hien';

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const endDate = new Date(ngayKetThuc); endDate.setHours(0, 0, 0, 0);
    const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);

    if (daysLeft < 0) return 'qua_han';
    if (daysLeft <= 3) return 'canh_bao';
    return 'dang_thuc_hien';
  };


  const CONTRACT_STATUS_CONFIG: Record<ContractStatus, { label: string; cls: string; dot: string }> = {
    dang_thuc_hien: { label: 'Đang thực hiện', cls: 'bg-blue-50 text-blue-700 border-blue-200',   dot: 'bg-blue-500' },
    canh_bao:       { label: 'Cảnh báo tiến độ', cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
    qua_han:        { label: 'Quá thời hạn',    cls: 'bg-red-50 text-red-700 border-red-200',       dot: 'bg-red-500'  },
    hoan_thanh:     { label: 'Hoàn thành',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  };

  // ─── EMAIL: Gửi cảnh báo hết hạn qua EmailJS ────────────────────────
  const sendExpiryEmail = async (contract: any, daysLeft: number) => {
    if (!EMAILJS_IS_CONFIGURED || !contract.createdBy) return;
    const storageKey = `expiry_email_sent_${new Date().toDateString()}`;
    const alreadySent: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (alreadySent.includes(contract.id)) return;
    try {
      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        {
          to_email: contract.createdBy,
          contract_number: contract.contractNumber,
          contract_name: contract.tenHopDong || 'N/A',
          contractor: contract.contractor || 'N/A',
          expiry_date: contract.ngay_het_han,
          days_left: daysLeft,
          value: (contract.value || 0).toLocaleString('vi-VN'),
        },
        EMAILJS_CONFIG.PUBLIC_KEY
      );
      alreadySent.push(contract.id);
      localStorage.setItem(storageKey, JSON.stringify(alreadySent));
      console.log(`[EmailJS] Sent expiry email for ${contract.contractNumber}`);
    } catch (err) {
      console.warn('[EmailJS] Failed to send:', err);
    }
  };

  useEffect(() => {
    const isSuper = isSuperUser(profile);
    const isUser = !isSuper && profile?.phongBan;

    const unsubC = onSnapshot(collection(db, 'contracts'), (snap) => {
      const all = snap.docs.map(d => sanitizeContract(d.id, d.data()));
      if (isUser) {
        setContracts(all.filter(c => c.phongBan?.toLowerCase().trim() === profile.phongBan.toLowerCase().trim()));
      } else {
        setContracts(all);
      }
    });

    const unsubI = onSnapshot(collection(db, 'invoices'), (snap) => {
      const all = snap.docs.map(d => sanitizeInvoice(d.id, d.data()));
      if (isUser) {
        setInvoices(all.filter(inv => inv.phongBan?.toLowerCase().trim() === profile.phongBan.toLowerCase().trim()));
      } else {
        setInvoices(all);
      }
    });

    // Load TẤT CẢ plans, lọc client-side: userDept + "Các phòng" / "Dùng chung"
    const unsubP = onSnapshot(collection(db, 'plans'), (snap) => {
      const rawPlans = snap.docs.map(d => sanitizePlan(d.id, d.data()));
      const rolledUp = calculateRollupBudgets(rawPlans);

      const isSharedDept = (dept?: string) => {
        if (!dept) return false;
        const d = dept.toLowerCase().trim();
        return d === 'các phòng' || d === 'dùng chung';
      };

      const isAllowedDept = (dept?: string) => {
        if (!dept) return false;
        return dept.toLowerCase().trim() === profile?.phongBan?.toLowerCase().trim() || isSharedDept(dept);
      };

      const filtered = isUser
        ? rolledUp.filter((p: any) => isAllowedDept(p.departmentName))
        : rolledUp;
      setPlans(filtered);
    });

    const unsubA = onSnapshot(collection(db, 'master_appendices'), (snap) => {
      setMasterAppendices(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPM = onSnapshot(collection(db, 'procurement_methods'), (snap) => {
      const methods = snap.docs.map(d => (d.data().name as string)).filter(Boolean).sort((a, b) => a.localeCompare(b, 'vi'));
      setProcurementMethods(methods);
    });

    // Listen to vendors
    const qVendors = query(collection(db, 'vendors'));
    const unsubVendors = onSnapshot(qVendors, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVendorsDB(data);
    });

    return () => { 
      unsubC(); 
      unsubI(); 
      unsubP(); 
      unsubA(); 
      unsubPM();
      unsubVendors();
    };
  }, [profile]);

  // ─── Kiểm tra hợp đồng sắp hết hạn và gửi email (chạy khi contracts thay đổi)
  useEffect(() => {
    if (contracts.length === 0) return;
    contracts.forEach(c => {
      const days = getDaysUntilExpiry(c.ngay_het_han);
      if (days !== null && days >= 0 && days <= 5) {
        sendExpiryEmail(c, days);
      }
    });
  }, [contracts]);

  // Cascading Logic (for confirmation form)
  const uniqueYears = (Array.from(new Set(plans.map(p => Number(p.namKeHoach || p.year)))) as number[]).filter(Boolean).sort((a, b) => b - a);
  
  const sortedMasterAppendices = [...masterAppendices].sort((a, b) => {
    return (a.tenPhuLuc || '').toString().localeCompare((b.tenPhuLuc || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
  });

  const filteredPlansForSelect = plans.filter(p => 
    (p.namKeHoach || p.year) === filterYear && 
    (filterAppendix ? p.appendix === filterAppendix : true)
  ).sort((a, b) => {
    return (a.planId || '').toString().localeCompare((b.planId || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
  });

  const sortedContracts = [...contracts].sort((a, b) => {
    return (a.contractNumber || '').toString().localeCompare((b.contractNumber || '').toString(), undefined, { numeric: true, sensitivity: 'base' });
  });

  const smartNormalize = (str: string) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/đ/g, "d")
      .replace(/\b(cong ty|cty|co phan|cp|tnhh|mtv)\b/g, "") // Remove common keywords
      .replace(/\s+/g, " ") // Clean extra spaces
      .trim();
  };

  const filteredContractsForInvoice = React.useMemo(() => {
    if (activeTab !== 'invoice' || !previewData || !previewData.sellerName) {
      return sortedContracts;
    }

    const normalizedSeller = smartNormalize(previewData.sellerName);
    if (!normalizedSeller) return sortedContracts;

    const filtered = sortedContracts.filter(c => {
      const normalizedContractor = smartNormalize(c.contractor);
      return normalizedContractor.includes(normalizedSeller) || normalizedSeller.includes(normalizedContractor);
    });

    return filtered.length > 0 ? filtered : sortedContracts;
  }, [sortedContracts, previewData, activeTab]);

  const handleYearChange = (year: number) => {
    setFilterYear(year);
    setFilterAppendix('');
    if (previewData) setPreviewData({ ...previewData, planId: '' });
  };

  const handleAppendixChange = (appendix: string) => {
    setFilterAppendix(appendix);
    if (previewData) setPreviewData({ ...previewData, planId: '' });
  };

  const handleFileProcess = async (e: React.ChangeEvent<HTMLInputElement>, type: 'contract' | 'invoice') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const mimeType = file.type;

        try {
          if (type === 'contract') {
            const data = await extractContractData(base64, mimeType);
            setPreviewData({ ...data, type: 'contract', planId: '' });
          } else {
            const data = await extractInvoiceData(base64, mimeType);
            setPreviewData({ ...data, type: 'invoice', planId: '', contractId: '' });
          }
          toast.success("Trích xuất thành công! Vui lòng kiểm tra lại số liệu.");
        } catch (error: any) {
          console.error("OCR Error:", error);
          toast.error("Lỗi trích xuất AI: " + error.message);
        } finally {
          setProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error("Lỗi đọc file: " + error.message);
      setProcessing(false);
    }
  };

  const confirmSave = async () => {
    if (!previewData) return;
    if (!previewData.planDocId && !previewData.planId) { toast.error("Vui lòng chọn Mã Kế hoạch trước khi lưu."); return; }
    // Không bắt buộc contractId với hóa đơn — hỗ trợ chi phí lẻ không có hợp đồng

    try {
      const collectionName = previewData.type === 'contract' ? 'contracts' : 'invoices';
      const fieldName = previewData.type === 'contract' ? 'contractNumber' : 'invoiceNumber';
      
      // Trim whitespace for uniqueness check and storage
      const trimmedValue = (previewData[fieldName] || '').trim();
      if (!trimmedValue) {
        toast.error(`Vui lòng nhập số ${previewData.type === 'contract' ? 'hợp đồng' : 'hóa đơn'}.`);
        return;
      }

      // Uniqueness check
      const q = query(collection(db, collectionName), where(fieldName, '==', trimmedValue));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const duplicateDocs = snapshot.docs.filter(d => d.id !== previewData.id);
        if (duplicateDocs.length > 0) {
          if (previewData.type === 'contract') {
            // Với hợp đồng: chặn tuyệt đối nếu trùng số
            toast.error(`❌ Số hợp đồng "${trimmedValue}" đã tồn tại trong hệ thống!`);
            return;
          } else {
            // Với hóa đơn: chỉ chặn nếu trùng CẢ số + đơn vị xuất + ngày lập
            const existingInvoice = duplicateDocs[0].data();
            const sameSellerName = (existingInvoice.sellerName || '').trim().toLowerCase() === (previewData.sellerName || '').trim().toLowerCase();
            const sameDate = (existingInvoice.date || '') === (previewData.date || '');
            if (sameSellerName && sameDate) {
              toast.error(`❌ Hóa đơn số "${trimmedValue}" của đơn vị "${previewData.sellerName}" ngày ${previewData.date} đã tồn tại!`);
              return;
            } else {
              // Khác đơn vị hoặc khác ngày → chỉ cảnh báo, vẫn cho lưu
              toast.warning(`⚠️ Số hóa đơn "${trimmedValue}" trùng với một hóa đơn khác nhưng khác Đơn vị xuất hoặc khác Ngày lập. Đang tiếp tục lưu...`);
            }
          }
        }
      }

      const isSuper = isSuperUser(profile);
      // Try to find by planDocId first, then by planId as fallback
      const selectedPlan = plans.find(p => p.id === previewData.planDocId) || 
                           plans.find(p => p.planId === (previewData.planId || '').replace(/\//g, '-'));
      const targetDept = isSuper && selectedPlan ? selectedPlan.departmentName : (profile?.phongBan || '');

      const payload: any = {
        ...previewData,
        [fieldName]: trimmedValue,
        planDocId: selectedPlan ? selectedPlan.id : (previewData.planDocId || ''),
        planId: selectedPlan ? selectedPlan.planId : (previewData.planId || '').replace(/\//g, '-'),
        phongBan: targetDept,
        updatedBy: auth.currentUser?.email || 'system',
        updatedAt: new Date().toISOString()
      };


      if (!payload.id) {
        payload.createdBy = auth.currentUser?.email || 'system';
        payload.createdAt = new Date().toISOString();
      }

      const id = payload.id;
      delete payload.id; // Remove ID from payload for Firestore

      Object.keys(payload).forEach(key => {
        if (payload[key] instanceof File || payload[key] instanceof Blob || (payload[key] && typeof payload[key] === 'object' && payload[key].constructor?.name === 'File')) {
          delete payload[key];
        }
      });
      delete payload.file;
      
      if (id) {
        const { updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, collectionName, id), payload);
        toast.success(`Đã cập nhật ${previewData.type === 'contract' ? 'Hợp đồng' : 'Hóa đơn'} thành công.`);
      } else {
        await addDoc(collection(db, collectionName), payload);
        toast.success(`Đã lưu ${previewData.type === 'contract' ? 'Hợp đồng' : 'Hóa đơn'} thành công.`);
      }
      
      setPreviewData(null);
      setIsUploadModalOpen(false);
    } catch (error: any) {
      toast.error("Lỗi lưu dữ liệu: " + error.message);
    }
  };

  const handleDelete = (id: string, type: 'contract' | 'invoice') => {
    setItemToDelete({ id, type });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const { id, type } = itemToDelete;
    setIsDeleting(true);
    
    try {
      const collectionName = type === 'contract' ? 'contracts' : 'invoices';

      if (type === 'contract') {
        // Query check for linked invoices
        const q = query(collection(db, 'invoices'), where('contractId', '==', id));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          toast.error('Không thể xóa Hợp đồng vì đã có Hóa đơn liên kết. Vui lòng xóa hóa đơn trước.');
          setIsDeleting(false);
          setIsDeleteModalOpen(false);
          return;
        }
      }

      await deleteDoc(doc(db, collectionName, id));
      
      // Update state manually as requested
      if (type === 'contract') {
        setContracts(prev => prev.filter(item => item.id !== id));
      } else {
        setInvoices(prev => prev.filter(item => item.id !== id));
      }
      
      toast.success("Đã xóa thành công.");
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error: any) {
      toast.error("Lỗi khi xóa: " + error.message);
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── MIGRATION: Quét hợp đồng, hóa đơn & đăng ký cũ → chuyển đổi sang lưu planDocId ──
  const [isMigrating, setIsMigrating] = useState(false);
  const runMigration = async () => {
    if (!window.confirm('Tự động quét Hợp đồng, Hóa đơn và Đăng ký kế hoạch để chuẩn hóa liên kết planDocId (ID Kế hoạch gốc)?\n\nThao tác này an toàn và không xóa dữ liệu.')) return;
    setIsMigrating(true);
    let migratedContracts = 0;
    let migratedInvoices = 0;
    let migratedRegistrations = 0;
    let skipped = 0;
    try {
      const { updateDoc, doc: firestoreDoc } = await import('firebase/firestore');
      
      // 1. Migrate contracts
      for (const c of contracts) {
        if (c.planDocId) {
          skipped++;
          continue;
        }
        if (!c.planId) {
          skipped++;
          continue;
        }
        
        const contractYear = c.date ? new Date(c.date).getFullYear() : new Date().getFullYear();
        // Match by planId (normalized) and year
        const normPlanId = c.planId.replace(/\//g, '-').trim().toUpperCase();
        const matchedPlan = plans.find(p => 
          p.planId.replace(/\//g, '-').trim().toUpperCase() === normPlanId && 
          p.namKeHoach === contractYear
        );

        if (matchedPlan) {
          await updateDoc(firestoreDoc(db, 'contracts', c.id), { planDocId: matchedPlan.id });
          migratedContracts++;
        } else {
          skipped++;
        }
      }

      // 2. Migrate invoices
      for (const inv of invoices) {
        let updatedFields: any = {};
        
        if (!inv.planDocId && inv.planId) {
          const invoiceYear = inv.date ? new Date(inv.date).getFullYear() : new Date().getFullYear();
          const normPlanId = inv.planId.replace(/\//g, '-').trim().toUpperCase();
          const matchedPlan = plans.find(p => 
            p.planId.replace(/\//g, '-').trim().toUpperCase() === normPlanId && 
            p.namKeHoach === invoiceYear
          );
          if (matchedPlan) {
            updatedFields.planDocId = matchedPlan.id;
          }
        }

        // Also check if contractId needs to be linked
        if (!inv.contractId && inv.planId) {
          const matchedContract = contracts.find(c => c.planId && c.planId === inv.planId);
          if (matchedContract) {
            updatedFields.contractId = matchedContract.id;
          }
        }

        if (Object.keys(updatedFields).length > 0) {
          await updateDoc(firestoreDoc(db, 'invoices', inv.id), updatedFields);
          migratedInvoices++;
        } else {
          skipped++;
        }
      }

      // 3. Migrate monthly registrations
      const registrationsSnap = await getDocs(collection(db, 'monthly_registrations'));
      for (const docSnap of registrationsSnap.docs) {
        const data = docSnap.data();
        if (data.planDocId) {
          skipped++;
          continue;
        }
        if (!data.planId) {
          skipped++;
          continue;
        }

        const planYear = data.year || new Date().getFullYear();
        const normPlanId = String(data.planId).replace(/\//g, '-').trim().toUpperCase();
        const matchedPlan = plans.find(p => 
          p.planId.replace(/\//g, '-').trim().toUpperCase() === normPlanId && 
          p.namKeHoach === planYear
        );

        if (matchedPlan) {
          await updateDoc(firestoreDoc(db, 'monthly_registrations', docSnap.id), { planDocId: matchedPlan.id });
          migratedRegistrations++;
        } else {
          skipped++;
        }
      }

      // 4. Migrate task executions
      const executionsSnap = await getDocs(collection(db, 'task_executions'));
      let migratedExecutions = 0;
      for (const docSnap of executionsSnap.docs) {
        const data = docSnap.data();
        if (data.planDocId) {
          skipped++;
          continue;
        }
        if (!data.planId) {
          skipped++;
          continue;
        }

        const planYear = data.namKeHoach || new Date().getFullYear();
        const normPlanId = String(data.planId).replace(/\//g, '-').trim().toUpperCase();
        const matchedPlan = plans.find(p => 
          p.planId.replace(/\//g, '-').trim().toUpperCase() === normPlanId && 
          p.namKeHoach === planYear
        );

        if (matchedPlan) {
          await updateDoc(firestoreDoc(db, 'task_executions', docSnap.id), { planDocId: matchedPlan.id });
          migratedExecutions++;
        } else {
          skipped++;
        }
      }

      toast.success(`Migration hoàn tất! Đã cập nhật: ${migratedContracts} hợp đồng, ${migratedInvoices} hóa đơn, ${migratedRegistrations} đăng ký tháng, ${migratedExecutions} quy trình triển khai. Bỏ qua/Không đổi ${skipped} dòng.`);
    } catch (err: any) {
      toast.error('Lỗi migration: ' + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  const handleEdit = (item: any) => {

    setPreviewData({ ...item, type: activeTab });
    setIsUploadModalOpen(true);
    // Set cascading filters based on item's planId if possible
    const plan = plans.find(p => p.planId === item.planId);
    if (plan) {
      setFilterYear(Number(plan.namKeHoach || plan.year));
      setFilterAppendix(plan.appendix || '');
    }
  };

  const handleView = (item: any) => {
    setSelectedRecord(item);
    setIsViewModalOpen(true);
  };

  const groupedVendors = React.useMemo(() => {
    return groupVendors(contracts, invoices, vendorsDB);
  }, [contracts, invoices, vendorsDB]);

  // Danh sách nhà thầu chuẩn hóa để dùng cho filter Dropdown
  const uniqueNormalizedVendors = React.useMemo(() => {
    return groupedVendors.map(v => v.name);
  }, [groupedVendors]);

  const currentVendors = uniqueNormalizedVendors;

  const hasActiveFilters = tableFilterYear !== 'all' || tableFilterMonth !== 'all' ||
    tableFilterDate !== '' || searchQuery !== '' ||
    filterContractor !== 'all' || filterProcurementMethod !== 'all' || filterPlanId !== '';

  const resetAllFilters = () => {
    setTableFilterYear('all');
    setTableFilterMonth('all');
    setTableFilterDate('');
    setSearchQuery('');
    setFilterContractor('all');
    setFilterProcurementMethod('all');
    setFilterPlanId('');
  };

  const filterData = (data: any[]) => {
    return data.filter(item => {
      const dateStr = item.date;
      const date = dateStr ? new Date(dateStr) : null;
      const year = date ? date.getFullYear().toString() : '';
      const month = date ? (date.getMonth() + 1).toString() : '';

      const matchesYear    = tableFilterYear === 'all' || year === tableFilterYear;
      const matchesMonth   = tableFilterMonth === 'all' || month === tableFilterMonth;
      const matchesDate    = !tableFilterDate || dateStr === tableFilterDate;
      const matchesContractor = filterContractor === 'all' ||
        // So khớp tên nhà thầu (chuẩn hóa tên để đối chiếu)
        (item.contractor || item.sellerName || '').toUpperCase().includes(filterContractor.toUpperCase()) ||
        // Hoặc kiểm tra xem item.taxCode có khớp với vendor đang chọn không
        groupedVendors.find(v => v.name === filterContractor)?.taxCode === item.taxCode;
      const matchesProcurement = filterProcurementMethod === 'all' ||
        (item.procurement_method || '') === filterProcurementMethod;

      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        (item.contractNumber || item.invoiceNumber || '').toLowerCase().includes(searchLower) ||
        (item.tenHopDong || '').toLowerCase().includes(searchLower) ||
        (item.contractor || item.sellerName || '').toLowerCase().includes(searchLower) ||
        (item.planId || '').toLowerCase().includes(searchLower);

      const matchesPlanId = !filterPlanId || (item.planId || '') === filterPlanId || (item.planId || '').toLowerCase().includes(filterPlanId.toLowerCase());

      return matchesYear && matchesMonth && matchesDate && matchesSearch &&
             matchesContractor && matchesProcurement && matchesPlanId;
    });
  };

  const sortData = (data: any[]) => {
    return [...data].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      const isNaNA = isNaN(dateA);
      const isNaNB = isNaN(dateB);
      if (isNaNA && isNaNB) return 0;
      if (isNaNA) return sortDirection === 'desc' ? 1 : -1;
      if (isNaNB) return sortDirection === 'desc' ? -1 : 1;
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    });
  };

  const filteredContracts = sortData(filterData(contracts));
  const filteredInvoices  = sortData(filterData(invoices));

  const checkNameMismatch = () => {
    if (previewData?.type !== 'invoice' || !previewData.contractId) return false;
    const selectedContract = contracts.find(c => c.id === previewData.contractId);
    if (!selectedContract) return false;
    const contractorName = (selectedContract.contractor || "").toLowerCase().replace(/\s+/g, '');
    const sellerName = (previewData.sellerName || "").toLowerCase().replace(/\s+/g, '');
    return !contractorName.includes(sellerName) && !sellerName.includes(contractorName);
  };

  const isMismatch = checkNameMismatch();

  // ─── Danh sách hợp đồng sắp hết hạn (≤5 ngày) ──────────────────────
  const expiringContracts = contracts.filter(c => {
    const days = getDaysUntilExpiry(c.ngay_het_han);
    return days !== null && days >= 0 && days <= 5;
  });

  return (
    <div className="space-y-6">
      {/* ─── Banner cảnh báo hợp đồng sắp hết hạn ─────────────────── */}
      {activeTab === 'contract' && expiringContracts.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-red-700">
              ⚠️ Có {expiringContracts.length} hợp đồng sắp hết hạn trong 5 ngày tới!
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {expiringContracts.map(c => {
                const days = getDaysUntilExpiry(c.ngay_het_han)!;
                return (
                  <span key={c.id} className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-semibold">
                    <Clock size={11} />
                    {c.contractNumber} — còn {days === 0 ? 'Hết hạn HÔM NAY' : `${days} ngày`}
                  </span>
                );
              })}
            </div>
            {!EMAILJS_IS_CONFIGURED && (
              <p className="mt-2 text-[11px] text-red-500 italic">
                💡 Cấu hình EmailJS trong <code>src/config/emailjsConfig.ts</code> để bật tự động gửi email thông báo
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs & Add Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('contract')}
            className={cn(
              "flex-1 md:w-48 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all",
              activeTab === 'contract' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <FileText size={18} />
            Quản lý Hợp đồng
          </button>
          <button 
            onClick={() => setActiveTab('invoice')}
            className={cn(
              "flex-1 md:w-48 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all",
              activeTab === 'invoice' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Receipt size={18} />
            Quản lý Hóa đơn
          </button>
          <button 
            onClick={() => setActiveTab('vendor')}
            className={cn(
              "flex-1 md:w-48 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all",
              activeTab === 'vendor' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <Info size={18} />
            Danh sách Nhà thầu
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'contract' && (
            <button
              onClick={() => generateContractTemplate(procurementMethods)}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm"
              title="Tải file Excel mẫu để nhập hợp đồng hàng loạt"
            >
              <Download size={18} />
              Tải Template Excel
            </button>
          )}
          {activeTab !== 'vendor' && (
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className={cn(
                "flex items-center justify-center gap-2 px-6 py-3 text-white font-bold rounded-xl transition-all shadow-lg",
                activeTab === 'contract' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
              )}
            >
              <Plus size={20} />
              Thêm {activeTab === 'contract' ? 'Hợp đồng' : 'Hóa đơn'} mới
            </button>
          )}
          {activeTab === 'vendor' && isSuper && (
            <button 
              onClick={async () => {
                setProcessing(true);
                try {
                  let updated = 0;
                  // Get fresh contracts snapshot
                  const contractsSnap = await getDocs(collection(db, 'contracts'));
                  for (const docSnap of contractsSnap.docs) {
                    const data = docSnap.data();
                    const vendor = groupedVendors.find(v => 
                      (v.taxCode && data.taxCode === v.taxCode) || 
                      (!data.taxCode && calculateSimilarity(v.name, data.contractor) > 85)
                    );
                    if (vendor && vendor.name !== data.contractor) {
                      await updateDoc(doc(db, 'contracts', docSnap.id), { contractor: vendor.name });
                      updated++;
                    }
                  }
                  toast.success(`Đã chuẩn hóa ${updated} hợp đồng theo danh mục nhà thầu.`);
                } catch (e) {
                  toast.error('Lỗi khi đồng bộ.');
                }
                setProcessing(false);
              }}
              disabled={processing}
              className="flex items-center justify-center gap-2 px-6 py-3 text-white font-bold rounded-xl bg-violet-600 hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-50"
            >
              {processing ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
              {processing ? 'Đang quét...' : 'Quét & Đồng bộ Chuẩn hóa'}
            </button>
          )}
        </div>
      </div>

      {/* ─── Toolbar & Filters ─────────────────────────────── */}
      {activeTab !== 'vendor' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          {/* Row 1: Search + Year/Month/Date */}
          <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Tìm theo số hiệu, nhà thầu, mã KH..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select value={tableFilterYear} onChange={(e) => setTableFilterYear(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
              <option value="all">Tất cả Năm</option>
              {[2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={tableFilterMonth} onChange={(e) => setTableFilterMonth(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none">
              <option value="all">Tất cả Tháng</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
              ))}
            </select>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input type="date" value={tableFilterDate} onChange={(e) => setTableFilterDate(e.target.value)}
                className="pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Row 2: Multi-filter + Export actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter nhà thầu / đơn vị xuất */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {activeTab === 'contract' ? 'Nhà thầu' : 'Đơn vị xuất'}
              </span>
              <select
                value={filterContractor}
                onChange={(e) => setFilterContractor(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-[200px]"
              >
                <option value="all">— Tất cả —</option>
                {currentVendors.map(c => (
                  <option key={c} value={c}>{c.length > 30 ? c.substring(0, 30) + '...' : c}</option>
                ))}
              </select>
            </div>

            {/* Filter Mã KH / Hạng mục */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Mã KH / Hạng mục</span>
              <input
                list="plan-options-list"
                value={filterPlanId}
                onChange={(e) => setFilterPlanId(e.target.value)}
                placeholder="— Tất cả —"
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-400 w-[200px]"
              />
              <datalist id="plan-options-list">
                {plans.map(p => (
                  <option key={p.id} value={p.planId}>
                    {p.planId} - {p.description?.substring(0, 50)}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Filter hình thức thầu (chỉ Hợp đồng) */}
            {activeTab === 'contract' && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Hình thức</span>
                <select
                  value={filterProcurementMethod}
                  onChange={(e) => setFilterProcurementMethod(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-violet-400"
                >
                  <option value="all">— Tất cả —</option>
                  {procurementMethods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}

            {/* Badge kết quả + Reset */}
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold">
                {activeTab === 'contract' ? filteredContracts.length : filteredInvoices.length} / {activeTab === 'contract' ? contracts.length : invoices.length} bản ghi
              </span>
              {hasActiveFilters && (
                <button onClick={resetAllFilters}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors">
                  <X size={12} /> Xóa bộ lọc
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Migration cho Admin bên Invoice */}
            {activeTab === 'invoice' && isSuper && (
              <button
                onClick={runMigration}
                disabled={isMigrating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-200 text-violet-700 text-[11px] font-bold rounded-lg transition-colors disabled:opacity-50"
                title="Quét và liên kết hóa đơn cũ với hợp đồng theo Mã KH"
              >
                {isMigrating ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {isMigrating ? 'Đang chạy...' : '⚡ Đồng bộ liên kết HĐ'}
              </button>
            )}

            {/* Xuất Excel báo cáo */}
            <button
              onClick={() => {
                const meta = {
                  year: tableFilterYear,
                  month: tableFilterMonth,
                  contractor: filterContractor !== 'all' ? filterContractor : undefined,
                  procurementMethod: filterProcurementMethod !== 'all' ? filterProcurementMethod : undefined,
                };
                if (activeTab === 'contract') {
                  exportFilteredContracts(filteredContracts, meta);
                } else {
                  exportFilteredInvoices(filteredInvoices, meta);
                }
              }}
              disabled={(activeTab === 'contract' ? filteredContracts.length : filteredInvoices.length) === 0}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Xuất danh sách đang hiển thị ra file Excel"
            >
              <FileSpreadsheet size={16} />
              {filterPlanId && filterPlanId !== 'all' && filterPlanId !== '' 
                ? 'Xuất báo cáo chi tiết'
                : `Xuất báo cáo (${activeTab === 'contract' ? filteredContracts.length : filteredInvoices.length})`}
            </button>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'vendor' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-700">Danh bạ nhà thầu ({groupedVendors.length})</h3>
            <button
              onClick={() => exportVendors(groupedVendors)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm shadow-emerald-100"
            >
              <FileSpreadsheet size={16} />
              Xuất danh bạ Excel
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          {activeTab === 'vendor' ? (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 font-bold w-12 text-center">STT</th>
                  <th className="px-4 py-4 font-bold">Tên nhà thầu (Chuẩn hóa)</th>
                  <th className="px-4 py-4 font-bold">Mã số thuế</th>
                  <th className="px-4 py-4 font-bold">Địa chỉ</th>
                  <th className="px-4 py-4 font-bold">Người đại diện</th>
                  <th className="px-4 py-4 font-bold">Số điện thoại</th>
                  <th className="px-4 py-4 font-bold">Ngành nghề</th>
                  <th className="px-4 py-4 font-bold text-center">Hợp đồng</th>
                  <th className="px-4 py-4 font-bold text-center">Hóa đơn</th>
                  <th className="px-4 py-4 font-bold text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedVendors.map((vendor, index) => (
                  <tr key={vendor.vendorId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-4 text-center font-medium text-slate-400">{index + 1}</td>
                    <td className="px-4 py-4 font-bold text-slate-800">{vendor.name}</td>
                    <td className="px-4 py-4 text-slate-600 font-mono text-xs">{vendor.taxCode || '-'}</td>
                    <td className="px-4 py-4 text-slate-600 max-w-[200px] truncate" title={vendor.address}>{vendor.address || '-'}</td>
                    <td className="px-4 py-4 text-slate-600">{vendor.representative || '-'}</td>
                    <td className="px-4 py-4 text-slate-600 font-medium">{vendor.phoneNumber || '-'}</td>
                    <td className="px-4 py-4 text-slate-600 max-w-[150px] truncate" title={vendor.businessSector}>{vendor.businessSector || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg text-xs min-w-[32px]">
                        {vendor.contractCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-xs min-w-[32px]">
                        {vendor.invoiceCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => {
                          setEditingVendor(vendor);
                          setIsEditVendorModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Sửa thông tin nhà thầu"
                      >
                        <Edit3 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {groupedVendors.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                      Chưa có dữ liệu nhà thầu.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-16">STT</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Số {activeTab === 'contract' ? 'Hợp đồng' : 'Hóa đơn'}</th>
                {activeTab === 'contract' && <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tên Hợp đồng</th>}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <button 
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="flex items-center gap-1 hover:text-slate-800 transition-colors uppercase font-bold text-[10px]"
                    title="Click để đảo chiều sắp xếp ngày"
                  >
                    Ngày {activeTab === 'contract' ? 'Ký' : 'Lập'}
                    {sortDirection === 'asc' ? <ArrowUp size={12} className="text-slate-400" /> : <ArrowDown size={12} className="text-slate-400" />}
                  </button>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{activeTab === 'contract' ? 'Nhà Thầu' : 'Đơn vị xuất'}</th>
                {activeTab === 'contract' ? (
                  <>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Thời hạn HĐ</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Giá Trị (VNĐ)</th>
                    <th className="px-5 py-4 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Tình trạng HĐ</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Trước Thuế</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Tiền Thuế</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Sau Thuế</th>
                  </>
                )}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mã KH</th>
                {activeTab === 'contract' && <th className="px-6 py-4 text-[10px] font-bold text-violet-600 uppercase tracking-wider">Hình thức thầu</th>}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(activeTab === 'contract' ? filteredContracts : filteredInvoices).length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic text-sm">
                    Không tìm thấy dữ liệu phù hợp
                  </td>
                </tr>
              ) : (
                (activeTab === 'contract' ? filteredContracts : filteredInvoices).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-slate-500">{idx + 1}</td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-slate-900 font-mono">{item.contractNumber || item.invoiceNumber}</span>
                    </td>
                    {activeTab === 'contract' && (
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 line-clamp-2 max-w-xs">{item.tenHopDong || '-'}</p>
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{formatDateDisplay(item.date)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.contractor || item.sellerName}</td>
                    {activeTab === 'contract' ? (
                      <>
                        <td className="px-4 py-4 text-center">
                          {item.thoi_han_hd ? (
                            <div className="space-y-0.5">
                              <div className="text-sm font-bold text-slate-800">{item.thoi_han_hd} ngày</div>
                              {item.ngay_ket_thuc && (
                                <div className="text-[10px] text-slate-400 font-mono">KT: {formatDateDisplay(item.ngay_ket_thuc)}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="relative inline-block">
                            <button
                              className="flex items-center gap-1 text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors"
                              onMouseEnter={() => setTooltipContractId(item.id)}
                              onMouseLeave={() => setTooltipContractId(null)}
                            >
                              {(item.value || 0).toLocaleString()}
                              <Info size={12} className="text-slate-400" />
                            </button>
                            {tooltipContractId === item.id && (() => {
                              const fin = getFinancialSummary(item);
                              return (
                                <div className="absolute right-0 bottom-full mb-2 z-50 w-64 bg-slate-900 text-white text-xs rounded-xl shadow-2xl p-3 space-y-1.5">
                                  <p className="font-bold text-slate-300 border-b border-white/10 pb-1.5 mb-1.5">💰 Tóm tắt tài chính</p>
                                  <div className="flex justify-between"><span className="text-slate-400">Tổng giá trị:</span><span className="font-bold">{fin.total.toLocaleString()}</span></div>
                                  <div className="flex justify-between"><span className="text-amber-400">Đã tạm ứng:</span><span className="text-amber-300">- {fin.advance.toLocaleString()}</span></div>
                                  <div className="flex justify-between"><span className="text-emerald-400">Đã thanh toán:</span><span className="text-emerald-300">- {fin.paid.toLocaleString()}</span></div>
                                  <div className="flex justify-between border-t border-white/10 pt-1.5"><span className="text-blue-300 font-bold">Còn lại:</span><span className="text-blue-200 font-bold">{fin.remaining.toLocaleString()}</span></div>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {(() => {
                            const status = getContractStatus(item, invoices);
                            const cfg = CONTRACT_STATUS_CONFIG[status];
                            return (
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border whitespace-nowrap ${cfg.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'canh_bao' ? 'animate-pulse' : ''}`} />
                                {cfg.label}
                              </span>
                            );
                          })()}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">
                          {(item.giaTriTruocThue || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600 text-right">
                          {(item.tienThue || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-emerald-600 text-right">
                          {(item.giaTriSauThue || 0).toLocaleString()}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-bold font-mono border border-blue-100">
                        {plans.find(p => p.id === item.planDocId)?.planId || item.planId || 'N/A'}
                      </span>
                    </td>
                    {activeTab === 'contract' && (
                      <td className="px-6 py-4">
                        {item.procurement_method ? (
                          <span className="px-2 py-1 bg-violet-50 text-violet-700 rounded-lg text-[11px] font-semibold border border-violet-100 whitespace-nowrap">
                            {item.procurement_method}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleView(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" 
                          title="Chỉnh sửa"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id, activeTab)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl text-white",
                  activeTab === 'contract' ? "bg-blue-600" : "bg-emerald-600"
                )}>
                  {activeTab === 'contract' ? <FileText size={24} /> : <Receipt size={24} />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {previewData?.id ? 'Cập nhật thông tin' : `Thêm ${activeTab === 'contract' ? 'Hợp đồng' : 'Hóa đơn'} mới`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {previewData?.id ? 'Chỉnh sửa thông tin tài liệu đã lưu' : 'Sử dụng AI OCR để tự động trích xuất dữ liệu'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setPreviewData(null);
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {!previewData ? (
                <div className="h-full flex flex-col items-center justify-center">
                  <label className={cn(
                    "w-full max-w-2xl flex flex-col items-center justify-center p-16 border-2 border-dashed rounded-3xl transition-all cursor-pointer group",
                    activeTab === 'contract' ? "border-blue-200 hover:border-blue-400 hover:bg-blue-50" : "border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50"
                  )}>
                    <div className={cn(
                      "p-6 rounded-full transition-transform group-hover:scale-110",
                      activeTab === 'contract' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                    )}>
                      {activeTab === 'contract' ? <FileText size={48} /> : <Receipt size={48} />}
                    </div>
                    <span className="mt-6 font-bold text-slate-900 text-xl">Kéo thả hoặc Click để tải lên</span>
                    <span className="mt-2 text-sm text-slate-500">Hỗ trợ PDF, PNG, JPG, XML (AI OCR)</span>
                    <input type="file" className="hidden" onChange={(e) => handleFileProcess(e, activeTab)} />
                  </label>
                  
                  {processing && (
                    <div className="mt-8 flex items-center gap-3 px-6 py-3 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 animate-pulse">
                      <Loader2 className="animate-spin" size={20} />
                      <span className="font-bold">AI đang phân tích tài liệu, vui lòng đợi...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* AI Preview Section */}
                  <div className="space-y-6">
                    <div className="bg-slate-900 rounded-2xl p-6 text-white">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="font-bold flex items-center gap-2">
                          <Eye size={18} />
                          Kết quả trích xuất AI
                        </h4>
                        <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold uppercase tracking-wider">Draft</span>
                      </div>

                      <div className="space-y-4">
                        {isMismatch && (
                          <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl flex gap-3 text-amber-200 text-xs">
                            <span>⚠️</span>
                            <p>Cảnh báo: Tên đơn vị xuất hóa đơn không khớp với Nhà thầu trong Hợp đồng.</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Số hiệu</label>
                            <input 
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-500"
                              value={previewData.contractNumber || previewData.invoiceNumber}
                              onChange={(e) => setPreviewData({...previewData, [previewData.type === 'contract' ? 'contractNumber' : 'invoiceNumber']: e.target.value})}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Ngày</label>
                            <input 
                              type="date"
                              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                              value={previewData.date}
                              onChange={(e) => setPreviewData({...previewData, date: e.target.value})}
                            />
                          </div>
                        </div>

                        {previewData.type === 'contract' && (
                          <>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Tên / Nội dung hợp đồng</label>
                              <textarea 
                                required
                                rows={2}
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500 resize-none"
                                value={previewData.tenHopDong || ''}
                                onChange={(e) => setPreviewData({...previewData, tenHopDong: e.target.value})}
                                placeholder="Nhập tên hoặc nội dung tóm tắt của hợp đồng..."
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-violet-300 uppercase">Hình thức lựa chọn nhà thầu</label>
                              <select
                                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-violet-400 appearance-none"
                                value={previewData.procurement_method || ''}
                                onChange={(e) => setPreviewData({...previewData, procurement_method: e.target.value})}
                              >
                                <option value="" className="bg-slate-800">-- Chọn hình thức thầu --</option>
                                {procurementMethods.length > 0 ? (
                                  procurementMethods.map(m => (
                                    <option key={m} value={m} className="bg-slate-800">{m}</option>
                                  ))
                                ) : (
                                  // Fallback defaults nếu chưa có danh mục trong Firestore
                                  ['Chỉ định thầu', 'Chào hàng cạnh tranh', 'Đấu thầu rộng rãi', 'Mua sắm trực tiếp', 'Đấu thầu hạn chế'].map(m => (
                                    <option key={m} value={m} className="bg-slate-800">{m}</option>
                                  ))
                                )}
                              </select>
                            </div>
                          </>
                        )}

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase">
                            {previewData.type === 'contract' ? 'Nhà thầu' : 'Đơn vị xuất'}
                          </label>
                          <input 
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                            value={previewData.contractor || previewData.sellerName || ''}
                            onChange={(e) => setPreviewData({...previewData, [previewData.type === 'contract' ? 'contractor' : 'sellerName']: e.target.value})}
                          />
                        </div>

                        {previewData.type === 'contract' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-indigo-300 uppercase flex items-center gap-1">
                              <Clock size={10} /> Thời hạn thực hiện HĐ (số ngày)
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                placeholder="VD: 30"
                                className="w-full px-3 py-2 bg-white/5 border border-indigo-500/30 rounded-lg text-sm focus:outline-none focus:border-indigo-400"
                                value={previewData.thoi_han_hd || ''}
                                onChange={(e) => {
                                  const days = Number(e.target.value);
                                  let ngay_ket_thuc = '';
                                  if (days > 0 && previewData.date) {
                                    const d = new Date(previewData.date);
                                    d.setDate(d.getDate() + days);
                                    ngay_ket_thuc = d.toISOString().split('T')[0];
                                  }
                                  setPreviewData({...previewData, thoi_han_hd: days || null, ngay_ket_thuc});
                                }}
                              />
                              {previewData.ngay_ket_thuc && (
                                <span className="text-[11px] text-indigo-300 whitespace-nowrap font-semibold">
                                  → KT: {previewData.ngay_ket_thuc}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {previewData.type === 'contract' ? (
                          <div className="space-y-3">
                            {/* Giá trị hợp đồng */}

                            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Giá trị hợp đồng (VNĐ)</label>
                              <input
                                type="number"
                                className="w-full bg-transparent text-2xl font-bold text-blue-400 focus:outline-none"
                                value={previewData.value || 0}
                                onChange={(e) => setPreviewData({...previewData, value: Number(e.target.value)})}
                              />
                            </div>
                            {/* Ngày hết hạn + Tạm ứng */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-rose-400 uppercase flex items-center gap-1"><Clock size={10} />Ngày hết hạn</label>
                                <input
                                  type="date"
                                  className="w-full px-3 py-2 bg-white/5 border border-rose-500/30 rounded-lg text-sm focus:outline-none focus:border-rose-400"
                                  value={previewData.ngay_het_han || ''}
                                  onChange={(e) => setPreviewData({...previewData, ngay_het_han: e.target.value})}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-amber-400 uppercase flex items-center gap-1"><DollarSign size={10} />Tiền tạm ứng (VNĐ)</label>
                                <input
                                  type="number"
                                  className="w-full px-3 py-2 bg-white/5 border border-amber-500/30 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                                  value={previewData.tien_tam_ung || 0}
                                  onChange={(e) => setPreviewData({...previewData, tien_tam_ung: Number(e.target.value)})}
                                />
                              </div>
                            </div>
                            {/* Đợt thanh toán */}
                            <div className="space-y-2 p-3 bg-white/5 rounded-xl border border-white/10">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1"><DollarSign size={10} />Đợt thanh toán</label>
                                <button
                                  type="button"
                                  onClick={() => setPreviewData({
                                    ...previewData,
                                    thanh_toan_dot: [...(previewData.thanh_toan_dot || []), { so_tien: 0, ngay_du_kien: '', trang_thai: 'Chưa chi' }]
                                  })}
                                  className="flex items-center gap-1 px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-[10px] font-bold transition-colors"
                                >
                                  <Plus size={10} /> Thêm đợt
                                </button>
                              </div>
                              {(previewData.thanh_toan_dot || []).length === 0 && (
                                <p className="text-[10px] text-slate-500 italic text-center py-1">Chưa có đợt thanh toán nào</p>
                              )}
                              {(previewData.thanh_toan_dot || []).map((dot: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-12 gap-1.5 items-center">
                                  <div className="col-span-1 text-[10px] text-slate-500 text-center font-bold">{idx + 1}</div>
                                  <input
                                    type="number"
                                    placeholder="Số tiền"
                                    className="col-span-4 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-emerald-400"
                                    value={dot.so_tien || 0}
                                    onChange={(e) => {
                                      const updated = [...(previewData.thanh_toan_dot || [])];
                                      updated[idx] = { ...updated[idx], so_tien: Number(e.target.value) };
                                      setPreviewData({ ...previewData, thanh_toan_dot: updated });
                                    }}
                                  />
                                  <input
                                    type="date"
                                    className="col-span-4 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none focus:border-emerald-400"
                                    value={dot.ngay_du_kien || ''}
                                    onChange={(e) => {
                                      const updated = [...(previewData.thanh_toan_dot || [])];
                                      updated[idx] = { ...updated[idx], ngay_du_kien: e.target.value };
                                      setPreviewData({ ...previewData, thanh_toan_dot: updated });
                                    }}
                                  />
                                  <select
                                    className="col-span-2 px-1 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] focus:outline-none"
                                    value={dot.trang_thai || 'Chưa chi'}
                                    onChange={(e) => {
                                      const updated = [...(previewData.thanh_toan_dot || [])];
                                      updated[idx] = { ...updated[idx], trang_thai: e.target.value };
                                      setPreviewData({ ...previewData, thanh_toan_dot: updated });
                                    }}
                                  >
                                    <option value="Chưa chi" className="bg-slate-800">Chưa chi</option>
                                    <option value="Đã chi" className="bg-slate-800">Đã chi</option>
                                  </select>
                                  <button
                                    type="button"
                                    className="col-span-1 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors text-center"
                                    onClick={() => {
                                      const updated = (previewData.thanh_toan_dot || []).filter((_: any, i: number) => i !== idx);
                                      setPreviewData({ ...previewData, thanh_toan_dot: updated });
                                    }}
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Giá trị trước thuế</label>
                                <input 
                                  type="number"
                                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                  value={previewData.giaTriTruocThue || 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setPreviewData({
                                      ...previewData, 
                                      giaTriTruocThue: val,
                                      giaTriSauThue: val + (previewData.tienThue || 0)
                                    });
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Tiền thuế VAT</label>
                                <input 
                                  type="number"
                                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                                  value={previewData.tienThue || 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setPreviewData({
                                      ...previewData, 
                                      tienThue: val,
                                      giaTriSauThue: (previewData.giaTriTruocThue || 0) + val
                                    });
                                  }}
                                />
                              </div>
                            </div>
                            <div className="space-y-1 pt-2 border-t border-white/10">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Tổng cộng sau thuế</label>
                              <div className="text-2xl font-bold text-emerald-400">
                                {(previewData.giaTriSauThue || 0).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linking Section */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200">
                      <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-blue-600" />
                        Liên kết & Xác nhận
                      </h4>

                      <div className="space-y-6">
                        {/* 3-Level Cascading Plan Selection */}
                        <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">1. Chọn Năm kế hoạch</label>
                              <div className="relative">
                                <select 
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-blue-600"
                                  value={filterYear}
                                  onChange={(e) => handleYearChange(Number(e.target.value))}
                                >
                                  {uniqueYears.length > 0 ? (
                                    uniqueYears.map(y => <option key={y} value={y as number}>Năm {y}</option>)
                                  ) : (
                                    <option value={new Date().getFullYear()}>Năm {new Date().getFullYear()}</option>
                                  )}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">2. Chọn Phụ lục lọc</label>
                              <div className="relative">
                                <select 
                                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={filterAppendix}
                                  onChange={(e) => handleAppendixChange(e.target.value)}
                                >
                                  <option value="">Tất cả Phụ lục</option>
                                  {sortedMasterAppendices.map(app => (
                                    <option key={app.id} value={app.tenPhuLuc}>{app.tenPhuLuc}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-blue-600 uppercase">3. Chọn Mã Kế hoạch (Bắt buộc)</label>
                            <div className="relative">
                              <select 
                                className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={previewData.planDocId || plans.find(p => p.planId === previewData.planId)?.id || ''}
                                onChange={(e) => {
                                  const docId = e.target.value;
                                  const matched = plans.find(p => p.id === docId);
                                  setPreviewData({
                                    ...previewData,
                                    planDocId: docId,
                                    planId: matched ? matched.planId : ''
                                  });
                                }}
                              >
                                <option value="">-- Chọn Mã KH --</option>
                                {filteredPlansForSelect.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.planId} - {p.description}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none" size={16} />
                            </div>
                          </div>
                        </div>

                        {/* Contract Selection for Invoices */}
                        {previewData.type === 'invoice' && (
                          <div className="p-4 bg-emerald-900/20 rounded-xl border border-emerald-500/30 space-y-2">
                            <label className="text-[10px] font-bold text-emerald-300 uppercase flex items-center gap-1.5">
                              <FileText size={10} />
                              Số Hợp đồng liên kết
                              <span className="text-amber-400 font-normal normal-case">(chọn để cập nhật Tình trạng HĐ)</span>
                            </label>
                            <div className="relative">
                              <select
                                className="w-full px-3 py-2.5 bg-slate-800/60 border border-emerald-500/50 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                                value={previewData.contractId || ''}
                                onChange={(e) => {
                                  const selectedContract = contracts.find(c => c.id === e.target.value);
                                  setPreviewData({
                                    ...previewData,
                                    contractId: e.target.value,
                                    // Tự động điền planId từ hợp đồng được chọn
                                    planId: selectedContract?.planId || previewData.planId,
                                  });
                                }}
                              >
                                <option value="">-- Chưa có hợp đồng (Chi phí lẻ) --</option>
                                {contracts.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.contractNumber} | {c.contractor ? c.contractor.substring(0, 35) : 'N/A'}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 pointer-events-none" size={16} />
                            </div>
                            {previewData.contractId ? (
                              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                                ✅ Đã liên kết — Hợp đồng sẽ chuyển sang &ldquo;Hoàn thành&rdquo; khi lưu
                              </p>
                            ) : (
                              <p className="text-[11px] text-amber-400">⚠️ Không chọn hợp đồng → Hóa đơn lưu là Chi phí lẻ, không ảnh hưởng Tình trạng HĐ.</p>
                            )}
                          </div>
                        )}


                        <div className="flex gap-3 pt-4">
                          <button 
                            onClick={() => setPreviewData(null)}
                            className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                          >
                            Hủy & Làm lại
                          </button>
                          <button 
                            onClick={confirmSave}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                          >
                            <CheckCircle2 size={20} />
                            Xác nhận & Lưu
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* View Detail Modal */}
      {isViewModalOpen && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl text-white",
                  activeTab === 'contract' ? "bg-blue-600" : "bg-emerald-600"
                )}>
                  <Eye size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Chi tiết tài liệu</h3>
                  <p className="text-xs text-slate-500">Thông tin chi tiết {activeTab === 'contract' ? 'Hợp đồng' : 'Hóa đơn'}</p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Số hiệu</label>
                  <p className="text-sm font-bold text-slate-900 font-mono">{selectedRecord.contractNumber || selectedRecord.invoiceNumber}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Ngày {activeTab === 'contract' ? 'ký' : 'lập'}</label>
                  <p className="text-sm text-slate-700 font-mono">{formatDateDisplay(selectedRecord.date)}</p>
                </div>
                {activeTab === 'contract' && (
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tên hợp đồng</label>
                    <p className="text-sm text-slate-700 font-medium">{selectedRecord.tenHopDong || '-'}</p>
                  </div>
                )}
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">{activeTab === 'contract' ? 'Nhà thầu' : 'Đơn vị xuất'}</label>
                  <p className="text-sm text-slate-700 font-medium">{selectedRecord.contractor || selectedRecord.sellerName}</p>
                </div>
                {activeTab === 'contract' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Giá trị (VNĐ)</label>
                    <p className="text-lg font-bold text-blue-600">{(selectedRecord.value || 0).toLocaleString()}</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Trước thuế</label>
                      <p className="text-sm font-bold text-slate-900">{(selectedRecord.giaTriTruocThue || 0).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Tiền thuế</label>
                      <p className="text-sm font-bold text-slate-900">{(selectedRecord.tienThue || 0).toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <label className="text-[10px] font-bold text-emerald-600 uppercase">Tổng thanh toán (Sau thuế)</label>
                      <p className="text-2xl font-bold text-emerald-700">{(selectedRecord.giaTriSauThue || 0).toLocaleString()}</p>
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Mã Kế hoạch</label>
                  <p className="text-sm font-bold text-blue-600 font-mono">{plans.find(p => p.id === selectedRecord.planDocId)?.planId || selectedRecord.planId || 'N/A'}</p>
                </div>
                {activeTab === 'contract' && selectedRecord.procurement_method && (
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-violet-500 uppercase">Hình thức lựa chọn nhà thầu</label>
                    <span className="inline-flex items-center px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-sm font-semibold border border-violet-200">
                      {selectedRecord.procurement_method}
                    </span>
                  </div>
                )}
                {activeTab === 'invoice' && (
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Hợp đồng liên kết</label>
                    <p className="text-sm text-slate-700">
                      {contracts.find(c => c.id === selectedRecord.contractId)?.contractNumber || 'N/A'}
                    </p>
                  </div>
                )}
              </div>

              {selectedRecord.filePath && (
                <div className="pt-6 border-t border-slate-100">
                  <a 
                    href={selectedRecord.filePath} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    <FileUp size={18} />
                    Mở file tài liệu gốc
                  </a>
                </div>
              )}

              <div className="pt-4 text-[10px] text-slate-400 flex flex-col gap-1">
                <p>Người tạo: {selectedRecord.createdBy}</p>
                <p>Ngày tạo: {formatDateTimeDisplay(selectedRecord.createdAt)}</p>
                {selectedRecord.updatedAt && (
                  <>
                    <p>Người cập nhật: {selectedRecord.updatedBy}</p>
                    <p>Ngày cập nhật: {formatDateTimeDisplay(selectedRecord.updatedAt)}</p>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {isEditVendorModalOpen && editingVendor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Edit3 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Sửa thông tin Nhà thầu</h2>
                  <p className="text-sm text-slate-500">Cập nhật dữ liệu vào danh bạ (ID: {editingVendor.vendorId})</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsEditVendorModalOpen(false);
                  setEditingVendor(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setProcessing(true);
              try {
                await setDoc(doc(db, 'vendors', editingVendor.vendorId), {
                  name: editingVendor.name,
                  taxCode: editingVendor.taxCode || '',
                  address: editingVendor.address || '',
                  representative: editingVendor.representative || '',
                  phoneNumber: editingVendor.phoneNumber || '',
                  businessSector: editingVendor.businessSector || '',
                  updatedAt: new Date().toISOString()
                }, { merge: true });
                toast.success('Đã cập nhật thông tin nhà thầu thành công.');
                setIsEditVendorModalOpen(false);
                setEditingVendor(null);
              } catch (error) {
                toast.error('Lỗi khi cập nhật nhà thầu');
              }
              setProcessing(false);
            }} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tên nhà thầu (Chuẩn hóa)</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    value={editingVendor.name}
                    onChange={(e) => setEditingVendor({...editingVendor, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Mã số thuế</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      value={editingVendor.taxCode}
                      onChange={(e) => setEditingVendor({...editingVendor, taxCode: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Người đại diện</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingVendor.representative}
                      onChange={(e) => setEditingVendor({...editingVendor, representative: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Địa chỉ</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editingVendor.address}
                    onChange={(e) => setEditingVendor({...editingVendor, address: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Số điện thoại</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingVendor.phoneNumber || ''}
                      onChange={(e) => setEditingVendor({...editingVendor, phoneNumber: e.target.value})}
                      placeholder="VD: 0987654321"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Ngành nghề kinh doanh</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editingVendor.businessSector || ''}
                      onChange={(e) => setEditingVendor({...editingVendor, businessSector: e.target.value})}
                      placeholder="VD: Xây dựng, Môi trường..."
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    setIsEditVendorModalOpen(false);
                    setEditingVendor(null);
                  }}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={processing}
                  className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                >
                  {processing ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  Lưu Thay Đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Xác nhận xóa</h3>
              <p className="text-slate-500 text-sm">
                Bạn có chắc chắn muốn xóa bản ghi này? <br />
                <span className="text-red-500 font-medium">Dữ liệu không thể khôi phục sau khi xóa.</span>
              </p>
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  'Xác nhận xóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
