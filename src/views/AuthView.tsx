import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AVATAR_OPTIONS } from '../services/authService';
import { Book } from '../types/book';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Bookmark,
  History,
  FileText,
  Star,
  Settings,
  Download,
  LogOut,
  KeyRound,
  Trash2,
  BookOpen,
  Award,
} from 'lucide-react';

interface AuthViewProps {
  onSelectBookById: (bookId: string) => void;
  allBooks: Book[];
  onNavigateHome: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onSelectBookById,
  allBooks,
  onNavigateHome,
}) => {
  const {
    currentUser,
    isAuthenticated,
    login,
    register,
    changePassword,
    resetPassword,
    logout,
    updateProfile,
    clearHistory,
    deleteBookNote,
  } = useAuth();

  // Mode: 'login' | 'register' | 'forgot'
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regAvatar, setRegAvatar] = useState('avatar-1');

  // Forgot password form state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');

  // Profile Edit / Security Tab state (when authenticated)
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'history' | 'notes' | 'settings' | 'security' | 'backup'>('overview');
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editAvatar, setEditAvatar] = useState(currentUser?.avatar || 'avatar-1');
  const [editBio, setEditBio] = useState(currentUser?.bio || '');

  // Change password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Alerts
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditAvatar(currentUser.avatar);
      setEditBio(currentUser.bio || '');
    }
    setStatusMsg(null);
  }, [currentUser]);

  const clearAlert = () => setStatusMsg(null);

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearAlert();
    const res = login(loginEmail, loginPassword);
    if (!res.success) {
      setStatusMsg({ type: 'error', text: res.error || 'Đăng nhập không thành công.' });
    } else {
      setStatusMsg({ type: 'success', text: 'Đăng nhập thành công! Chào mừng bạn trở lại.' });
    }
  };

  // Handle Register
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearAlert();
    if (regPassword !== regConfirmPassword) {
      setStatusMsg({ type: 'error', text: 'Mật khẩu xác nhận không trùng khớp.' });
      return;
    }
    const res = register(regEmail, regPassword, regName, regAvatar);
    if (!res.success) {
      setStatusMsg({ type: 'error', text: res.error || 'Đăng ký không thành công.' });
    } else {
      setStatusMsg({ type: 'success', text: 'Tạo tài khoản thành công! Toàn bộ dữ liệu của bạn đã được thiết lập.' });
    }
  };

  // Handle Forgot Password
  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    clearAlert();
    const res = resetPassword(forgotEmail, forgotNewPassword);
    if (!res.success) {
      setStatusMsg({ type: 'error', text: res.error || 'Đặt lại mật khẩu thất bại.' });
    } else {
      setStatusMsg({ type: 'success', text: 'Đặt lại mật khẩu thành công! Bây giờ bạn có thể đăng nhập bằng mật khẩu mới.' });
      setAuthMode('login');
      setLoginEmail(forgotEmail);
      setLoginPassword(forgotNewPassword);
    }
  };

  // Handle Quick Demo Login
  const handleQuickDemo = () => {
    clearAlert();
    setLoginEmail('demo@bookmind.vn');
    setLoginPassword('123456');
    const res = login('demo@bookmind.vn', '123456');
    if (!res.success) {
      setStatusMsg({ type: 'error', text: res.error || 'Lỗi đăng nhập tài khoản demo.' });
    }
  };

  // Handle Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    clearAlert();
    updateProfile({
      name: editName.trim(),
      avatar: editAvatar,
      bio: editBio.trim(),
    });
    setStatusMsg({ type: 'success', text: 'Đã cập nhật thông tin hồ sơ của bạn!' });
    setTimeout(() => clearAlert(), 2500);
  };

  // Handle Change Password
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    clearAlert();
    if (newPassword !== confirmNewPassword) {
      setStatusMsg({ type: 'error', text: 'Mật khẩu mới xác nhận không khớp.' });
      return;
    }
    const res = changePassword(oldPassword, newPassword);
    if (!res.success) {
      setStatusMsg({ type: 'error', text: res.error || 'Đổi mật khẩu thất bại.' });
    } else {
      setStatusMsg({ type: 'success', text: 'Đổi mật khẩu thành công! Mật khẩu mới đã được cập nhật an toàn.' });
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    }
  };

  // Handle Export Data JSON
  const handleExportData = () => {
    if (!currentUser) return;
    const dataToExport = {
      app: 'BookMind AI',
      version: '2.5',
      exportedAt: new Date().toISOString(),
      user: currentUser,
    };
    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmind_backup_${currentUser.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Password strength calculator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: '', percent: 0, color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 6) score += 30;
    if (pwd.length >= 10) score += 20;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 15;

    if (score < 50) return { label: 'Yếu', percent: 33, color: 'bg-rose-500' };
    if (score < 80) return { label: 'Khá', percent: 66, color: 'bg-amber-500' };
    return { label: 'Mạnh', percent: 100, color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(regPassword);
  const currentAvatarMeta = AVATAR_OPTIONS.find((a) => a.id === currentUser?.avatar) || AVATAR_OPTIONS[0];
  const notesList = currentUser ? Object.values(currentUser.notes || {}) : [];
  const ratingsList = currentUser ? Object.entries(currentUser.ratings || {}) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-10">
      {/* =========================================================================
          TRƯỜNG HỢP 1: CHƯA ĐĂNG NHẬP -> HIỆN TRANG ĐĂNG NHẬP / ĐĂNG KÝ HOÀN CHỈNH
          ========================================================================= */}
      {!isAuthenticated && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          {/* CỘT TRÁI: BANNER THÔNG ĐIỆP & LỢI ÍCH TÀI KHOẢN */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-8 sm:p-10 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Hệ Thống Độc Giả BookMind AI</span>
              </div>

              <div>
                <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-white leading-tight">
                  Khởi Đầu Hành Trình Tri Thức Của Riêng Bạn
                </h1>
                <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                  Tạo tài khoản để đồng bộ hóa kho tri thức, lưu giữ trích dẫn quý giá và được các thuật toán AI gợi ý sách theo đúng gu cá nhân.
                </p>
              </div>

              {/* Danh sách lợi ích */}
              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-pink-400 shrink-0">
                    <Bookmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white">Lưu Trữ Sách Yêu Thích Không Giới Hạn</h2>
                    <p className="text-[11px] text-slate-400">Đánh dấu và gom những cuốn sách đắc địa nhất để đọc dần.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300 shrink-0">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white">Theo Dõi Lịch Sử Đọc Sách Thông Minh</h2>
                    <p className="text-[11px] text-slate-400">Tự động ghi nhận ngày giờ và các tác phẩm bạn đã xem gần đây.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white">Ghi Chú Trích Dẫn &amp; Bài Học Tâm Đắc</h2>
                    <p className="text-[11px] text-slate-400">Ghi lại cảm nhận riêng gắn liền với từng ấn bản sách.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
                    <Star className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white">Huấn Luyện AI Theo Gu Cá Nhân</h2>
                    <p className="text-[11px] text-slate-400">Điểm đánh giá của bạn giúp mô hình Collaborative KNN gợi ý ngày càng chính xác.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-8 border-t border-white/10 mt-8 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Bảo mật 100% trên thiết bị</span>
              </span>
              <span>Phiên bản v2.5 PRO</span>
            </div>
          </div>

          {/* CỘT PHẢI: FORM ĐĂNG NHẬP / ĐĂNG KÝ / QUÊN MẬT KHẨU */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm flex flex-col justify-between">
            <div>
              {/* Tab Selector */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    clearAlert();
                  }}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đăng Nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    clearAlert();
                  }}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Đăng Ký Tài Khoản
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('forgot');
                    clearAlert();
                  }}
                  className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                    authMode === 'forgot'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Quên Mật Khẩu
                </button>
              </div>

              {/* Status Alert */}
              {statusMsg && (
                <div
                  className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs mb-5 animate-fade-in ${
                    statusMsg.type === 'error'
                      ? 'bg-rose-50 border border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  {statusMsg.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* ================= FORM ĐĂNG NHẬP ================= */}
              {authMode === 'login' && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Địa chỉ Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="ten_cua_ban@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Mật khẩu
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setForgotEmail(loginEmail);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                        title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <span>Ghi nhớ phiên đăng nhập trên thiết bị này</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <span>Đăng Nhập Ngay</span>
                    <ArrowRight className="w-4 h-4 text-indigo-300" />
                  </button>
                </form>
              )}

              {/* ================= FORM ĐĂNG KÝ ================= */}
              {authMode === 'register' && (
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Họ và tên độc giả
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Ví dụ: Nguyễn Văn An"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Chọn Avatar Phong Cách Đọc Sách
                    </label>
                    <div className="grid grid-cols-6 gap-2">
                      {AVATAR_OPTIONS.map((av) => {
                        const isChosen = regAvatar === av.id;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setRegAvatar(av.id)}
                            className={`aspect-square rounded-xl ${av.bg} text-white flex items-center justify-center text-xl transition-all cursor-pointer relative ${
                              isChosen
                                ? 'ring-2 ring-indigo-600 ring-offset-2 scale-105 shadow-md'
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Địa chỉ Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="email_cua_ban@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Mật khẩu (≥ 6 ký tự)
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-1"
                        >
                          {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Xác nhận mật khẩu
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password strength meter */}
                  {regPassword && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Độ mạnh mật khẩu:</span>
                        <span className="font-bold text-slate-800">{strength.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.color} transition-all duration-300`}
                          style={{ width: `${strength.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <span>Hoàn Tất Đăng Ký Tài Khoản</span>
                    <ArrowRight className="w-4 h-4 text-indigo-300" />
                  </button>
                </form>
              )}

              {/* ================= FORM QUÊN MẬT KHẨU ================= */}
              {authMode === 'forgot' && (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs text-indigo-900 leading-relaxed">
                    Nhập email bạn đã đăng ký và mật khẩu mới mong muốn. Hệ thống sẽ đặt lại mật khẩu và cập nhật bảo mật ngay lập tức.
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Địa chỉ Email tài khoản
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="email_da_dang_ky@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mật khẩu mới (≥ 6 ký tự)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <span>Đặt Lại Mật Khẩu &amp; Đăng Nhập</span>
                    <KeyRound className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

            {/* Quick Demo Account 1-Click login */}
            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-medium">Bạn muốn dùng thử ngay không cần tạo tài khoản?</span>
              <button
                type="button"
                onClick={handleQuickDemo}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 font-bold text-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Đăng Nhập Demo 1-Click (demo@bookmind.vn)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TRƯỜNG HỢP 2: ĐÃ ĐĂNG NHẬP -> DASHBOARD QUẢN LÝ DỮ LIỆU & HỒ SƠ ĐỘC GIẢ
          ========================================================================= */}
      {isAuthenticated && currentUser && (
        <div className="space-y-8">
          {/* USER HERO PROFILE CARD */}
          <div className="bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 relative z-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl ${currentAvatarMeta.bg} text-white flex items-center justify-center text-4xl sm:text-5xl shadow-xl ring-4 ring-white/10 shrink-0`}
                >
                  <span>{currentAvatarMeta.icon}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <h1 className="font-serif text-2xl sm:text-3xl font-extrabold text-white">
                      {currentUser.name}
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-xs font-bold text-indigo-300 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-300" />
                      <span>Độc Giả Thân Thiết</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{currentUser.email}</p>
                  {currentUser.bio && (
                    <p className="text-xs sm:text-sm text-slate-300 italic max-w-xl pt-1">
                      "{currentUser.bio}"
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 pt-1">
                    Tham gia từ ngày: {new Date(currentUser.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Về Trang Chủ
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>

            {/* 4 Chỉ Số Dữ Liệu Cá Nhân */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-white/10 text-center relative z-10">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400 block">Sách Đã Yêu Thích</span>
                <span className="text-2xl font-extrabold text-pink-400 tabular-nums">
                  {currentUser.favorites.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400 block">Lịch Sử Đã Xem</span>
                <span className="text-2xl font-extrabold text-indigo-300 tabular-nums">
                  {currentUser.history?.length || 0}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400 block">Sách Đã Đánh Giá Sao</span>
                <span className="text-2xl font-extrabold text-amber-400 tabular-nums">
                  {ratingsList.length}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-xs text-slate-400 block">Trích Dẫn &amp; Ghi Chú</span>
                <span className="text-2xl font-extrabold text-emerald-400 tabular-nums">
                  {notesList.length}
                </span>
              </div>
            </div>
          </div>

          {/* DASHBOARD TABS BAR */}
          <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs">
            <div className="flex border-b border-slate-100 overflow-x-auto text-xs sm:text-sm font-semibold no-scrollbar">
              <button
                type="button"
                onClick={() => setDashboardTab('overview')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  dashboardTab === 'overview'
                    ? 'border-indigo-600 text-indigo-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bookmark className="w-4 h-4 text-pink-500" />
                <span>Sách Yêu Thích ({currentUser.favorites.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab('history')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  dashboardTab === 'history'
                    ? 'border-indigo-600 text-indigo-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-4 h-4 text-indigo-600" />
                <span>Lịch Sử Đọc Sách ({currentUser.history?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab('notes')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  dashboardTab === 'notes'
                    ? 'border-indigo-600 text-indigo-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Ghi Chú &amp; Đánh Giá ({notesList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab('settings')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  dashboardTab === 'settings'
                    ? 'border-indigo-600 text-indigo-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Settings className="w-4 h-4 text-slate-600" />
                <span>Hồ Sơ &amp; Avatar</span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab('security')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  dashboardTab === 'security'
                    ? 'border-indigo-600 text-indigo-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Đổi Mật Khẩu</span>
              </button>

              <button
                type="button"
                onClick={() => setDashboardTab('backup')}
                className={`py-3 px-4 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  dashboardTab === 'backup'
                    ? 'border-indigo-600 text-indigo-700 font-bold'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Download className="w-4 h-4 text-blue-600" />
                <span>Xuất Dữ Liệu JSON</span>
              </button>
            </div>

            {/* TAB CONTENTS */}
            <div className="p-4 sm:p-6">
              {/* Alert status message */}
              {statusMsg && (
                <div
                  className={`flex items-start gap-2.5 p-3.5 rounded-xl text-xs mb-5 animate-fade-in ${
                    statusMsg.type === 'error'
                      ? 'bg-rose-50 border border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  }`}
                >
                  {statusMsg.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <span>{statusMsg.text}</span>
                </div>
              )}

              {/* 1. SÁCH YÊU THÍCH */}
              {dashboardTab === 'overview' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-lg font-bold text-slate-900">
                      Tủ Sách Yêu Thích Của Bạn ({currentUser.favorites.length})
                    </h2>
                  </div>

                  {currentUser.favorites.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {currentUser.favorites.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => onSelectBookById(b.id)}
                          className="p-3.5 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200 hover:border-indigo-500 transition-all cursor-pointer flex gap-3.5 items-center group shadow-2xs"
                        >
                          <div className="w-14 h-20 rounded-lg overflow-hidden bg-slate-200 shrink-0 shadow-xs flex items-center justify-center">
                            {b.coverUrl ? (
                              <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold p-1 text-center">{b.title.slice(0, 15)}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                              {b.genre}
                            </span>
                            <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                              {b.title}
                            </h3>
                            <p className="text-xs text-slate-500 truncate">{b.author}</p>
                            <span className="text-[11px] text-pink-600 font-semibold mt-1 inline-block">
                              ♥ Đã lưu trong tài khoản
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <Bookmark className="w-10 h-10 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-700 text-sm">Chưa có cuốn sách nào trong danh sách yêu thích.</p>
                      <p className="text-xs text-slate-400">
                        Bấm vào biểu tượng bookmark hoặc nút "Lưu vào yêu thích" ở bất kỳ cuốn sách nào để lưu trữ tại đây!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. LỊCH SỬ ĐỌC SÁCH */}
              {dashboardTab === 'history' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-serif text-lg font-bold text-slate-900">
                      Lịch Sử Đã Xem ({currentUser.history?.length || 0})
                    </h2>
                    {currentUser.history && currentUser.history.length > 0 && (
                      <button
                        type="button"
                        onClick={clearHistory}
                        className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa toàn bộ lịch sử</span>
                      </button>
                    )}
                  </div>

                  {currentUser.history && currentUser.history.length > 0 ? (
                    <div className="space-y-2.5">
                      {currentUser.history.map((h, idx) => (
                        <div
                          key={`${h.bookId}-${idx}`}
                          className="p-3.5 bg-slate-50 hover:bg-white rounded-xl border border-slate-200 hover:border-indigo-500 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div className="min-w-0">
                              <h3
                                onClick={() => onSelectBookById(h.bookId)}
                                className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 cursor-pointer transition-colors"
                              >
                                {h.bookTitle}
                              </h3>
                              <p className="text-xs text-slate-500 truncate">
                                {h.bookAuthor} · <span className="text-indigo-600">{h.genre}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[11px] text-slate-400 block">
                              {new Date(h.viewedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}{' '}
                              {new Date(h.viewedAt).toLocaleDateString('vi-VN')}
                            </span>
                            <button
                              type="button"
                              onClick={() => onSelectBookById(h.bookId)}
                              className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                            >
                              Xem lại →
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                      <History className="w-10 h-10 text-slate-400 mx-auto" />
                      <p className="font-bold text-slate-700 text-sm">Chưa có lịch sử đọc sách.</p>
                      <p className="text-xs text-slate-400">Khi bạn mở xem chi tiết các cuốn sách, hệ thống sẽ tự động lưu lại tại đây!</p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. GHI CHÚ & ĐÁNH GIÁ CÁ NHÂN */}
              {dashboardTab === 'notes' && (
                <div className="space-y-6">
                  {ratingsList.length > 0 && (
                    <div className="space-y-3">
                      <h2 className="font-serif text-base font-bold text-slate-900">
                        Đánh Giá Sao Của Bạn ({ratingsList.length})
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ratingsList.map(([bId, score]) => {
                          const bObj = allBooks.find((b) => b.id === bId);
                          const title = bObj?.title || bId;
                          return (
                            <div
                              key={`rate-${bId}`}
                              className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                            >
                              <span className="text-xs font-bold text-slate-800 truncate mr-2">{title}</span>
                              <div className="flex items-center gap-1 shrink-0 text-amber-500 font-bold text-xs">
                                <span>{score}</span>
                                <Star className="w-3.5 h-3.5 fill-current" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h2 className="font-serif text-base font-bold text-slate-900">
                      Trích Dẫn &amp; Ghi Chú Cá Nhân ({notesList.length})
                    </h2>

                    {notesList.length > 0 ? (
                      <div className="space-y-3">
                        {notesList.map((note) => (
                          <div
                            key={note.bookId}
                            className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <h3
                                onClick={() => onSelectBookById(note.bookId)}
                                className="font-bold text-xs sm:text-sm text-indigo-950 hover:underline cursor-pointer flex items-center gap-1.5"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{note.bookTitle}</span>
                              </h3>
                              <button
                                type="button"
                                onClick={() => deleteBookNote(note.bookId)}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                                title="Xóa ghi chú này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-indigo-400">
                              {note.content}
                            </p>
                            <span className="text-[10px] text-slate-400 block text-right">
                              Cập nhật: {new Date(note.updatedAt).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                        <FileText className="w-10 h-10 text-slate-400 mx-auto" />
                        <p className="font-bold text-slate-700 text-sm">Chưa có ghi chú nào được lưu.</p>
                        <p className="text-xs text-slate-400">
                          Mở bất kỳ cuốn sách nào để viết lại trích dẫn hoặc bài học tâm đắc của bạn!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. CHỈNH SỬA HỒ SƠ & AVATAR */}
              {dashboardTab === 'settings' && (
                <form onSubmit={handleSaveProfile} className="max-w-xl space-y-5">
                  <h2 className="font-serif text-lg font-bold text-slate-900">
                    Cập Nhật Thông Tin Cá Nhân
                  </h2>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Chọn Avatar Đại Diện
                    </label>
                    <div className="grid grid-cols-6 gap-2.5">
                      {AVATAR_OPTIONS.map((av) => {
                        const isChosen = editAvatar === av.id;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setEditAvatar(av.id)}
                            className={`aspect-square rounded-2xl ${av.bg} text-white flex items-center justify-center text-2xl transition-all cursor-pointer relative ${
                              isChosen ? 'ring-3 ring-indigo-600 ring-offset-2 scale-105 shadow-md' : 'opacity-70 hover:opacity-100'
                            }`}
                            title={av.label}
                          >
                            <span>{av.icon}</span>
                            {isChosen && (
                              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold border-2 border-white">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Giới thiệu bản thân (Bio)
                    </label>
                    <textarea
                      rows={3}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Chia sẻ về đam mê sách hoặc mục tiêu phát triển của bạn..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Lưu Cập Nhật Hồ Sơ</span>
                  </button>
                </form>
              )}

              {/* 5. ĐỔI MẬT KHẨU */}
              {dashboardTab === 'security' && (
                <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
                  <h2 className="font-serif text-lg font-bold text-slate-900">
                    Bảo Mật &amp; Đổi Mật Khẩu
                  </h2>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      type="password"
                      required
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Mật khẩu mới (≥ 6 ký tự)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Cập Nhật Mật Khẩu Mới</span>
                  </button>
                </form>
              )}

              {/* 6. XUẤT DỮ LIỆU & SAO LƯU */}
              {dashboardTab === 'backup' && (
                <div className="max-w-2xl space-y-5">
                  <h2 className="font-serif text-lg font-bold text-slate-900">
                    Quyền Sở Hữu Dữ Liệu Cá Nhân
                  </h2>

                  <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2 text-xs sm:text-sm text-indigo-950 leading-relaxed">
                    <p className="font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Cam kết minh bạch và độc lập dữ liệu:</span>
                    </p>
                    <p>
                      Mọi thông tin gồm: <strong>{currentUser.favorites.length} cuốn sách yêu thích</strong>, <strong>{currentUser.history?.length || 0} mục lịch sử đọc</strong>, <strong>{notesList.length} ghi chú trích dẫn</strong> và <strong>{ratingsList.length} điểm đánh giá sao</strong> đều được lưu trên thiết bị của bạn.
                    </p>
                    <p>Bạn có thể xuất toàn bộ ra định dạng file JSON tiêu chuẩn bất cứ lúc nào để lưu trữ hoặc nạp sang máy tính khác.</p>
                  </div>

                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">Xuất File Sao Lưu Dữ Liệu JSON</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Tải file `.json` chứa 100% tài khoản và dữ liệu đọc sách của bạn.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportData}
                      className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer shrink-0"
                    >
                      <Download className="w-4 h-4 text-indigo-300" />
                      <span>Tải Bản Sao Lưu JSON</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
