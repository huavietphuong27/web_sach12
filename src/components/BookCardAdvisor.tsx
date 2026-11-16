import React from 'react';
import { Star, User } from 'lucide-react';
import { AdvisorBook, advisorBookToBook, createCoverPlaceholder } from '../services/googleBooks';
import { BookmarkButton } from './BookmarkButton';
import { useAuth } from '../context/AuthContext';

interface BookCardAdvisorProps {
  book: AdvisorBook;
  onOpen: (book: AdvisorBook) => void;
}

/** Thẻ sách 6 thành phần: bìa 2:3 · badge thể loại+sao · tiêu đề 2 dòng · tác giả · hộp matchReason · nút. */
export const BookCardAdvisor: React.FC<BookCardAdvisorProps> = ({ book, onOpen }) => {
  const { isFavorite, toggleFavorite } = useAuth();
  const saved = isFavorite(book.id);

  return (
    <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs flex flex-col h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-indigo-400/60 group">
      {/* 1. Ảnh bìa hiển thị trọn vẹn 100% không bị cắt góc */}
      <div
        onClick={() => onOpen(book)}
        className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900/5 flex items-center justify-center cursor-pointer group/card"
      >
        {/* Nền mờ đồng điệu phía sau */}
        <img
          src={book.coverImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-md opacity-25 scale-110 pointer-events-none"
        />
        {/* Bìa sách nguyên vẹn đầy đủ chi tiết */}
        <img
          src={book.coverImage}
          alt={book.title}
          loading="lazy"
          className="relative max-w-full max-h-full object-contain p-1 z-10 drop-shadow-xs transition-transform duration-300 group-hover/card:scale-[1.02]"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            const fallback = createCoverPlaceholder(book.title);
            if (target.src !== fallback) target.src = fallback;
          }}
        />
        {/* 2. Badge thể loại + đánh giá */}
        <span className="absolute top-2.5 left-2.5 z-20 inline-flex items-center gap-1 bg-slate-900/85 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-1 rounded-md shadow-xs max-w-[calc(100%-3.5rem)] truncate">
          <span className="truncate">{book.category}</span>
          <span aria-hidden="true">·</span>
          <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" aria-hidden="true" />
          <span className="tabular-nums">{book.rating ? book.rating.toFixed(1) : '—'}</span>
        </span>

        {/* Bookmark yêu thích */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <BookmarkButton
            isActive={saved}
            onToggle={() => toggleFavorite(advisorBookToBook(book))}
          />
        </div>
      </div>

      <div className="p-3.5 flex flex-col flex-1 min-w-0 gap-1.5">
        {/* 3. Tên sách 2 dòng */}
        <h3
          title={book.title}
          className="font-sans font-semibold text-sm text-ink leading-snug line-clamp-2 text-pretty group-hover:text-accent transition-colors"
        >
          {book.title}
        </h3>
        {/* 4. Tác giả 1 dòng */}
        <p className="text-xs text-ink-secondary flex items-center gap-1.5 min-w-0">
          <User className="w-3.5 h-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
          <span className="truncate">{book.authors}</span>
        </p>

        {/* 5. Hộp lý do đề xuất */}
        {book.matchReason && (
          <div
            className="mt-1 text-xs text-indigo-950 dark:text-indigo-100 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-xl p-2.5 leading-relaxed space-y-1"
            dangerouslySetInnerHTML={{
              __html: book.matchReason
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-indigo-900 dark:text-indigo-200">$1</strong>')
                .replace(/\n/g, '<br/>'),
            }}
          />
        )}

        {/* 6. Nút hành động */}
        <button
          type="button"
          onClick={() => onOpen(book)}
          className="mt-auto w-full min-h-10 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors cursor-pointer"
        >
          Xem chi tiết sách
        </button>
      </div>
    </div>
  );
};
