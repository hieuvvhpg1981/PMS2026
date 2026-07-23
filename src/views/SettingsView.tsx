import React, { useState, useEffect } from 'react';
import { db, createUserForAdmin, updateUserPassword, adminResetPassword } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { toast } from 'sonner';
import { Users, CheckCircle, XCircle, Shield, User as UserIcon, Clock, Plus, Trash2, Edit2, FileText, X, UserPlus, Mail, Building2, Lock, MapPin, Gavel } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UserProfile {
  id: string;
  email: string;
  hoTen: string;
  phongBan: string;
  role: 'Admin' | 'User';
  trangThai: 'Pending' | 'Active' | 'Rejected';
  createdAt: string;
  preApproved?: boolean;
  matKhau?: string;
}

interface MasterAppendix {
  id: string;
  tenPhuLuc: string;
}

interface ProcurementMethod {
  id: string;
  name: string;
}

const DEFAULT_DEPARTMENTS = [
  'Bảo vệ an toàn',
  'Các phòng',
  'Hóa Nghiệm',
  'Kỹ thuật đầu tư',
  'Quản lý hàng hóa',
  'Tổ chức Hành chính',
];

// ─── Sub-component: một hàng phòng ban — tự query Firestore để lấy doc.id ───
function DeptRow({
  idx, deptName, onEdit, onDelete
}: {
  idx: number;
  deptName: string;
  onEdit: (id: string, name: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [docId, setDocId] = React.useState('');

  React.useEffect(() => {
    import('firebase/firestore').then(({ getDocs, query, collection, where }) => {
      import('../lib/firebase').then(({ db }) => {
        getDocs(query(collection(db, 'departments'), where('name', '==', deptName))).then(snap => {
          if (!snap.empty) setDocId(snap.docs[0].id);
        });
      });
    });
  }, [deptName]);

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 text-sm text-slate-500">{idx + 1}</td>
      <td className="px-6 py-4">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          {deptName}
        </span>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => docId && onEdit(docId, deptName)}
            disabled={!docId}
            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-40"
            title="Sửa"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => docId && onDelete(docId, deptName)}
            disabled={!docId}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-40"
            title="Xóa"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function SettingsView() {
  const [activeTab, setActiveTab] = useState<'users' | 'appendices' | 'procurement' | 'departments'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [appendices, setAppendices] = useState<MasterAppendix[]>([]);
  const [procurementMethods, setProcurementMethods] = useState<ProcurementMethod[]>([]);
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState(true);

  // Department CRUD State
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<{ id: string; name: string } | null>(null);
  const [newDeptName, setNewDeptName] = useState('');

  // Appendix CRUD State
  const [isAppendixModalOpen, setIsAppendixModalOpen] = useState(false);
  const [editingAppendix, setEditingAppendix] = useState<MasterAppendix | null>(null);
  const [newAppendixName, setNewAppendixName] = useState('');

  // Procurement Method CRUD State
  const [isProcurementModalOpen, setIsProcurementModalOpen] = useState(false);
  const [editingProcurement, setEditingProcurement] = useState<ProcurementMethod | null>(null);
  const [newProcurementName, setNewProcurementName] = useState('');

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ hoTen: '', email: '', phongBan: '', role: 'User' as 'Admin' | 'User', password: '' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isSavingUser, setIsSavingUser] = useState(false);

  // Edit User Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ hoTen: '', phongBan: '', role: 'User' as 'Admin' | 'User', newPassword: '' });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
      setLoading(false);
    });
    const unsubAppendices = onSnapshot(collection(db, 'master_appendices'), (snap) => {
      setAppendices(snap.docs.map(d => ({ id: d.id, ...d.data() } as MasterAppendix)));
    });
    const unsubDepts = onSnapshot(collection(db, 'departments'), (snap) => {
      if (!snap.empty) {
        const names = snap.docs.map(d => (d.data().name as string)).filter(Boolean).sort((a, b) =>
          a.localeCompare(b, undefined, { sensitivity: 'base' })
        );
        setDepartments(names);
      }
    });
    const unsubPM = onSnapshot(collection(db, 'procurement_methods'), (snap) => {
      setProcurementMethods(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProcurementMethod)));
    });
    return () => { unsubUsers(); unsubAppendices(); unsubDepts(); unsubPM(); };
  }, []);

  // ================== USER HANDLERS ==================

  const validateEmail = (email: string) => {
    if (!email) return 'Email không được để trống';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email không đúng định dạng';
    return '';
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(newUserForm.email);
    if (err) { setEmailError(err); return; }
    if (!newUserForm.hoTen.trim()) { toast.error('Vui lòng nhập họ và tên'); return; }
    if (!newUserForm.phongBan) { toast.error('Vui lòng chọn phòng ban'); return; }
    if (!newUserForm.password.trim()) { toast.error('Vui lòng nhập mật khẩu'); return; }
    if (newUserForm.password.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return; }

    setIsSavingUser(true);
    try {
      const emailKey = newUserForm.email.trim().toLowerCase();
      const hoTenFormatted = newUserForm.hoTen.trim()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      // Bước 1: Tạo tài khoản Firebase Auth qua Secondary App
      // (không đăng xuất Admin đang đăng nhập)
      let uid = '';
      try {
        uid = await createUserForAdmin(emailKey, newUserForm.password);
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          toast.error('Email này đã có tài khoản Firebase Auth. Hồ sơ Firestore sẽ được cập nhật.');
        } else {
          throw authErr;
        }
      }

      // Bước 2: Lưu hồ sơ vào Firestore (bao gồm password_plain để Admin quản lý tập trung)
      await setDoc(doc(db, 'users', emailKey), {
        email: emailKey,
        hoTen: hoTenFormatted,
        phongBan: newUserForm.phongBan,
        role: newUserForm.role,
        trangThai: 'Active',
        preApproved: true,
        password_plain: newUserForm.password.trim(),
        ...(uid && { uid }),
        createdAt: new Date().toISOString(),
      }, { merge: true });

      toast.success(`✅ Tạo thành công: ${hoTenFormatted} có thể đăng nhập ngay!`);
      setIsAddUserModalOpen(false);
      setNewUserForm({ hoTen: '', email: '', phongBan: '', role: 'User', password: '' });
      setShowNewPassword(false);
      setEmailError('');
    } catch (error: any) {
      const code = error.code || '';
      if (code === 'auth/weak-password') {
        toast.error('Mật khẩu quá yếu. Vui lòng dùng ít nhất 6 ký tự.');
      } else if (code === 'auth/invalid-email') {
        toast.error('Email không hợp lệ.');
      } else {
        toast.error('Lỗi: ' + (error.message || 'Không xác định'));
      }
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { trangThai: 'Active' });
      toast.success('Đã phê duyệt người dùng');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const handleReject = async (userId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn từ chối người dùng này?')) return;
    try {
      await updateDoc(doc(db, 'users', userId), { trangThai: 'Rejected' });
      toast.success('Đã từ chối người dùng');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const handlePromote = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'Admin' ? 'User' : 'Admin';
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success(`Đã cập nhật quyền thành ${newRole}`);
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId: string, hoTen: string) => {
    if (!window.confirm(`Xóa người dùng "${hoTen}" khỏi hệ thống? Hành động này chỉ xóa hồ sơ Firestore.`)) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      toast.success('Đã xóa hồ sơ người dùng');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const openEditModal = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({ hoTen: user.hoTen, phongBan: user.phongBan, role: user.role, newPassword: '' });
    setShowEditPassword(false);
    setIsEditModalOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editForm.hoTen.trim()) { toast.error('Vui lòng nhập họ và tên'); return; }
    if (!editForm.phongBan) { toast.error('Vui lòng chọn phòng ban'); return; }
    if (editForm.newPassword && editForm.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setIsSavingEdit(true);
    try {
      const hoTenFormatted = editForm.hoTen.trim()
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      const updateData: Record<string, any> = {
        hoTen: hoTenFormatted,
        phongBan: editForm.phongBan,
        role: editForm.role,
        updatedAt: new Date().toISOString(),
      };

      // Nếu Admin đặt mật khẩu mới
      if (editForm.newPassword.trim()) {
        const knownOld = (editingUser as any).password_plain || undefined;
        // Cập nhật Firebase Auth — không cần bắt buộc mật khẩu cũ
        await adminResetPassword(editingUser.email, editForm.newPassword.trim(), knownOld);
        // Lưu password_plain mới vào Firestore
        updateData.password_plain = editForm.newPassword.trim();
      }

      await updateDoc(doc(db, 'users', editingUser.id), updateData);

      toast.success(`✅ Đã cập nhật: ${hoTenFormatted}`);
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (error: any) {
      toast.error('Lỗi: ' + (error.message || 'Không xác định'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleResetPassword = async () => {
    // giữ lại nhưng ẩn khỏi UI chính
  };

  // ================== APPENDIX HANDLERS ==================

  const handleSaveAppendix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppendixName.trim()) return;
    try {
      if (editingAppendix) {
        await setDoc(doc(db, 'master_appendices', editingAppendix.id), { tenPhuLuc: newAppendixName.trim() });
        toast.success('Đã cập nhật phụ lục');
      } else {
        await addDoc(collection(db, 'master_appendices'), { tenPhuLuc: newAppendixName.trim() });
        toast.success('Đã thêm phụ lục mới');
      }
      setIsAppendixModalOpen(false);
      setEditingAppendix(null);
      setNewAppendixName('');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteAppendix = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phụ lục này?')) return;
    try {
      await deleteDoc(doc(db, 'master_appendices', id));
      toast.success('Đã xóa phụ lục');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  // ================== DEPARTMENT HANDLERS ==================

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    try {
      if (editingDept) {
        await setDoc(doc(db, 'departments', editingDept.id), { name: newDeptName.trim() });
        toast.success('Đã cập nhật phòng ban');
      } else {
        // Kiểm tra trùng tên
        const exists = departments.some(d => d.toLowerCase() === newDeptName.trim().toLowerCase());
        if (exists) { toast.error('Tên phòng ban đã tồn tại!'); return; }
        await addDoc(collection(db, 'departments'), { name: newDeptName.trim() });
        toast.success('Đã thêm phòng ban mới');
      }
      setIsDeptModalOpen(false);
      setEditingDept(null);
      setNewDeptName('');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!window.confirm(`Xóa phòng ban "${name}"? Dữ liệu đã dùng phòng ban này sẽ không bị ảnh hưởng.`)) return;
    try {
      await deleteDoc(doc(db, 'departments', id));
      toast.success('Đã xóa phòng ban');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  // ================== PROCUREMENT METHOD HANDLERS ==================

  const handleSaveProcurement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProcurementName.trim()) return;
    try {
      if (editingProcurement) {
        await setDoc(doc(db, 'procurement_methods', editingProcurement.id), { name: newProcurementName.trim() });
        toast.success('Đã cập nhật hình thức thầu');
      } else {
        await addDoc(collection(db, 'procurement_methods'), { name: newProcurementName.trim() });
        toast.success('Đã thêm hình thức thầu mới');
      }
      setIsProcurementModalOpen(false);
      setEditingProcurement(null);
      setNewProcurementName('');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const handleDeleteProcurement = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hình thức thầu này?')) return;
    try {
      await deleteDoc(doc(db, 'procurement_methods', id));
      toast.success('Đã xóa hình thức thầu');
    } catch (error: any) {
      toast.error('Lỗi: ' + error.message);
    }
  };

  const pendingUsers = users.filter(u => u.trangThai === 'Pending');
  const activeUsers = users.filter(u => u.trangThai === 'Active');

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg text-white">
          <Shield size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Quản lý Hệ thống</h2>
          <p className="text-sm text-slate-500">Phê duyệt người dùng và quản lý danh mục chuẩn</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all',
            activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Users size={18} />
          Người dùng
        </button>
        <button
          onClick={() => setActiveTab('appendices')}
          className={cn(
            'flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all',
            activeTab === 'appendices' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <FileText size={18} />
          Danh mục Phụ lục
        </button>
        <button
          onClick={() => setActiveTab('procurement')}
          className={cn(
            'flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all',
            activeTab === 'procurement' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Gavel size={18} />
          Hình thức thầu
        </button>
        <button
          onClick={() => setActiveTab('departments')}
          className={cn(
            'flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all',
            activeTab === 'departments' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          <Building2 size={18} />
          Danh mục Phòng ban
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          {/* ===== PRE-ADD USER SECTION ===== */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 flex items-center justify-between shadow-lg shadow-blue-100">
            <div>
              <h3 className="text-white font-bold text-lg">Thêm người dùng trước</h3>
              <p className="text-blue-100 text-sm mt-1">Admin chủ động tạo và phê duyệt tài khoản — người dùng đăng nhập sẽ vào thẳng Dashboard.</p>
            </div>
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-md shrink-0"
            >
              <UserPlus size={18} />
              Thêm người dùng
            </button>
          </div>

          {/* Pending Users Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <Clock size={20} />
              <h3 className="font-bold">Yêu cầu chờ phê duyệt ({pendingUsers.length})</h3>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Người dùng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Phòng ban</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Ngày đăng ký</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                        Không có yêu cầu nào đang chờ
                      </td>
                    </tr>
                  ) : (
                    pendingUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                              <UserIcon size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{user.hoTen}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{user.phongBan}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">
                          {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApprove(user.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all text-xs font-bold"
                            >
                              <CheckCircle size={14} />
                              Phê duyệt
                            </button>
                            <button
                              onClick={() => handleReject(user.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-xs font-bold"
                            >
                              <XCircle size={14} />
                              Từ chối
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Users Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <Users size={20} />
              <h3 className="font-bold">Người dùng đang hoạt động ({activeUsers.length})</h3>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Người dùng</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Phòng ban</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Vai trò</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nguồn</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Chưa có người dùng nào</td>
                    </tr>
                  ) : (
                    activeUsers.map(user => (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-400">
                              <UserIcon size={20} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{user.hoTen}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{user.phongBan}</td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            'px-2 py-1 rounded text-[10px] font-bold uppercase',
                            user.role === 'Admin' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'
                          )}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {user.preApproved ? (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-blue-50 text-blue-600">Admin tạo trước</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-[10px] font-bold bg-slate-50 text-slate-400">Tự đăng ký</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(user)}
                              title="Sửa thông tin"
                              className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.hoTen)}
                              title="Xóa hồ sơ"
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : activeTab === 'appendices' ? (
        /* Appendix Management Section */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-600">
              <FileText size={20} />
              <h3 className="font-bold">Danh mục Phụ lục chuẩn ({appendices.length})</h3>
            </div>
            <button
              onClick={() => {
                setEditingAppendix(null);
                setNewAppendixName('');
                setIsAppendixModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              <Plus size={16} />
              Thêm Phụ lục
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-16">STT</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tên Phụ lục</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appendices.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">
                      Chưa có phụ lục nào trong danh mục chuẩn
                    </td>
                  </tr>
                ) : (
                  appendices.map((app, idx) => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">{idx + 1}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{app.tenPhuLuc}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingAppendix(app);
                              setNewAppendixName(app.tenPhuLuc);
                              setIsAppendixModalOpen(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteAppendix(app.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
          </div>
        </div>
      ) : activeTab === 'procurement' ? (
        /* Procurement Method Management Section */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-violet-600">
              <Gavel size={20} />
              <h3 className="font-bold">Danh mục Hình thức thầu ({procurementMethods.length})</h3>
            </div>
            <button
              onClick={() => {
                setEditingProcurement(null);
                setNewProcurementName('');
                setIsProcurementModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-all shadow-md shadow-violet-100"
            >
              <Plus size={16} />
              Thêm Hình thức thầu
            </button>
          </div>

          {procurementMethods.length === 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-700">
              💡 Chưa có hình thức thầu nào. Thêm các hình thức như: <strong>Chỉ định thầu, Chào hàng cạnh tranh, Đấu thầu rộng rãi, Mua sắm trực tiếp...</strong>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-16">STT</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tên Hình thức thầu</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {procurementMethods.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">
                      Chưa có hình thức thầu nào trong danh mục
                    </td>
                  </tr>
                ) : (
                  procurementMethods.map((pm, idx) => (
                    <tr key={pm.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-500">{idx + 1}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-900">
                          <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                          {pm.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setEditingProcurement(pm);
                              setNewProcurementName(pm.name);
                              setIsProcurementModalOpen(true);
                            }}
                            className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteProcurement(pm.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
          </div>
        </div>
      ) : activeTab === 'departments' ? (
        /* Department Management Section */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600">
              <Building2 size={20} />
              <h3 className="font-bold">Danh mục Phòng ban ({departments.length})</h3>
            </div>
            <button
              onClick={() => {
                setEditingDept(null);
                setNewDeptName('');
                setIsDeptModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100"
            >
              <Plus size={16} />
              Thêm Phòng ban
            </button>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
            💡 Danh sách này là nguồn dữ liệu chuẩn cho toàn hệ thống. Mọi dropdown "Chọn phòng ban" đều lấy từ đây.
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase w-16">STT</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tên Phòng ban</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic">
                      Chưa có phòng ban nào trong danh mục
                    </td>
                  </tr>
                ) : (
                  departments.map((deptName, idx) => {
                    // Tìm id từ Firestore để thao tác CRUD
                    return (
                      <DeptRow
                        key={deptName}
                        idx={idx}
                        deptName={deptName}
                        onEdit={(id, name) => {
                          setEditingDept({ id, name });
                          setNewDeptName(name);
                          setIsDeptModalOpen(true);
                        }}
                        onDelete={handleDeleteDepartment}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* ===== DEPARTMENT MODAL ===== */}
      {isDeptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <Building2 size={22} />
                <h3 className="text-lg font-bold">
                  {editingDept ? 'Cập nhật Phòng ban' : 'Thêm Phòng ban mới'}
                </h3>
              </div>
              <button
                onClick={() => { setIsDeptModalOpen(false); setEditingDept(null); setNewDeptName(''); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveDepartment} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase">Tên Phòng ban *</label>
                <input
                  required
                  autoFocus
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  placeholder="VD: Phòng Kỹ thuật, Phòng Tài chính..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsDeptModalOpen(false); setEditingDept(null); setNewDeptName(''); }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                  {editingDept ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* sentinel close */}
      {false && null}

      {/* ===== ADD USER MODAL ===== */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <UserPlus size={22} />
                <div>
                  <h3 className="text-lg font-bold">Thêm người dùng mới</h3>
                  <p className="text-blue-100 text-xs">Tài khoản sẽ được phê duyệt sẵn</p>
                </div>
              </div>
              <button
                onClick={() => { setIsAddUserModalOpen(false); setEmailError(''); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser}>
              <div className="p-6 space-y-5">
                {/* Họ và Tên */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <UserIcon size={12} /> Họ và Tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    autoFocus
                    value={newUserForm.hoTen}
                    onChange={e => setNewUserForm({ ...newUserForm, hoTen: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Mail size={12} /> Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      value={newUserForm.email}
                      onChange={e => {
                        const val = e.target.value.toLowerCase();
                        setNewUserForm({ ...newUserForm, email: val });
                        setEmailError(validateEmail(val));
                      }}
                      placeholder="ten.nv@congty.vn"
                      className={cn(
                        'w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all',
                        emailError
                          ? 'border-red-400 focus:ring-red-400 bg-red-50'
                          : 'border-slate-200 focus:ring-blue-500'
                      )}
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      ⚠ {emailError}
                    </p>
                  )}
                  {!emailError && newUserForm.email && (
                    <p className="text-xs text-emerald-600 mt-1">✓ Email hợp lệ</p>
                  )}
                </div>

                {/* Phòng ban */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Building2 size={12} /> Phòng ban <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={newUserForm.phongBan}
                    onChange={e => setNewUserForm({ ...newUserForm, phongBan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Vai trò */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Shield size={12} /> Vai trò
                  </label>
                  <div className="flex gap-3">
                    {(['User', 'Admin'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setNewUserForm({ ...newUserForm, role: r })}
                        className={cn(
                          'flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all',
                          newUserForm.role === r
                            ? r === 'Admin'
                              ? 'border-purple-500 bg-purple-50 text-purple-600'
                              : 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                        )}
                      >
                        {r === 'Admin' ? '🛡 Admin' : '👤 User'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mật khẩu */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Lock size={12} /> Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showNewPassword ? 'text' : 'password'}
                      value={newUserForm.password}
                      onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      {showNewPassword ? 'ẨN' : 'HIỆN'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">Mật khẩu này dùng để tạo tài khoản Firebase Auth — không lưu trong database.</p>
                </div>

                {/* Info box */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2">
                  <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-700">
                    Hệ thống sẽ tự động tạo <strong>tài khoản đăng nhập Firebase Auth</strong> và lưu <strong>hồ sơ Firestore</strong> cùng lúc. Nhân viên có thể đăng nhập ngay sau khi tạo.
                  </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsAddUserModalOpen(false); setEmailError(''); }}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser || !!emailError}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingUser ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang lưu...</>
                  ) : (
                    <><UserPlus size={16} /> Tạo tài khoản</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Appendix Modal */}
      {isAppendixModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAppendix ? 'Chỉnh sửa Phụ lục' : 'Thêm Phụ lục mới'}
              </h3>
              <button onClick={() => setIsAppendixModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleSaveAppendix}>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tên Phụ lục</label>
                  <input
                    autoFocus
                    required
                    value={newAppendixName}
                    onChange={(e) => setNewAppendixName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="VD: PL 1.2 - ĐTXDCB"
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAppendixModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== EDIT USER MODAL ====== */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Chỉnh sửa người dùng</h3>
                  <p className="text-xs text-slate-500">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingUser(null); }}
                className="p-2 hover:bg-white/80 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleEditUser}>
              <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">

                {/* Email (readonly) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Mail size={12} /> Email
                  </label>
                  <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 font-mono select-all">
                    {editingUser.email}
                  </div>
                  <p className="text-[10px] text-slate-400">Email không thể thay đổi sau khi tạo.</p>
                </div>

                {/* Họ và Tên */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <UserIcon size={12} /> Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    value={editForm.hoTen}
                    onChange={e => setEditForm({ ...editForm, hoTen: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>

                {/* Phòng ban */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Building2 size={12} /> Phòng ban <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editForm.phongBan}
                    onChange={e => setEditForm({ ...editForm, phongBan: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">-- Chọn phòng ban --</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                {/* Vai trò */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                    <Shield size={12} /> Vai trò
                  </label>
                  <div className="flex gap-3">
                    {(['User', 'Admin'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, role: r })}
                        className={cn(
                          'flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all',
                          editForm.role === r
                            ? r === 'Admin'
                              ? 'border-purple-500 bg-purple-50 text-purple-600'
                              : 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                        )}
                      >
                        {r === 'Admin' ? '🛡 Admin' : '👤 User'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Đổi mật khẩu trực tiếp */}
                <div className="space-y-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-amber-600" />
                    <p className="text-xs font-bold text-amber-800 uppercase">Đổi mật khẩu</p>
                    <span className="text-[10px] text-amber-500 ml-auto">Để trống nếu không đổi</span>
                  </div>
                  {(editingUser as any)?.password_plain && (
                    <p className="text-[11px] text-slate-500">
                      Mật khẩu hiện tại: <span className="font-mono tracking-widest">••••••</span>
                    </p>
                  )}
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      value={editForm.newPassword}
                      onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })}
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-amber-600 transition-colors"
                    >
                      {showEditPassword ? 'ẨN' : 'HIỆN'}
                    </button>
                  </div>
                  <p className="text-[10px] text-amber-700">
                    Hệ thống sẽ cập nhật mật khẩu trong cả <strong>Firestore</strong> và <strong>Firebase Auth</strong> cùng lúc.
                  </p>
                </div>

              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingUser(null); }}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSavingEdit ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Đang lưu...</>
                  ) : (
                    <><CheckCircle size={16} /> Lưu thay đổi</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Procurement Method Modal */}
      {isProcurementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-violet-50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProcurement ? 'Chỉnh sửa Hình thức thầu' : 'Thêm Hình thức thầu mới'}
              </h3>
              <button onClick={() => setIsProcurementModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleSaveProcurement}>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Tên Hình thức thầu</label>
                  <input
                    autoFocus
                    required
                    value={newProcurementName}
                    onChange={(e) => setNewProcurementName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="VD: Chỉ định thầu, Đấu thầu rộng rãi..."
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProcurementModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-all shadow-lg shadow-violet-200"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
