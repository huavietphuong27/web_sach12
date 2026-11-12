import { useEffect } from 'react';
import { X, BookOpen, Trash2, Heart } from 'lucide-react';
import type { Book } from '../types/book';

export interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: Book[];
  onRemove: (book: Book) => void;
  onViewDetail: (book: Book) => void;
}

export function FavoritesModal({
  isOpen,
  onClose,
  favorites,
  onRemove,
  onViewDetail,
}: FavoritesModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="favorites-modal-title"
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-pink-600" />
            </div>
            <div>
              <h2 id="favorites-modal-title" className="text-base font-bold text-slate-900 font-serif">
                Sách Yêu Thích Của Bạn
              </h2>
              <p className="text-xs text-slate-500">Đã lưu {favorites.length} cuốn sách</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {favorites.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-600">
                Chưa có cuốn sách nào trong danh sách yêu thích.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Bấm vào biểu tượng Bookmark trên các cuốn sách để lưu lại tại đây!
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {favorites.map((book) => (
                <li
                  key={book.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-3 hover:border-indigo-200 hover:bg-slate-50/50 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-11 h-15 object-cover rounded-md shrink-0 shadow-2xs border border-slate-200"
                      />
                    ) : (
                      <div className="w-11 h-15 bg-slate-100 rounded-md shrink-0 flex items-center justify-center text-slate-400 border border-slate-200">
                        <BookOpen className="w-5 h-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                        {book.title}
                      </p>
                      <p className="truncate text-xs text-slate-500 mt-0.5">{book.author}</p>
                      {typeof book.rating === 'number' && book.rating > 0 && (
                        <p className="text-xs font-semibold text-amber-600 mt-1">
                          ★ {book.rating.toFixed(1)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onViewDetail(book);
                        onClose();
                      }}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer shadow-xs"
                    >
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemove(book)}
                      aria-label="Xóa"
                      title="Xóa khỏi danh sách"
                      className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default FavoritesModal;
