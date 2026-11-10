import React, { useState, useEffect } from 'react';
import { Book, ReadingGoal } from '../types/book';
import { READING_GOALS } from '../data/content';
import { BookRowGrid } from '../components/BookRowGrid';
import { BookSwitcherWidget } from '../components/BookSwitcherWidget';
import { Sparkles, ArrowRight, Bookmark, ArrowUpRight, MessageSquare, Zap, Target, TrendingUp } from 'lucide-react';

interface HomeViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onNavigate: (route: string) => void;
  onSelectGoal: (goal: ReadingGoal) => void;
  onQuickSearch: (query: string) => void;
  onFilterByAttribute?: (type: 'author' | 'publisher' | 'year', value: string | number) => void;
}

const HERO_TITLE = 'Mô tả điều bạn muốn đọc, AI sẽ phân tích và gợi ý sách phù hợp';
const HERO_WORDS = HERO_TITLE.split(' ');

const SUGGESTED_PROMPTS = [
  'Tôi muốn rèn luyện tính kỷ luật và vượt qua sự trì hoãn',
  'Gợi ý sách học kinh doanh và đầu tư cho người mới bắt đầu',
  'Làm sao để cân bằng cảm xúc và giảm áp lực công việc?',
  'Tìm hiểu về Trí tuệ nhân tạo (AI) và cách mạng công nghệ',
  'Cách giao tiếp tinh tế và xây dựng mối quan hệ chân thành',
  'Sách tư duy phản biện và giải quyết vấn đề phức tạp',
];

export const HomeView: React.FC<HomeViewProps> = ({
  books,
  onSelectBook,
  onNavigate,
  onSelectGoal,
  onQuickSearch,
  onFilterByAttribute,
}) => {
  const [heroInput, setHeroInput] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isWordsRevealed, setIsWordsRevealed] = useState(false);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setIsWordsRevealed(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsWordsRevealed(true);
    }, 60);

    return () => clearTimeout(timer);
  }, []);

  const featuredBooks = [...books]
    .sort(
      (a, b) =>
        (b.rating || 0) - (a.rating || 0) || (b.ratingsCount || 0) - (a.ratingsCount || 0)
    )
    .slice(0, 4);

  const featuredIds = new Set(featuredBooks.map((b) => b.id));
  const remainingBooks = books.filter((b) => !featuredIds.has(b.id));
  const poolForDiscussed = remainingBooks.length >= 4 ? remainingBooks : books;
  const discussedBooks = [...poolForDiscussed]
    .sort((a, b) => (b.ratingsCount || 0) - (a.ratingsCount || 0) || b.publishYear - a.publishYear)
    .slice(0, 4);

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroInput.trim()) {
      onQuickSearch(heroInput.trim());
    } else {
      onNavigate('advisor');
    }
  };

  const handlePromptClick = (promptText: string) => {
    setHeroInput(promptText);
    onQuickSearch(promptText);
  };

  return (
    <div className="space-y-16 md:space-y-24 pb-16">
      {/* 1. Intelligent AI Hero Section */}
      <section className="relative pt-8 md:pt-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Badge */}
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/70 text-indigo-700 text-xs font-semibold transition-opacity duration-200 ${
              isSearchFocused ? 'opacity-50' : 'opacity-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Phân tích lời nói &amp; Tâm lý học đọc sách thông minh</span>
          </div>

          {/* Heading */}
          <h1 className="sr-only">{HERO_TITLE}</h1>
          <div
            aria-hidden="true"
            className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight text-balance"
          >
            {HERO_WORDS.map((word, idx) => (
              <span
                key={idx}
                className={`inline-block mr-[0.25em] transition-all duration-500 ease-out ${
                  isWordsRevealed
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-2'
                }`}
                style={{
                  transitionDelay: `${idx * 30}ms`,
                }}
              >
                {word === 'AI' ? <span className="text-indigo-600">AI</span> : word}
              </span>
            ))}
          </div>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Bạn đang ấp ủ dự định khởi nghiệp, căng thẳng vì áp lực, muốn nâng cao kỹ năng hay tìm kiếm lời khuyên? Hãy nhập câu nói bất kỳ — AI sẽ phân tích và gợi ý những cuốn sách phù hợp nhất.
          </p>

          {/* Intelligent AI Prompt Form */}
          <form
            onSubmit={handleHeroSubmit}
            className="max-w-2xl mx-auto relative flex flex-col sm:flex-row items-stretch gap-2.5 p-2 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-indigo-100/40 focus-within:ring-2 focus-within:ring-indigo-600/40 focus-within:border-indigo-600 transition-all duration-200"
          >
            <div className="flex-1 flex items-center gap-3 px-3">
              <MessageSquare className="w-5 h-5 text-indigo-500 shrink-0" />
              <label htmlFor="hero-prompt-input" className="sr-only">
                Nhập bất kỳ câu hỏi, tâm sự hay chủ đề bạn tìm kiếm
              </label>
              <input
                id="hero-prompt-input"
                type="text"
                value={heroInput}
                onChange={(e) => setHeroInput(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Ví dụ: Tôi muốn học đầu tư tài chính, Tôi đang mất ngủ vì stress..."
                className="w-full text-sm sm:text-base py-2 bg-transparent text-slate-900 placeholder:text-slate-400 outline-none min-h-[44px]"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 text-white text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <span>Phân tích &amp; Gợi ý</span>
            </button>
          </form>

          {/* Quick Clickable Real-Life Prompts */}
          <div className="pt-2 max-w-3xl mx-auto space-y-2">
            <span className="text-xs text-slate-500 font-medium">Hoặc chọn nhanh câu hỏi mẫu:</span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePromptClick(prompt)}
                  className="px-3.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 text-xs font-medium text-slate-600 transition-colors cursor-pointer shadow-2xs hover:shadow-xs inline-flex items-center gap-1.5"
                >
                  <Zap className="w-3 h-3 text-indigo-500" />
                  <span>{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Book Switcher Widget */}
      <BookSwitcherWidget
        books={books}
        onSelectBook={onSelectBook}
        onFilterByAttribute={onFilterByAttribute}
      />

      {/* 3. Reading Goals Section (Mục tiêu đa dạng: Kỹ năng, Kinh doanh, Tâm lý, AI...) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-slate-200 pt-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                <Target className="w-3.5 h-3.5" />
                <span>Mục Tiêu &amp; Lĩnh Vực Đọc Sách</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                Bạn muốn chuyển hóa khía cạnh nào trong cuộc sống?
              </h2>
            </div>
            <button
              onClick={() => onNavigate('goal')}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer group min-h-[44px]"
            >
              <span>Xem tất cả mục tiêu</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {READING_GOALS.map((goal) => (
              <div
                key={goal.id}
                onClick={() => onSelectGoal(goal)}
                className="p-6 bg-white rounded-2xl border border-slate-200 hover:border-indigo-500/80 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group shadow-xs"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Bookmark className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {goal.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                    {goal.description}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                  <span>Khám phá sách phù hợp</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Top Rated Books */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-slate-200 pt-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Tuyển Chọn Đắc Địa</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900">
                Sách được đánh giá cao nhất từ kho tri thức
              </h2>
            </div>
            <button
              onClick={() => onNavigate('catalog')}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer group min-h-[44px]"
            >
              <span>Xem toàn bộ {books.length} cuốn sách</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <BookRowGrid
            books={featuredBooks}
            onSelectBook={onSelectBook}
            onFilterByAttribute={onFilterByAttribute}
          />
        </div>
      </section>

      {/* 5. Trending / Most Discussed Books */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-t border-slate-200 pt-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                Tiêu Điểm Độc Giả
              </p>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                Những tác phẩm thu hút sự chú ý của độc giả
              </h2>
            </div>
            <button
              onClick={() => onNavigate('explore')}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer group min-h-[44px]"
            >
              <span>Tìm kiếm thêm trên Google Books</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          <BookRowGrid
            books={discussedBooks}
            onSelectBook={onSelectBook}
            onFilterByAttribute={onFilterByAttribute}
          />
        </div>
      </section>
    </div>
  );
};
