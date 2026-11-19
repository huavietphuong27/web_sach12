import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AVATAR_OPTIONS, AuthService } from '../services/authService';
import { X, Mail, Lock, User, Sparkles, Check, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar-1');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMode(authModalMode);
    setError(null);
    setSuccessMsg(null);
    setShowPassword(false);
    if (isAuthModalOpen && authModalMode === 'login') {
      const remembered = AuthService.getRememberedEmail();
      if (remembered) {
        setEmail(remembered);
        setRememberMe(true);
      }
    }
  }, [authModalMode, isAuthModalOpen]);

  useEffect(() => {
    if (!isAuthModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAuthModal();
      }
    };
    window.addEventListener('keydown', handleEscape);

    const focusTimer = window.setTimeout(() => {
      if (mode === 'register') {
        nameInputRef.current?.focus();
      } else {
        emailInputRef.current?.focus();
      }
    }, 10);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleEscape);
      window.clearTimeout(focusTimer);
    };
  }, [isAuthModalOpen, mode, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'login') {
      const res = login(email, password, rememberMe);
      if (!res.success) {
        setError(res.error || 'Đăng nhập thất bại.');
      }
    } else {
      const res = register(email, password, name, selectedAvatar);
      if (!res.success) {
        setError(res.error || 'Đăng ký thất bại.');
      } else {
        setSuccessMsg('Đăng ký thành công! Dữ liệu của bạn đã được khởi tạo.');
      }
    }
  };

  const handleQuickLogin = (accEmail: string, accPassword: string) => {
    setEmail(accEmail);
    setPassword(accPassword);
    setError(null);
    const res = login(accEmail, accPassword, rememberMe);
    if (!res.success) {
      setError(res.error || 'Đăng nhập mẫu thất bại.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Banner */}
        <div className="relative bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-900 text-white p-6 pb-5">
          <button
            type="button"
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold w-fit mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Tài Khoản Độc Giả BookMind AI</span>
          </div>

          <h2 className="font-serif text-2xl font-bold text-white">
            {mode === 'login' ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản mới'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {mode === 'login'
              ? 'Đăng nhập để đồng bộ sách yêu thích, lịch sử đọc và ghi chú cá nhân.'
              : 'Đăng ký ngay để lưu trữ vĩnh viễn dữ liệu đọc sách trên mọi phiên làm việc.'}
          </p>

          {/* Mode Switch Tabs */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl mt-4 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Đăng Ký
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-shake"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs"
            >
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Name Field (chỉ khi đăng ký) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên của bạn
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={nameInputRef}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                />
              </div>
            </div>
          )}

          {/* Avatar Selector (khi đăng ký) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Chọn hình đại diện (Avatar)
              </label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((av) => {
                  const isChosen = selectedAvatar === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setSelectedAvatar(av.id)}
                      className={`relative aspect-square rounded-xl ${av.bg} text-white flex items-center justify-center text-lg transition-transform cursor-pointer ${
                        isChosen
                          ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105 shadow-sm'
                          : 'opacity-70 hover:opacity-100 hover:scale-102'
                      }`}
                      title={av.label}
                    >
                      <span>{av.icon}</span>
                      {isChosen && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold border border-white">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Địa chỉ Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={emailInputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu {mode === 'register' && <span className="text-slate-400 font-normal">(từ 6 ký tự)</span>}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'login' && (
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none pt-0.5">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{mode === 'login' ? 'Đăng Nhập Ngay' : 'Hoàn Tất Đăng Ký'}</span>
            <ArrowRight className="w-4 h-4 text-indigo-300" />
          </button>

          {/* Demo account helper buttons */}
          {mode === 'login' && (
            <div className="pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Đăng nhập nhanh để kiểm thử:</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('demo@bookmind.vn', '123456')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Tài khoản độc giả trải nghiệm thông thường"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Độc Giả Demo</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin@bookmind.vn', 'admin123')}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Tài khoản Quản trị / Giảng viên có quyền xem bảng kiểm thử 5 mô hình"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Giảng Viên / Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('tamly@bookmind.vn', '123456')}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Tài khoản đã cày dữ liệu sách Tâm lý & Chữa lành"
                >
                  <span>🌸 Minh Tâm Lý</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('congnghe@bookmind.vn', '123456')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Tài khoản đã cày dữ liệu sách Công nghệ, AI & Kinh doanh"
                >
                  <span>🚀 Hùng Công Nghệ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('taichinh@bookmind.vn', '123456')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Tài khoản đã cào dữ liệu sách Kinh doanh, Tài chính & Đầu tư"
                >
                  <span>💰 Hoàng Đầu Tư</span>
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
