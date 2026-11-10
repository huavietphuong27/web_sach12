import React from 'react';
import { Compass, Library, Sparkles, Globe, Heart, Info } from 'lucide-react';

interface FooterProps {
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="mt-20 border-t border-slate-200 bg-white text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand mission */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4.5 h-4.5 text-indigo-200" />
              </span>
              <span className="font-serif text-lg font-bold text-slate-900">
                BookMind <span className="text-indigo-600">AI</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500 max-w-md">
              Nền tảng trí tuệ nhân tạo phân tích bất kỳ tâm tư, mục tiêu hay khó khăn nào trong cuộc sống của bạn để gợi ý những cuốn sách giải pháp đắt giá nhất từ kho sách toàn cầu.
            </p>
            <div className="pt-2 text-xs text-slate-400">
              © 2026 BookMind AI. Kết nối tri thức và chuyển hóa tiềm năng con người.
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Tính năng nổi bật
            </h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('advisor')}
                  className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-2 py-1 text-left"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>AI Cố Vấn Sách Chuyên Sâu</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('goal')}
                  className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-2 py-1 text-left"
                >
                  <Compass className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Gợi Ý Theo Mục Tiêu Thực Tế</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('catalog')}
                  className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-2 py-1 text-left"
                >
                  <Library className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Kho Sách Đa Lĩnh Vực</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('explore')}
                  className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-2 py-1 text-left"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Tìm Trực Tuyến Google Books</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-indigo-600 transition-colors cursor-pointer flex items-center gap-2 py-1 text-left"
                >
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Về Nền Tảng BookMind AI</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Tech & Data Source */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Hạ Tầng Công Nghệ
            </h4>
            <p className="text-xs leading-relaxed text-slate-500">
              Vận hành trên nền tảng Gemini AI tiên tiến kết hợp bộ dữ liệu thời gian thực Google Books API.
            </p>
            <div className="pt-2 flex items-center gap-1.5 text-xs text-slate-400">
              <span>Được xây dựng với</span>
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span>và tinh thần học hỏi</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
