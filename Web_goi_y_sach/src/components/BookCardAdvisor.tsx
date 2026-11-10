import React from 'react';
import { AdvisorBook, createCoverPlaceholder } from '../services/googleBooks';

interface BookCardAdvisorProps {
  book: AdvisorBook;
  onOpen: (book: AdvisorBook) => void;
}

/** Thẻ sách 6 thành phần: bìa 2:3 · badge thể loại+⭐ · tiêu đề 2 dòng · tác giả · hộp matchReason · nút. */
export const BookCardAdvisor: React.FC<BookCardAdvisorProps> = ({ book, onOpen }) => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs flex flex-col transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-indigo-200 group">
    {/* 1. Ảnh bìa */}
    <div
      onClick={() => onOpen(book)}
      className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100 cursor-pointer"
    >
      <img
        src={book.coverImage}
        alt={book.title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        onError={(e) => {
          const target = e.currentTarget as HTMLImageElement;
          const fallback = createCoverPlaceholder(book.title);
          if (target.src !== fallback) target.src = fallback;
        }}
      />
      {/* 2. Badge thể loại + đánh giá */}
      <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-medium px-2 py-1 rounded-md shadow-xs">
        {book.category} • ⭐ {book.rating ? book.rating.toFixed(1) : '—'}
      </span>
    </div>

    <div className="p-3.5 flex flex-col flex-1 gap-1.5">
      {/* 3. Tên sách 2 dòng */}
      <h3 className="font-sans font-semibold text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-indigo-600 transition-colors">
        {book.title}
      </h3>
      {/* 4. Tác giả 1 dòng */}
      <p className="text-xs text-slate-500 line-clamp-1">✍️ {book.authors}</p>

      {/* 5. Hộp lý do đề xuất */}
      {book.matchReason && (
        <div
          className="mt-1 text-xs text-indigo-950 bg-indigo-50/80 border border-indigo-100 rounded-lg p-2.5 leading-relaxed space-y-1"
          dangerouslySetInnerHTML={{
            __html: book.matchReason
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-indigo-900">$1</strong>')
              .replace(/\n/g, '<br/>'),
          }}
        />
      )}

      {/* 6. Nút hành động */}
      <button
        onClick={() => onOpen(book)}
        className="mt-auto w-full py-2.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-indigo-600 transition-colors cursor-pointer"
      >
        Xem chi tiết sách
      </button>
    </div>
  </div>
);
