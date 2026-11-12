import React, { useState, useMemo, useEffect } from 'react';
import { Book, FilterState, BookCategory, QuickFilterTag } from '../types/book';
import { filterAndSortBooks } from '../utils/bookRecommender';
import { BookRowGrid } from '../components/BookRowGrid';
import { Search, RotateCcw, ChevronLeft, ChevronRight, Library, Tag, X, SlidersHorizontal, BookX } from 'lucide-react';

interface LibraryViewProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  activeTagFilter?: QuickFilterTag | null;
  onFilterByAttribute?: (type: 'author' | 'publisher' | 'year', value: string | number) => void;
  onClearTagFilter?: () => void;
}

const ITEMS_PER_PAGE = 8;

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onSelectBook,
  activeTagFilter = null,
  onFilterByAttribute,
  onClearTagFilter,
}) => {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    genre: 'all',
    category: 'all',
    length: 'all',
    sortBy: 'featured',
    tagFilter: activeTagFilter,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      tagFilter: activeTagFilter,
    }));
    setCurrentPage(1);
  }, [activeTagFilter]);

  const { uniqueGenres, genreCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    const genres: string[] = [];
    books.forEach((b) => {
      const g = b.genre || 'Khác';
      if (!counts[g]) {
        genres.push(g);
        counts[g] = 0;
      }
      counts[g] += 1;
    });
    return { uniqueGenres: genres, genreCounts: counts };
  }, [books]);

  const filteredBooks = useMemo(() => {
    return filterAndSortBooks(books, filters);
  }, [books, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / ITEMS_PER_PAGE));
  const currentBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBooks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBooks, currentPage]);

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.genre !== 'all' ||
    filters.category !== 'all' ||
    filters.length !== 'all' ||
    filters.sortBy !== 'featured' ||
    Boolean(filters.tagFilter);

  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      genre: 'all',
      category: 'all',
      length: 'all',
      sortBy: 'featured',
      tagFilter: null,
    });
    if (onClearTagFilter) {
      onClearTagFilter();
    }
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const getPaginationPages = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-6">
      {/* 1. Header & Title Block */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200/60 text-indigo-700 text-xs font-semibold">
          <Library className="w-3.5 h-3.5 text-indigo-600" />
          <span>Kho tri thức chọn lọc</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Kho Sách Đa Ngành
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Khám phá toàn bộ sách Kinh doanh, Phát triển bản thân, Tâm lý học, Công nghệ AI và Triết lý sống.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-medium shrink-0">
            Hiển thị <span className="font-bold text-sm text-slate-900">{filteredBooks.length}</span> / {books.length} cuốn
          </div>
        </div>
      </div>

      {/* Tag Attribute Filter Banner */}
      {filters.tagFilter && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl shadow-xs animate-fade-in">
          <div className="flex items-center gap-2.5 text-sm text-slate-900">
            <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Tag className="w-4 h-4" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Đang lọc theo thuộc tính:</p>
              <p className="font-bold text-sm text-indigo-700">
                {filters.tagFilter.label}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetFilters}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[40px] rounded-xl bg-white border border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Xóa lọc</span>
          </button>
        </div>
      )}

      {/* 2. Sticky Modern Filter Bar */}
      <div className="sticky top-20 z-20 bg-white/95 backdrop-blur-md py-3.5 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-y border-slate-200 shadow-xs space-y-3">
        {/* Row 1: Search Box + Sort + Filter Toggle */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, searchQuery: e.target.value }));
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tựa sách, tác giả, nhà xuất bản..."
              className="w-full pl-10 pr-9 py-2 min-h-[44px] bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-600 transition-all"
            />
            {filters.searchQuery && (
              <button
                onClick={() => {
                  setFilters((prev) => ({ ...prev, searchQuery: '' }));
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className="flex items-center gap-1.5">
              <label htmlFor="filter-sort-select" className="sr-only">Sắp xếp theo</label>
              <select
                id="filter-sort-select"
                value={filters.sortBy}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 min-h-[44px] bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600/30 cursor-pointer shadow-2xs"
              >
                <option value="featured">Phổ biến &amp; Đánh giá cao</option>
                <option value="title">Tên sách (A → Z)</option>
                <option value="year">Năm xuất bản mới nhất</option>
                <option value="pages-asc">Số trang (Ngắn trước)</option>
                <option value="pages-desc">Số trang (Dài trước)</option>
              </select>
            </div>

            <button
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={`px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs ${
                showAdvancedFilters || filters.category !== 'all' || filters.length !== 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-200 hover:text-slate-950 hover:bg-slate-50'
              }`}
              title="Lọc thêm tiêu chí"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bộ lọc phụ</span>
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
                title="Đặt lại toàn bộ bộ lọc"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Genre Quick Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => {
              setFilters((prev) => ({ ...prev, genre: 'all' }));
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl min-h-[36px] font-medium transition-all shrink-0 cursor-pointer ${
              filters.genre === 'all'
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            Tất cả ({books.length})
          </button>
          {uniqueGenres.map((g) => {
            const isSelected = filters.genre === g;
            const count = genreCounts[g] || 0;
            return (
              <button
                key={g}
                onClick={() => {
                  setFilters((prev) => ({ ...prev, genre: isSelected ? 'all' : g }));
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl min-h-[36px] font-medium transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white font-bold shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {g} ({count})
              </button>
            );
          })}
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-fade-in">
            <div>
              <label htmlFor="adv-filter-cat" className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Phân vùng sách
              </label>
              <select
                id="adv-filter-cat"
                value={filters.category}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, category: e.target.value as BookCategory }));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              >
                <option value="all">Tất cả nguồn xuất bản</option>
                <option value="vietnam">Sách trong nước</option>
                <option value="world">Sách dịch quốc tế</option>
              </select>
            </div>

            <div>
              <label htmlFor="adv-filter-len" className="block font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Dung lượng sách
              </label>
              <select
                id="adv-filter-len"
                value={filters.length}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, length: e.target.value as any }));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              >
                <option value="all">Mọi độ dài</option>
                <option value="short">Dưới 200 trang (Đọc nhanh)</option>
                <option value="medium">200 - 400 trang (Tiêu chuẩn)</option>
                <option value="long">Trên 400 trang (Chuyên sâu)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Book Grid */}
      {currentBooks.length > 0 ? (
        <div className="pt-2">
          <BookRowGrid
            books={currentBooks}
            onSelectBook={onSelectBook}
            onFilterByAttribute={onFilterByAttribute}
          />
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 max-w-lg mx-auto space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <BookX className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-xl font-bold text-slate-900">
              Không tìm thấy tựa sách phù hợp
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Không có cuốn sách nào khớp với từ khóa hoặc bộ lọc đã chọn. Hãy thử tìm theo tên tác giả khác hoặc đặt lại bộ lọc.
            </p>
          </div>
          <button
            onClick={handleResetFilters}
            className="px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại tất cả bộ lọc</span>
          </button>
        </div>
      )}

      {/* 4. Pagination */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center gap-1.5 pt-8 border-t border-slate-200"
          aria-label="Phân trang danh sách sách"
        >
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-10 h-10 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
            aria-label="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            {getPaginationPages().map((pageItem, idx) => {
              if (pageItem === '...') {
                return (
                  <span key={`dots-${idx}`} className="w-8 text-center text-slate-400 text-xs font-medium">
                    ...
                  </span>
                );
              }
              const pageNum = pageItem as number;
              const isActive = currentPage === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs ${
                    isActive
                      ? 'bg-slate-900 text-white font-bold shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-10 h-10 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
            aria-label="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}
    </div>
  );
};
