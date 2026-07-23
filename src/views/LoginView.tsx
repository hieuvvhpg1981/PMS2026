import React, { useState } from 'react';
import { authenticateUserCredentials } from '../pms/T1_Utils';
import { PmsService, UserProfile } from '../pms/T2_Services';
import {
  ShieldCheck,
  Building2,
  HardHat,
  FileCheck2,
  Lock,
  Globe2,
  Key,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Credentials Login Handler
  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const allAccounts = PmsService.getUserAccounts();
      const res = authenticateUserCredentials(emailInput, passwordInput, allAccounts);

      if (!res.success || !res.user) {
        setErrorMessage(res.message);
        toast.error('Đăng nhập không thành công!');
        setIsSubmitting(false);
        return;
      }

      // Simulate 1 hour expiration timestamp (3600 seconds)
      const simulatedExp = Math.floor(Date.now() / 1000) + 3600;
      const authenticatedUser: UserProfile & { exp?: number } = {
        ...res.user,
        exp: simulatedExp
      };

      PmsService.setStoredAuthUser(authenticatedUser);
      toast.success(`Xin chào ${authenticatedUser.name}! Đăng nhập hệ thống thành công.`);
      onLoginSuccess(authenticatedUser);
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col lg:flex-row font-sans antialiased">
      {/* LEFT SIDE: HERO BRANDING BANNER */}
      <div className="lg:w-7/12 p-8 lg:p-16 flex flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 border-r border-slate-800 relative overflow-hidden">
        {/* Decorative Grid Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

        {/* Top Logo Header */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center text-2xl shadow-xl shadow-blue-500/30">
            P
          </div>
          <div>
            <div className="font-black text-xl text-white tracking-tight">PMS 2026 ENTERPRISE</div>
            <div className="text-xs text-blue-300 font-semibold tracking-wider uppercase">
              Hệ Thống Quản Lý Dự Án Đầu Tư Xây Dựng Số
            </div>
          </div>
        </div>

        {/* Hero Features & Legal Standards */}
        <div className="relative z-10 my-12 space-y-8 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-900/60 border border-blue-500/30 text-blue-300 font-bold text-xs">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Chuẩn Luật Xây Dựng 135/2025/QH15 & Nghị Định 217/2026/NĐ-CP</span>
          </div>

          <h1 className="text-3xl lg:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Quản Lý Toàn Bộ Vòng Đời Dự Án Xây Dựng Minh Bạch & Bảo Mật Tuyệt Đối
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <Building2 className="w-5 h-5 text-blue-400 shrink-0" />
              <span>Auto-routing Định tuyến Nhóm A / B / C & BCKTKT</span>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <HardHat className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>E-Logbook Nhật Ký Thi Công GPS & Hard Block Kế Hoạch</span>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <FileCheck2 className="w-5 h-5 text-purple-400 shrink-0" />
              <span>Hồ Sơ Bản Vẽ & Hợp Đồng QĐ 1040/QĐ-BXD</span>
            </div>

            <div className="flex items-center gap-3 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/60">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Row-Level Access Control & Google Drive Cá Nhân</span>
            </div>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="relative z-10 text-xs text-slate-400 font-medium flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-800">
          <div>© 2026 Ban QLDA Chuyên Ngành Xây Dựng Việt Nam</div>
          <div className="flex items-center gap-2 text-slate-400">
            <Globe2 className="w-4 h-4 text-blue-400" />
            <span>Tích hợp CSDL Quốc Gia TT 39/2026/TT-BXD</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: SECURE FORM CREDENTIALS LOGIN CARD ONLY */}
      <div className="lg:w-5/12 p-8 lg:p-16 flex flex-col justify-center bg-white text-slate-800 relative">
        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Form Header */}
          <div className="space-y-2 text-center">
            <div className="inline-flex p-3.5 bg-blue-600 text-white rounded-2xl mb-1 shadow-md shadow-blue-500/20">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight uppercase">
              HỆ THỐNG QUẢN LÝ DỰ ÁN ĐẦU TƯ XÂY DỰNG (PMS 2026)
            </h2>
            <p className="text-xs text-slate-500 font-semibold">
              Vui lòng nhập Email và Mật khẩu tài khoản nội bộ do Quản trị viên cấp
            </p>
          </div>

          {/* ERROR ALERT BANNER */}
          {errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-start gap-3 animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* SECURE CREDENTIALS LOGIN FORM */}
          <form onSubmit={handleCredentialsSubmit} className="space-y-6 text-xs">
            {/* Input 1: Email */}
            <div>
              <label className="block font-extrabold text-slate-700 mb-2 uppercase tracking-wider">
                Địa chỉ Email (*)
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  placeholder="nhapemail@domain.com"
                  className="w-full pl-11 pr-4 py-3.5 border border-slate-300 rounded-2xl bg-white font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm transition-all shadow-2xs"
                />
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            {/* Input 2: Password */}
            <div>
              <label className="block font-extrabold text-slate-700 mb-2 uppercase tracking-wider">
                Mật khẩu (*)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3.5 border border-slate-300 rounded-2xl bg-white font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-sm transition-all shadow-2xs"
                />
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-2xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 tracking-wider uppercase"
            >
              <Key className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang xác thực...' : '[🔑 ĐĂNG NHẬP HỆ THỐNG]'}</span>
            </button>
          </form>

          {/* Security Notice */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-500 font-medium text-center">
            🔒 Hệ thống đăng nhập bảo mật nội bộ. Nếu chưa có tài khoản hoặc quên mật khẩu, vui lòng liên hệ Admin Ban QLDA để được cấp lại.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
