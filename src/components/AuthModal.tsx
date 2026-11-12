import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AVATAR_OPTIONS } from '../services/authService';
import { X, Mail, Lock, User, Sparkles, Check, AlertCircle, ArrowRight } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authModalMode, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(authModalMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar-1');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setMode(authModalMode);
    setError(null);
    setSuccessMsg(null);
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'login') {
      const res = login(email, password);
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

  const handleQuickDemo = () => {
    setEmail('demo@bookmind.vn');
    setPassword('123456');
    setError(null);
    const res = login('demo@bookmind.vn', '123456');
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
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
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
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <span>{mode === 'login' ? 'Đăng Nhập Ngay' : 'Hoàn Tất Đăng Ký'}</span>
            <ArrowRight className="w-4 h-4 text-indigo-300" />
          </button>

          {/* Demo account helper button */}
          {mode === 'login' && (
            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={handleQuickDemo}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1.5 hover:underline cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Thử nghiệm nhanh: Đăng nhập tài khoản Demo có sẵn</span>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
