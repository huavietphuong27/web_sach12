import { useCallback, useEffect, useState } from 'react';
import type { Book } from '../types/book';

const STORAGE_KEY = 'websach-favorites-v1';

/**
 * Kiểm tra một giá trị lấy từ localStorage có đúng dạng Book hay không.
 * Chỉ kiểm tra tối thiểu sự tồn tại của `id` để tránh dữ liệu hỏng làm vỡ app.
 */
function isBookLike(value: unknown): value is Book {
  return typeof value === 'object' && value !== null && 'id' in value;
}

function readFavorites(): Book[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const items: unknown[] = parsed;
    return items.filter(isBookLike);
  } catch {
    // JSON hỏng hoặc localStorage bị chặn: bắt đầu với danh sách rỗng.
    return [];
  }
}

export interface UseFavoritesResult {
  favorites: Book[];
  isFavorite: (bookId: Book['id']) => boolean;
  toggleFavorite: (book: Book) => void;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<Book[]>(readFavorites);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Hết dung lượng hoặc chế độ riêng tư: state vẫn hoạt động trong phiên hiện tại.
    }
  }, [favorites]);

  const isFavorite = useCallback(
    (bookId: Book['id']): boolean => favorites.some((item) => item.id === bookId),
    [favorites],
  );

  const toggleFavorite = useCallback((book: Book): void => {
    setFavorites((prev) =>
      prev.some((item) => item.id === book.id)
        ? prev.filter((item) => item.id !== book.id)
        : [...prev, book],
    );
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
