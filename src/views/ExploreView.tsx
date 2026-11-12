import React, { useState, useEffect, useCallback } from 'react';
import { Book } from '../types/book';
import { searchVietnameseBooks, fetchFeaturedVietnameseBooks } from '../services/googleBooks';
import { Search, Globe, Loader2, ExternalLink, RefreshCw, Zap } from 'lucide-react';

interface ExploreViewProps {
  onSelectBook: (book: Book) => void;
}

const POPULAR_TOPICS = [
  'Trí tuệ nhân tạo AI',
  'Quản lý tài chính cá nhân',
  'Khởi nghiệp kinh doanh',
  'Tâm lý học ứng dụng',
  'Tư duy phản biện',
  'Kỹ năng lãnh đạo',
  'Khoa học vũ trụ',
  'Kỷ luật tự giác',
];

export const ExploreView: React.FC<ExploreViewProps> = ({ onSelectBook }) => {
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const loadDefault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await fetchFeaturedVietnameseBooks(16);
      setBooks(results);
    } catch {
      setError('Không kết nối được tới Google Books. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefault();
  }, [loadDefault]);

  useEffect(() => {
    if (!query.trim()) {
      if (searched) {
        setSearched(false);
        loadDefault();
      }
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await searchVietnameseBooks(query.trim(), 20);
        setBooks(results);
        setSearched(true);
      } catch {
        setError('Không kết nối được tới Google Books. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, searched, loadDefault]);

  const handleClear = () => {
    setQuery('');
    setSearched(false);
    loadDefault();
  };

  const handleTopicClick = (topic: string) => {
    setQuery(topic);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="max-w-3xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold">
          <Globe className="w-4 h-4 text-indigo-600" />
          <span>Tìm kiếm trực tiếp · Google Books API</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Khám Phá Sách Trực Tuyến Toàn Cầu
        </h1>
        <p className="text-base text-slate-600 leading-relaxed">
          Truy vấn thời gian thực từ Google Books hàng triệu đầu sách mọi lĩnh vực: Kinh doanh, Khởi nghiệp, Kỹ năng, Công nghệ AI, Tâm lý học, Khoa học...
        </p>
      </div>

      {/* Search bar & Topic pills */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <label htmlFor="explore-search" className="sr-only">
          Tìm kiếm sách trên Google Books
        </label>
        <div className="relative group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
          <input
            id="explore-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm mọi chủ đề: trí tuệ nhân tạo, khởi nghiệp, tâm lý học, tài chính..."
            className="w-full pl-10 pr-4 py-2.5 min-h-[48px] bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all"
          />
        </div>

        {/* Quick Topic Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 mr-1">Chủ đề thịnh hành:</span>
          {POPULAR_TOPICS.map((topic, idx) => (
            <button
              key={idx}
              onClick={() => handleTopicClick(topic)}
              className="px-3 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-xs font-medium text-slate-600 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <Zap className="w-3 h-3 text-indigo-500" />
              <span>{topic}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-3 border-t border-slate-100">
          <span className="font-medium">
            {loading ? 'Đang tìm kiếm trên Google...' : `Hiển thị ${books.length} cuốn sách tìm được`}
          </span>
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[36px] rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 font-semibold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới danh sách</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span className="font-medium">Đang tìm sách trên Google Books...</span>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
          <p className="text-slate-600 text-sm">{error}</p>
          <button
            onClick={loadDefault}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer hover:bg-slate-800"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && books.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 max-w-md mx-auto">
          <p className="text-slate-600 text-sm">
            {searched
              ? 'Không tìm thấy sách nào khớp với từ khóa của bạn.'
              : 'Chưa có sách nào để hiển thị.'}
          </p>
        </div>
      )}

      {/* Results grid */}
      {!loading && !error && books.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {books.map((book) => (
            <div
              key={book.id}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-500/80 hover:shadow-md transition-all overflow-hidden flex flex-col shadow-xs"
            >
              {/* Cover */}
              <button
                onClick={() => onSelectBook(book)}
                className="relative aspect-[2/3] w-full bg-slate-100 cursor-pointer overflow-hidden"
                aria-label={`Xem chi tiết ${book.title}`}
              >
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-center p-4"
                  style={{
                    backgroundColor: book.coverPalette.bg,
                    borderLeft: `8px solid ${book.coverPalette.spine}`,
                  }}
                >
                  <span
                    className="font-serif font-bold text-sm leading-snug line-clamp-3"
                    style={{ color: book.coverPalette.text }}
                  >
                    {book.title}
                  </span>
                </div>
                {book.coverUrl && (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-900/5 z-10">
                    <img
                      src={book.coverUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-sm opacity-25 scale-110 pointer-events-none"
                    />
                    <img
                      src={book.coverUrl}
                      alt={`Bìa sách ${book.title}`}
                      loading="lazy"
                      className="relative max-w-full max-h-full object-contain p-1 z-10 drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </button>

              {/* Info */}
              <div className="p-3.5 sm:p-4 flex flex-col flex-1 gap-1">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                  {book.genre}
                </span>
                <button
                  onClick={() => onSelectBook(book)}
                  className="text-left font-serif font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug cursor-pointer"
                >
                  {book.title}
                </button>
                <p className="text-xs text-slate-500 line-clamp-1">{book.author}</p>
                <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-400 mt-auto pt-2">
                  {book.publishYear > 0 && <span>{book.publishYear}</span>}
                  {book.pages > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{book.pages} trang</span>
                    </>
                  )}
                </div>

                {book.infoLink && (
                  <a
                    href={book.infoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Xem trên Google Books
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
