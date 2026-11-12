import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../types/book';
import { QuoteHighlighter } from './QuoteHighlighter';
import { Sparkles, RefreshCw, BookOpen, Quote, ArrowRight } from 'lucide-react';
import { formatReadingTime } from '../utils/bookRecommender';

interface BookSwitcherWidgetProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onFilterByAttribute?: (type: 'author' | 'publisher' | 'year', value: string | number) => void;
}

/** Chọn ngẫu nhiên một chỉ số (khác `exclude` nếu có thể). */
function randomIndex(n: number, exclude = -1): number {
  if (n <= 1) return 0;
  let i = Math.floor(Math.random() * n);
  if (i === exclude) i = (i + 1) % n;
  return i;
}

export const BookSwitcherWidget: React.FC<BookSwitcherWidgetProps> = ({
  books,
  onSelectBook,
  onFilterByAttribute,
}) => {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mỗi lần danh sách sách về (hoặc đổi): chọn NGẪU NHIÊN một cuốn.
  useEffect(() => {
    if (books.length > 0) setIndex(randomIndex(books.length));
  }, [books]);

  useEffect(() => {
    setImgError(false);
  }, [index, books]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  if (books.length === 0) return null;
  const book = books[index] || books[0];
  const showImage = Boolean(book.coverUrl && !imgError);

  const handleSwitchBook = () => {
    if (books.length < 2 || fading) return;
    setFading(true);
    timer.current = setTimeout(() => {
      setIndex((prev) => randomIndex(books.length, prev)); // ngẫu nhiên, khác cuốn đang hiện
      setFading(false);
    }, 200);
  };

  const handleAttributeClick = (
    e: React.MouseEvent,
    type: 'author' | 'publisher' | 'year',
    value: string | number
  ) => {
    e.stopPropagation();
    if (onFilterByAttribute) onFilterByAttribute(type, value);
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 md:p-10 shadow-xs relative overflow-hidden">
        {/* Header ribbon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </span>
            <div>
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider block">
                Gợi Ý Độc Bản Hôm Nay
              </span>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-slate-900">
                Lật Mở Một Trang Sách Mới
              </h2>
            </div>
          </div>

          {books.length >= 2 && (
            <button
              type="button"
              onClick={handleSwitchBook}
              disabled={fading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-98 disabled:opacity-50 text-white text-sm font-semibold transition-all cursor-pointer shrink-0 shadow-xs"
              aria-label="Gợi ý cuốn khác"
            >
              <RefreshCw className={`w-4 h-4 text-indigo-300 ${fading ? 'animate-spin' : ''}`} />
              <span>Gợi ý cuốn khác</span>
            </button>
          )}
        </div>

        {/* Body: 2 cột trên md+, xếp dọc trên mobile */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-center pt-8">
          {/* Ảnh bìa (bìa thật nếu có) */}
          <div
            className={`md:col-span-5 max-w-[260px] mx-auto w-full transition-opacity duration-200 ${
              fading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div
              onClick={() => onSelectBook(book)}
              className="aspect-[2/3] relative rounded-xl shadow-md border border-slate-200 overflow-hidden cursor-pointer group"
              style={{
                backgroundColor: book.coverPalette.bg,
                borderLeft: showImage ? undefined : `10px solid ${book.coverPalette.spine}`,
              }}
            >
              {showImage ? (
                <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-900/5">
                  <img
                    src={book.coverUrl}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-110 pointer-events-none"
                  />
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    loading="lazy"
                    className="relative max-w-full max-h-full object-contain p-0.5 z-10 drop-shadow-xs transition-transform duration-300 group-hover:scale-105"
                    onError={() => setImgError(true)}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col justify-between p-4">
                  <div
                    className="flex items-center justify-between text-xs font-sans tracking-wider uppercase opacity-85"
                    style={{ color: book.coverPalette.text }}
                  >
                    <span className="truncate max-w-[65%]">{book.publisher}</span>
                    <span className="tabular-nums">{book.publishYear}</span>
                  </div>
                  <div className="my-auto text-center px-1">
                    <h4
                      className="font-serif font-bold text-base leading-snug line-clamp-3 mb-1"
                      style={{ color: book.coverPalette.text }}
                    >
                      {book.title}
                    </h4>
                    <div
                      className="w-8 h-0.5 mx-auto my-2 rounded-full opacity-60"
                      style={{ backgroundColor: book.coverPalette.accent }}
                    />
                    <p
                      className="text-xs font-sans font-medium opacity-90 truncate"
                      style={{ color: book.coverPalette.text }}
                    >
                      {book.author}
                    </p>
                  </div>
                  <div
                    className="text-xs font-sans text-center opacity-70 border-t border-black/10 pt-2"
                    style={{ color: book.coverPalette.text }}
                  >
                    {book.genre}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin sách + trích dẫn */}
          <div
            className={`md:col-span-7 space-y-5 transition-opacity duration-200 ${
              fading ? 'opacity-0' : 'opacity-100'
            }`}
            aria-live="polite"
            aria-atomic="true"
          >
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
                <span>{book.genre}</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span>{formatReadingTime(book.pages)}</span>
              </div>

              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                {book.title}
              </h3>

              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="text-sm text-slate-500">Tác giả:</span>
                <button
                  type="button"
                  onClick={(e) => handleAttributeClick(e, 'author', book.author)}
                  className="text-sm font-semibold text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer min-h-[44px] inline-flex items-center"
                  title={`Xem các tác phẩm của ${book.author}`}
                >
                  {book.author}
                </button>
                {book.translator && (
                  <span className="text-xs text-slate-500">(dịch: {book.translator})</span>
                )}
              </div>
            </div>

            {book.quote && (
              <div className="p-4 sm:p-5 bg-slate-50 rounded-xl border border-slate-200 relative">
                <Quote className="w-5 h-5 text-indigo-400 absolute top-3.5 left-3.5" />
                <p className="font-serif italic text-base text-slate-800 pl-6 leading-relaxed">
                  “<QuoteHighlighter quoteIndex={0}>{book.quote}</QuoteHighlighter>”
                </p>
              </div>
            )}

            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
              {book.curatorNote || book.description}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onSelectBook(book)}
                className="inline-flex items-center gap-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <BookOpen className="w-4 h-4 text-indigo-300" />
                <span>Xem chi tiết tác phẩm</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleAttributeClick(e, 'publisher', book.publisher)}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-indigo-300 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title={`Xem các sách của nhà xuất bản ${book.publisher}`}
              >
                <span>NXB: {book.publisher}</span>
                <ArrowRight className="w-3.5 h-3.5 text-indigo-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
