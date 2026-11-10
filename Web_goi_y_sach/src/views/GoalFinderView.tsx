import React, { useState, useEffect } from 'react';
import { Book, ReadingGoal, BookStyle } from '../types/book';
import { READING_GOALS } from '../data/content';
import { recommendByGoal, ScoredBook } from '../utils/bookRecommender';
import { BookRowGrid } from '../components/BookRowGrid';
import { Sparkles, RotateCcw, Target } from 'lucide-react';

interface GoalFinderViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  initialGoal?: ReadingGoal | null;
  initialQuery?: string;
  onFilterByAttribute?: (type: 'author' | 'publisher' | 'year', value: string | number) => void;
}

export const GoalFinderView: React.FC<GoalFinderViewProps> = ({
  books,
  onSelectBook,
  initialGoal = null,
  initialQuery = '',
  onFilterByAttribute,
}) => {
  const [goalQuery, setGoalQuery] = useState(initialQuery || (initialGoal?.examplePrompt ?? ''));
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoal?.id || '');
  const [preferredLength, setPreferredLength] = useState<'all' | 'short' | 'medium' | 'long'>('all');
  const [selectedStyle, setSelectedStyle] = useState<BookStyle | 'all'>('all');

  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ScoredBook[]>([]);

  const runRecommendation = (
    query: string,
    goalId: string,
    length: 'all' | 'short' | 'medium' | 'long',
    style: BookStyle | 'all'
  ) => {
    setIsLoading(true);

    setTimeout(() => {
      const scored = recommendByGoal(books, {
        query,
        goalId: goalId || undefined,
        preferredLength: length,
        style,
      });
      setResults(scored);
      setIsLoading(false);
    }, 200);
  };

  useEffect(() => {
    if (initialGoal || initialQuery) {
      runRecommendation(
        initialQuery || (initialGoal?.examplePrompt ?? ''),
        initialGoal?.id || '',
        preferredLength,
        selectedStyle
      );
    } else {
      runRecommendation('', '', 'all', 'all');
    }
  }, [initialGoal, initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runRecommendation(goalQuery, selectedGoalId, preferredLength, selectedStyle);
  };

  const handleReset = () => {
    setGoalQuery('');
    setSelectedGoalId('');
    setPreferredLength('all');
    setSelectedStyle('all');
    runRecommendation('', '', 'all', 'all');
  };

  const handleSelectGoalPill = (goal: ReadingGoal) => {
    const isSame = selectedGoalId === goal.id;
    const newGoalId = isSame ? '' : goal.id;
    setSelectedGoalId(newGoalId);
    if (!goalQuery || isSame) {
      setGoalQuery(isSame ? '' : goal.examplePrompt);
    }
    runRecommendation(isSame ? '' : goal.examplePrompt, newGoalId, preferredLength, selectedStyle);
  };

  const resultBooks = results.map((r) => r.book);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-12">
      {/* 1. Header & Title */}
      <div className="max-w-3xl space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold">
          <Target className="w-4 h-4 text-indigo-600" />
          <span>Gợi ý theo mục tiêu thực tế</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Tìm cuốn sách giải quyết đúng vấn đề của bạn
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Hãy cho AI biết mong muốn cụ thể — học kỹ năng mới, giải quyết khó khăn trong sự nghiệp, nâng cao tư duy hay tìm sách thư giãn.
        </p>
      </div>

      {/* 2. Goal Input & Filter Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="goal-query-input"
              className="block font-serif text-base font-bold text-slate-900 mb-2"
            >
              Mục tiêu hoặc hoàn cảnh cụ thể của bạn
            </label>
            <div className="relative">
              <input
                id="goal-query-input"
                type="text"
                value={goalQuery}
                onChange={(e) => setGoalQuery(e.target.value)}
                placeholder="Ví dụ: Tôi muốn học cách quản lý thời gian, rèn luyện tính kỷ luật, hay học đầu tư chứng khoán..."
                className="w-full px-4 py-3 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Bạn có thể nhập câu nói tự nhiên, từ khóa kỹ năng, tên tác giả hoặc mục tiêu đời thực.
            </p>
          </div>

          {/* Quick Goals selector */}
          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Chọn nhanh chủ đề bạn quan tâm
            </span>
            <div className="flex flex-wrap gap-2">
              {READING_GOALS.map((goal) => {
                const isActive = selectedGoalId === goal.id;
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => handleSelectGoalPill(goal)}
                    className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm font-semibold'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-500 hover:text-indigo-600'
                    }`}
                  >
                    {goal.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters row: Length & Depth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
            {/* Preferred Length */}
            <div>
              <label
                htmlFor="goal-length-filter"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
              >
                Dung lượng sách mong muốn
              </label>
              <select
                id="goal-length-filter"
                value={preferredLength}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setPreferredLength(val);
                  runRecommendation(goalQuery, selectedGoalId, val, selectedStyle);
                }}
                className="w-full px-3 py-2 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 cursor-pointer"
              >
                <option value="all">Mọi độ dài</option>
                <option value="short">Ngắn gọn (Dưới 200 trang - đọc nhanh)</option>
                <option value="medium">Vừa phải (200 - 400 trang - tiêu chuẩn)</option>
                <option value="long">Dày dặn (Trên 400 trang - chuyên sâu)</option>
              </select>
            </div>

            {/* Book Style / Depth */}
            <div>
              <label
                htmlFor="goal-style-filter"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1"
              >
                Phong cách tiếp cận
              </label>
              <select
                id="goal-style-filter"
                value={selectedStyle}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setSelectedStyle(val);
                  runRecommendation(goalQuery, selectedGoalId, preferredLength, val);
                }}
                className="w-full px-3 py-2 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 cursor-pointer"
              >
                <option value="all">Tất cả phong cách</option>
                <option value="realistic">Thực chiến, rõ ràng, áp dụng ngay</option>
                <option value="subtle">Nhẹ nhàng, thấu cảm, tinh tế</option>
                <option value="philosophical">Hàn lâm, triết luận, tư duy sâu</option>
                <option value="nostalgic">Truyền cảm hứng &amp; sâu lắng</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
            <div className="text-xs text-slate-500">
              Tìm thấy <span className="font-bold text-sm text-slate-900">{results.length}</span> cuốn sách phù hợp
            </div>
            <div className="flex items-center gap-2">
              {(goalQuery || selectedGoalId || preferredLength !== 'all' || selectedStyle !== 'all') && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Đặt lại</span>
                </button>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-300" />
                <span>Tìm sách ngay</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 3. Results Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
            Kết Quả Phù Hợp Nhất
          </h2>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-slate-500">
            <div className="inline-block w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-medium">AI đang đối soát dữ liệu và phân tích cuốn sách phù hợp...</p>
          </div>
        ) : resultBooks.length > 0 ? (
          <BookRowGrid
            books={resultBooks}
            onSelectBook={onSelectBook}
            onFilterByAttribute={onFilterByAttribute}
          />
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
            <p className="text-base font-serif font-bold text-slate-900">
              Không tìm thấy cuốn sách nào khớp hoàn toàn
            </p>
            <p className="text-xs text-slate-500">
              Hãy thử rút ngắn từ khóa hoặc chọn phong cách tiếp cận khác để xem nhiều gợi ý hơn.
            </p>
            <button
              onClick={handleReset}
              className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Xem toàn bộ danh sách
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
