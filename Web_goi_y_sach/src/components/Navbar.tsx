import React, { useState } from 'react';
import { BookOpen, Compass, Library, Globe, Sparkles, Menu, X, ArrowUpRight, Info, Bookmark } from 'lucide-react';

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
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-6 md:gap-8">
          {/* Brand Wordmark */}
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-3 text-left group rounded-xl p-1 -ml-1 transition-all cursor-pointer min-h-[44px]"
            aria-label="Về trang chủ BookMind AI"
          >
            <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-lg md:text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap group-hover:text-indigo-600 transition-colors">
                  BookMind <span className="text-indigo-600">AI</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-[10px] font-bold text-indigo-700 tracking-wide">
                  PRO
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Trợ lý gợi ý sách thông minh</span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 md:gap-8 text-sm font-medium text-slate-600" aria-label="Điều hướng chính">
            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`relative py-2.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer text-sm font-medium min-h-[44px] flex items-center gap-2 ${
                    isActive
                      ? 'text-indigo-600 font-semibold'
                      : 'hover:text-slate-950'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'}`} />
                  <span>{item.label}</span>
                  {item.highlight && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* CTA & Actions */}
          <div className="hidden sm:flex items-center gap-3">
            {onOpenFavorites && (
              <button
                type="button"
                onClick={onOpenFavorites}
                className="px-3.5 py-2 min-h-[40px] rounded-xl border border-slate-200 bg-white hover:border-pink-300 hover:bg-pink-50/50 text-slate-700 hover:text-pink-600 text-xs font-semibold shadow-2xs flex items-center gap-2 transition-all cursor-pointer"
                aria-label="Xem sách yêu thích"
              >
                <Bookmark className="w-4 h-4 text-pink-500 fill-pink-500" />
                <span>Yêu thích</span>
                {favoritesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-700 font-bold text-[10px]">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => handleNavClick('advisor')}
              className="px-4 py-2 min-h-[40px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer hover:shadow-md active:scale-98"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>Hỏi AI ngay</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-700 hover:text-slate-950 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label={mobileMenuOpen ? 'Đóng bảng điều hướng' : 'Mở bảng điều hướng'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 space-y-1 animate-fade-in">
            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 min-h-[44px] rounded-xl text-sm text-left font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {onOpenFavorites && (
              <button
                type="button"
                onClick={() => {
                  onOpenFavorites();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-3 min-h-[44px] rounded-xl text-sm font-medium text-pink-600 hover:bg-pink-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-5 h-5 fill-pink-600 text-pink-600" />
                  <span>Sách Yêu Thích</span>
                </div>
                {favoritesCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-bold text-xs">
                    {favoritesCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
