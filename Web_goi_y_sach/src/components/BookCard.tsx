import React, { useState } from 'react';
import { Book } from '../types/book';
import { formatReadingTime } from '../utils/bookRecommender';
import { ArrowUpRight, BookOpen } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onSelect: (book: Book) => void;
  onFilterByAttribute?: (type: 'author' | 'publisher' | 'year', value: string | number) => void;
  matchReasons?: string[];
  compact?: boolean;
  isRevealed?: boolean;
  revealDelay?: number;
  onRevealComplete?: () => void;
}

export const BookCardComponent: React.FC<BookCardProps> = ({
  book,
  onSelect,
  onFilterByAttribute,
  matchReasons,
  compact = false,
  isRevealed = true,
  revealDelay = 0,
  onRevealComplete,
}) => {
  const [revealDone, setRevealDone] = useState(false);
  const [isWillChangeActive, setIsWillChangeActive] = useState(false);
  const [imgError, setImgError] = useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [book.id, book.coverUrl]);

  // When reveal begins or delay starts, enable will-change
  React.useEffect(() => {
    if (isRevealed && !revealDone) {
      setIsWillChangeActive(true);
    }
  }, [isRevealed, revealDone]);

  const handleRevealTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    // Only respond to transitions on the reveal container itself (not children)
    if (e.target === e.currentTarget) {
      setIsWillChangeActive(false);
      setRevealDone(true);
      if (onRevealComplete) {
        onRevealComplete();
      }
    }
  };

  const handleAttributeClick = (
    e: React.MouseEvent,
    type: 'author' | 'publisher' | 'year',
    value: string | number
  ) => {
    e.stopPropagation();
    if (onFilterByAttribute) {
      onFilterByAttribute(type, value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(book);
    }
  };

  return (
    <div className="book-scene w-full">
      <div
        className={`book-reveal w-full ${isRevealed ? 'is-revealed' : ''} ${
          revealDone ? 'reveal-done' : ''
        }`}
        style={{
          transitionDelay: isRevealed ? `${revealDelay}ms` : '0ms',
          willChange: isWillChangeActive ? 'transform, opacity' : 'auto',
        }}
        onTransitionEnd={handleRevealTransitionEnd}
      >
        <article
          onClick={() => onSelect(book)}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label={`Xem chi tiết tác phẩm ${book.title} của ${book.author}`}
          className={`book-card-item cursor-pointer select-none group focus-visible:outline-2 focus-visible:outline-[#4F46E5] focus-visible:outline-offset-2 ${
            compact ? 'p-3 gap-3' : 'p-4 gap-4'
          }`}
        >
          {/* 3D Stage for the book opening */}
          <div className="book-3d-stage">
            <div className="book-volume">
              {/* Three paper layers behind cover (aria-hidden) */}
              <div className="book-pages" aria-hidden="true">
                <div className="book-page page-1" />
                <div className="book-page page-2" />
                <div className="book-page page-3" />
              </div>

              {/* Book Cover with spine on left edge (transform-origin: left center) */}
              <div
                className="book-cover relative flex flex-col justify-between p-3.5 sm:p-4 text-left shadow-xs overflow-hidden"
                style={{
                  backgroundColor: book.coverPalette.bg,
                  borderLeft: book.coverUrl && !imgError ? undefined : `10px solid ${book.coverPalette.spine}`,
                }}
              >
                {book.coverUrl && !imgError ? (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-900/5">
                    {/* Lớp nền mờ nghệ thuật chống khoảng trống thô */}
                    <img
                      src={book.coverUrl}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover blur-md opacity-30 scale-110 pointer-events-none"
                    />
                    {/* Bìa sách hiển thị trọn vẹn 100%, sắc nét và không bị cắt xén */}
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      loading="lazy"
                      className="relative max-w-full max-h-full object-contain z-10 drop-shadow-xs"
                      onError={() => setImgError(true)}
                    />
                  </div>
                ) : (
                  <>
                    {/* Publisher & Year on Cover */}
                <div
                  className="flex items-center justify-between text-xs font-sans tracking-wider uppercase opacity-85 z-10"
                  style={{ color: book.coverPalette.text }}
                >
                  <button
                    type="button"
                    onClick={(e) => handleAttributeClick(e, 'publisher', book.publisher)}
                    className="hover:underline hover:opacity-100 cursor-pointer transition-colors text-left max-w-[65%] truncate min-h-[44px] flex items-center"
                    title={`Xem các sách của ${book.publisher}`}
                  >
                    {book.publisher}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleAttributeClick(e, 'year', book.publishYear)}
                    className="hover:underline hover:opacity-100 cursor-pointer transition-colors ml-1 tabular-nums min-h-[44px] flex items-center"
                    title={`Xem các sách phát hành năm ${book.publishYear}`}
                  >
                    {book.publishYear}
                  </button>
                </div>

                {/* Center Title & Author on Cover */}
                <div className="my-auto text-center px-1">
                  <h4
                    className="font-serif font-bold text-base leading-snug line-clamp-3 mb-1.5"
                    style={{ color: book.coverPalette.text }}
                  >
                    {book.title}
                  </h4>
                  <div
                    className="w-8 h-0.5 mx-auto my-2 rounded-full opacity-60"
                    style={{ backgroundColor: book.coverPalette.accent }}
                  />
                  <button
                    type="button"
                    onClick={(e) => handleAttributeClick(e, 'author', book.author)}
                    className="text-xs font-sans font-medium opacity-90 hover:opacity-100 hover:underline cursor-pointer transition-colors z-10 min-h-[44px] inline-flex items-center"
                    style={{ color: book.coverPalette.text }}
                    title={`Xem các tác phẩm của ${book.author}`}
                  >
                    {book.author}
                  </button>
                  {book.translator && (
                    <p
                      className="text-[11px] font-sans opacity-70 mt-0.5"
                      style={{ color: book.coverPalette.text }}
                    >
                      dịch: {book.translator}
                    </p>
                  )}
                </div>

                    {/* Bottom genre mark */}
                    <div
                      className="text-xs font-sans text-center opacity-70 border-t border-black/10 pt-2"
                      style={{ color: book.coverPalette.text }}
                    >
                      {book.genre}
                    </div>
                  </>
                )}

                {/* Quick open indicator icon */}
                <div
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/90 text-[#4F46E5] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 pointer-events-none shadow-sm"
                  aria-hidden="true"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>

              {/* Separate elliptical shadow at bottom */}
              <div className="book-shadow" aria-hidden="true" />
            </div>
          </div>

          {/* Book Information below 3D volume */}
          <div className="flex flex-col flex-1 justify-between pt-1">
            <div>
              <h3 className="font-sans text-base font-bold text-[#0F172A] group-hover:text-[#4F46E5] transition-colors line-clamp-2 leading-snug">
                {book.title}
              </h3>
              <div>
                <button
                  type="button"
                  onClick={(e) => handleAttributeClick(e, 'author', book.author)}
                  className="text-left text-sm text-[#64748B] hover:text-[#4F46E5] hover:underline transition-colors font-medium cursor-pointer min-h-[44px] inline-flex items-center"
                  title={`Xem các tác phẩm của ${book.author}`}
                >
                  {book.author}
                </button>
              </div>

              {/* Unboxed Metadata with dot separator */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#64748B] mt-1">
                <span>{book.genre}</span>
                <span aria-hidden="true" className="text-[#E2E8F0]">·</span>
                <span>{formatReadingTime(book.pages)}</span>
              </div>

              {/* Match Reason if goal recommendation */}
              {matchReasons && matchReasons.length > 0 && (
                <div className="mt-2 text-xs text-[#4F46E5] flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
                  <span>{matchReasons[0]}</span>
                </div>
              )}

              {/* Curator Note or Description excerpt */}
              {!compact && (
                <p className="text-xs text-[#64748B] line-clamp-2 mt-2 leading-relaxed">
                  {book.curatorNote || book.description}
                </p>
              )}
            </div>

            {/* View Details Action Link with 44px min-height */}
            <div className="mt-3 pt-2.5 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#4F46E5]">
              <span className="flex items-center gap-1.5 font-medium min-h-[44px] group-hover:underline">
                <BookOpen className="w-4 h-4 text-[#4F46E5]" />
                <span>Xem chi tiết</span>
              </span>
              <button
                type="button"
                onClick={(e) => handleAttributeClick(e, 'year', book.publishYear)}
                className="text-[#64748B] hover:text-[#4F46E5] hover:underline cursor-pointer tabular-nums min-h-[44px] flex items-center px-1"
                title={`Xem các tác phẩm xuất bản năm ${book.publishYear}`}
              >
                {book.publishYear}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export const BookCard = React.memo(BookCardComponent);
