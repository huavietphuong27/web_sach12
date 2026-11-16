import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Compass,
  Library,
  Globe,
  Sparkles,
  Menu,
  X,
  Info,
  Bookmark,
  User,
  LogIn,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { AVATAR_OPTIONS } from '../services/authService';

interface NavbarProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenGoalFinder?: () => void;
  favoritesCount?: number;
  onOpenFavorites?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoute,
  onNavigate,
  favoritesCount = 0,
  onOpenFavorites,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, isAuthenticated, openAuthModal, openProfileModal } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const userAvatar = AVATAR_OPTIONS.find((a) => a.id === currentUser?.avatar) || AVATAR_OPTIONS[0];

  // Danh mục điều hướng nội dung chính (desktop & mobile)
  const navItems = [
    { id: 'home', label: 'Trang Chủ', icon: BookOpen },
    { id: 'advisor', label: 'AI Cố Vấn', icon: Sparkles, highlight: true },
    { id: 'goal', label: 'Theo Mục Tiêu', icon: Compass },
    { id: 'catalog', label: 'Kho Sách', icon: Library },
    { id: 'explore', label: 'Khám Phá', icon: Globe },
    { id: 'about', label: 'Giới Thiệu', icon: Info },
  ];

  const handleNavClick = (routeId: string) => {
    onNavigate(routeId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-border shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18 gap-3 lg:gap-4">
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 text-left group rounded-xl p-1 -ml-1 transition-all cursor-pointer shrink-0"
            aria-label="Về trang chủ BookMind AI"
          >
            <span className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-indigo-300" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-base md:text-lg font-bold tracking-tight text-ink whitespace-nowrap group-hover:text-accent transition-colors">
                  BookMind <span className="text-accent">AI</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent tracking-wide">
                  PRO
                </span>
              </div>
              <span className="text-[10.5px] text-ink-muted font-medium hidden xl:inline">
                Trợ lý gợi ý sách thông minh
              </span>
            </div>
          </button>

          {/* Navigation Links (Desktop) */}
          <nav
            className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs xl:text-sm font-medium text-ink-secondary"
            aria-label="Điều hướng chính"
          >
            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`relative px-2.5 xl:px-3 py-2 rounded-xl whitespace-nowrap shrink-0 transition-colors cursor-pointer font-medium flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-accent/10 text-accent font-semibold'
                      : 'hover:text-ink hover:bg-button-hover'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={`w-3.5 h-3.5 xl:w-4 xl:h-4 ${
                      isActive ? 'text-accent' : 'text-ink-muted'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.highlight && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* CTA & Actions (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 xl:gap-2 shrink-0">
            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="h-9 w-9 xl:h-10 xl:w-10 inline-flex items-center justify-center rounded-xl border border-border-strong bg-surface hover:bg-button-hover text-ink transition-colors cursor-pointer shrink-0"
              aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-ink-secondary" />}
            </button>

            {/* Bookmark button */}
            {onOpenFavorites && (
              <button
                type="button"
                onClick={onOpenFavorites}
                className="h-9 xl:h-10 px-2.5 xl:px-3 rounded-xl border border-border-strong bg-surface hover:bg-button-hover text-ink text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                aria-label="Xem sách yêu thích"
                title="Danh sách sách yêu thích"
              >
                <Bookmark className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />
                <span className="hidden xl:inline">Yêu thích</span>
                {favoritesCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold text-[10px] tabular-nums">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}

            {/* User Profile Pill or Login Button */}
            {isAuthenticated && currentUser ? (
              <button
                type="button"
                onClick={openProfileModal}
                className="h-9 xl:h-10 px-2.5 xl:px-3 rounded-xl border border-border-strong bg-surface hover:bg-button-hover text-ink text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer group shrink-0"
                title="Quản lý hồ sơ, lịch sử & dữ liệu cá nhân"
              >
                <span
                  className={`w-6 h-6 rounded-lg ${userAvatar.bg} text-white flex items-center justify-center text-xs shrink-0`}
                >
                  {userAvatar.icon}
                </span>
                <span className="font-semibold text-ink group-hover:text-accent truncate max-w-[90px] xl:max-w-[120px]">
                  {currentUser.name}
                </span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="h-9 xl:h-10 px-3 xl:px-3.5 rounded-xl border border-border-strong bg-surface hover:bg-button-hover text-ink text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Đăng Nhập</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="h-9 xl:h-10 px-3 rounded-xl bg-surface-subtle hover:bg-button-hover text-ink border border-border text-xs font-semibold transition-colors cursor-pointer hidden 2xl:inline-flex items-center shrink-0"
                >
                  Đăng Ký
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu buttons */}
          <div className="lg:hidden flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleTheme}
              className="h-9 w-9 flex items-center justify-center rounded-xl border border-border-strong bg-surface hover:bg-button-hover text-ink transition-colors cursor-pointer"
              aria-label={isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-ink-secondary" />}
            </button>

            {isAuthenticated && currentUser ? (
              <button
                type="button"
                onClick={openProfileModal}
                className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm cursor-pointer"
                title="Hồ sơ cá nhân"
              >
                {userAvatar.icon}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="h-9 px-2.5 rounded-xl border border-border bg-surface text-ink text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng nhập</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-ink rounded-xl hover:bg-button-hover transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Đóng bảng điều hướng' : 'Mở bảng điều hướng'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-border space-y-1 animate-fade-in">
            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-accent/10 text-accent font-bold'
                      : 'text-ink-secondary hover:bg-button-hover hover:text-ink'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-ink-muted'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Mobile Auth View Link */}
            <button
              type="button"
              onClick={() => handleNavClick('auth')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left font-medium transition-colors cursor-pointer ${
                currentRoute === 'auth'
                  ? 'bg-accent/10 text-accent font-bold'
                  : 'text-ink-secondary hover:bg-button-hover hover:text-ink'
              }`}
            >
              <User className="w-4 h-4 text-ink-muted" />
              <span>{isAuthenticated ? 'Tài Khoản & Dữ Liệu' : 'Trang Quản Lý Độc Giả'}</span>
            </button>

            {onOpenFavorites && (
              <button
                type="button"
                onClick={() => {
                  onOpenFavorites();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-4 h-4 fill-pink-600 text-pink-600" />
                  <span>Sách Yêu Thích</span>
                </div>
                {favoritesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300 font-bold text-xs">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-ink-secondary hover:bg-button-hover hover:text-ink transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {isDark ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-ink-secondary" />
                )}
                <span>{isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}</span>
              </div>
              <span className="text-xs font-semibold text-accent">
                {isDark ? 'Tối' : 'Sáng'}
              </span>
            </button>

            <div className="pt-2 border-t border-border px-3">
              {isAuthenticated && currentUser ? (
                <button
                  type="button"
                  onClick={() => {
                    openProfileModal();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-accent/10 text-accent font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{userAvatar.icon}</span>
                  <span>Quản lý hồ sơ: {currentUser.name}</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      openAuthModal('login');
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white font-semibold text-xs text-center cursor-pointer"
                  >
                    Đăng Nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openAuthModal('register');
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 py-2 rounded-xl bg-surface-subtle border border-border text-ink font-semibold text-xs text-center cursor-pointer"
                  >
                    Đăng Ký
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
