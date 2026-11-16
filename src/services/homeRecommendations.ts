import { Book } from '../types/book';
import { UserAccount } from '../types/auth';
import { userPreferenceEngine } from './userPreferenceEngine';
import { eventTracker } from './eventTracker';
import { normalizeVietnamese } from '../utils/bookRecommender';

export interface PersonalizedHomeBook {
  book: Book;
  matchReason: string;
  score: number;
}

export interface PersonalizedHomeFeed {
  isPersonalized: boolean;
  books: Book[];
  matchReasonsMap: Record<string, string[]>;
  basisSummary: {
    recentSearchesCount: number;
    viewedBooksCount: number;
    topTopics: string[];
    topKeywords: string[];
  };
}

const SEARCH_STORAGE_KEY_PREFIX = 'bookmind_searches_';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWholeTerm(normalizedText: string, normalizedTerm: string): boolean {
  if (!normalizedText || !normalizedTerm) return false;
  const cleanText = normalizedText.replace(/[^\w\s]/g, ' ');
  const pattern = new RegExp(`(?:^|\\s)${escapeRegExp(normalizedTerm)}(?:\\s|$)`);
  return pattern.test(cleanText);
}

const SEED_SEARCH_QUERIES: Record<string, string[]> = {
  'u-tamly-01': [
    'chữa lành tâm lý',
    'cân bằng cảm xúc',
    'tư duy tâm lý',
    'thiền định bình an',
    'vượt qua trầm cảm',
    'triết lý sống',
    'tiểu thuyết cảm động',
  ],
  'u-congnghe-01': [
    'trí tuệ nhân tạo AI',
    'khởi nghiệp công nghệ',
    'dữ liệu kinh doanh',
    'lập trình clean code',
    'tâm lý học về tiền',
    'làm việc sâu hiệu suất',
    'tư duy phản biện',
  ],
};

export function saveUserSearchQuery(userId: string, query: string): void {
  if (!userId || !query || !query.trim()) return;
  try {
    const key = `${SEARCH_STORAGE_KEY_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    const list: string[] = raw ? JSON.parse(raw) : (SEED_SEARCH_QUERIES[userId] || []);
    const clean = query.trim();
    const updated = [clean, ...list.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function getUserSearchQueries(userId: string): string[] {
  if (!userId) return [];
  try {
    const key = `${SEARCH_STORAGE_KEY_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    return SEED_SEARCH_QUERIES[userId] || [];
  } catch {
    return SEED_SEARCH_QUERIES[userId] || [];
  }
}

/**
 * Tính toán danh sách sách gợi ý cho Trang Chủ dựa trên:
 * - Lịch sử tìm kiếm (search queries)
 * - Lịch sử xem sách (reading history)
 * - Sách đánh giá cao (ratings >= 4 sao)
 * - Sở thích đọc đã cấu hình (favoriteGenres, preferredStyle)
 * - Hồ sơ trọng số thời gian từ Dynamic UserPreferenceEngine
 *
 * QUY TẮC NGHIÊM NGẶT:
 * - Chỉ áp dụng cho tài khoản người dùng đã đăng nhập thật (registered user).
 * - Nếu chưa đăng nhập (khách) HOẶC đăng nhập bằng tài khoản Demo (demo@bookmind.vn)
 *   thì trả về isPersonalized = false và mảng rỗng (không áp dụng gợi ý cá nhân hóa).
 */
export function getPersonalizedHomeFeed(
  allBooks: Book[],
  user: UserAccount | null
): PersonalizedHomeFeed {
  const EMPTY_FEED: PersonalizedHomeFeed = {
    isPersonalized: false,
    books: [],
    matchReasonsMap: {},
    basisSummary: {
      recentSearchesCount: 0,
      viewedBooksCount: 0,
      topTopics: [],
      topKeywords: [],
    },
  };

  // 1. Kiểm tra điều kiện: Phải đăng nhập và KHÔNG PHẢI tài khoản demo
  if (!user || !user.email) {
    return EMPTY_FEED;
  }

  const isDemo = user.email.toLowerCase().trim() === 'demo@bookmind.vn';
  if (isDemo) {
    return EMPTY_FEED;
  }

  // 2. Thu thập dữ liệu tín hiệu của người dùng thật
  const storedSearches = getUserSearchQueries(user.id);
  const trackedSearches = eventTracker.getRecentSearches ? eventTracker.getRecentSearches(user.id, 6) : [];
  const combinedSearches = Array.from(new Set([...storedSearches, ...trackedSearches])).slice(0, 6);

  const prefSummary = userPreferenceEngine.buildPreferenceSummary(user.id);
  const userHistory = user.history || [];
  const userRatings = user.ratings || {};
  const userFavoriteGenres = user.favoriteGenres || [];

  // Xác định các thể loại & từ khóa người dùng quan tâm nhất
  const topTopicsSet = new Set<string>();
  userFavoriteGenres.forEach((g) => topTopicsSet.add(g));
  userHistory.slice(0, 5).forEach((h) => {
    if (h.genre) topTopicsSet.add(h.genre);
  });
  const topEngineCategories = userPreferenceEngine.getTopCategories(prefSummary, 3);
  topEngineCategories.forEach((c) => topTopicsSet.add(c));

  const scoredBooks: PersonalizedHomeBook[] = [];
  const seenTitles = new Set<string>();

  // 3. Chấm điểm từng cuốn sách theo hành vi và nhu cầu thực tế
  for (const book of allBooks) {
    const titleNorm = normalizeVietnamese(book.title);
    if (seenTitles.has(titleNorm)) continue;

    let score = 0;
    const reasons: string[] = [];

    const bookDescNorm = normalizeVietnamese(book.description || '');
    const bookAuthorNorm = normalizeVietnamese(book.author || '');
    const bookGenreNorm = normalizeVietnamese(book.genre || '');
    const bookCatNorm = normalizeVietnamese(book.category || '');

    // (A) Khớp Lịch sử Tìm kiếm gần đây (Trọng số rất cao: +25 đến +35 điểm)
    for (const q of combinedSearches) {
      const qNorm = normalizeVietnamese(q);
      if (!qNorm || qNorm.length < 2) continue;

      const isShortQuery = qNorm.length <= 4;
      const inTitle = isShortQuery ? containsWholeTerm(titleNorm, qNorm) : titleNorm.includes(qNorm);
      const inMeta = isShortQuery
        ? containsWholeTerm(bookDescNorm, qNorm) || containsWholeTerm(bookAuthorNorm, qNorm) || containsWholeTerm(bookGenreNorm, qNorm)
        : bookDescNorm.includes(qNorm) || bookAuthorNorm.includes(qNorm) || bookGenreNorm.includes(qNorm);

      if (inTitle) {
        score += 35;
        reasons.push(`Tìm kiếm gần đây: "${q}"`);
        break;
      } else if (inMeta) {
        score += 25;
        reasons.push(`Liên quan đến từ khóa tìm kiếm: "${q}"`);
        break;
      } else {
        // Khớp từng từ đơn lẻ nếu cụm từ dài (dùng whole-word tránh bắt nhầm tiền tố/hậu tố)
        const words = qNorm.split(/\s+/).filter((w) => w.length > 2 || w === 'ai' || w === 'it');
        const matchCount = words.filter(
          (w) => containsWholeTerm(titleNorm, w) || containsWholeTerm(bookDescNorm, w) || containsWholeTerm(bookGenreNorm, w)
        ).length;
        const requiredMatches = words.length <= 2 ? words.length : Math.max(2, Math.ceil(words.length * 0.5));
        if (words.length > 0 && matchCount >= requiredMatches) {
          score += 15;
          reasons.push(`Khớp nhu cầu tìm kiếm: "${q}"`);
          break;
        }
      }
    }

    // (B) Khớp Lịch sử Xem sách gần đây (Reading History: +20 đến +30 điểm, bỏ qua chính cuốn đang xét)
    const recentlyViewedItem = userHistory.slice(0, 6).find((h) => {
      if (h.bookId === book.id || normalizeVietnamese(h.bookTitle) === titleNorm) return false;
      return (
        (h.bookAuthor && bookAuthorNorm && normalizeVietnamese(h.bookAuthor).includes(bookAuthorNorm)) ||
        (h.genre && bookGenreNorm && normalizeVietnamese(h.genre) === bookGenreNorm)
      );
    });

    if (recentlyViewedItem) {
      if (recentlyViewedItem.bookAuthor && normalizeVietnamese(recentlyViewedItem.bookAuthor).includes(bookAuthorNorm)) {
        score += 30;
        reasons.push(`Cùng tác giả với sách bạn đã xem ("${recentlyViewedItem.bookTitle}")`);
      } else {
        score += 20;
        reasons.push(`Tiếp nối thể loại bạn quan tâm: ${recentlyViewedItem.genre}`);
      }
    }

    // (C) Khớp Sách Đánh Giá Cao (Ratings >= 4 sao: +20 điểm)
    const highRatedIds = Object.entries(userRatings).filter(([, r]) => r >= 4).map(([id]) => id);
    for (const rid of highRatedIds) {
      const ratedBook = allBooks.find((b) => b.id === rid);
      if (ratedBook && ratedBook.id !== book.id) {
        if (ratedBook.genre === book.genre || ratedBook.category === book.category) {
          score += 20;
          reasons.push(`Tương đồng với sách bạn chấm ${userRatings[rid]}⭐ ("${ratedBook.title}")`);
          break;
        }
      }
    }

    // (D) Khớp Sở thích trong Hồ sơ cá nhân (Favorite Genres & Style: +15 đến +20 điểm)
    const isFavGenre = userFavoriteGenres.some(
      (fg) => normalizeVietnamese(fg) === bookGenreNorm || normalizeVietnamese(fg) === bookCatNorm
    );
    if (isFavGenre) {
      score += 20;
      reasons.push(`Đúng thể loại yêu thích: ${book.genre}`);
    }

    if (user.preferredStyle && book.style === user.preferredStyle) {
      score += 10;
    }

    // (E) Điểm cộng hưởng từ Dynamic UserPreferenceEngine
    if (book.category && prefSummary.categoryAffinity[book.category]) {
      score += prefSummary.categoryAffinity[book.category] * 20;
    }
    if (book.author && prefSummary.authorAffinity[book.author]) {
      score += prefSummary.authorAffinity[book.author] * 20;
    }

    // (F) Trừ điểm sách người dùng đã đánh giá thấp hoặc đã xem rồi (để ưu tiên gợi ý sách mới)
    if (userRatings[book.id] && userRatings[book.id] <= 2) {
      score -= 50;
    }
    const isAlreadyViewed = userHistory.some(
      (h) => h.bookId === book.id || normalizeVietnamese(h.bookTitle) === titleNorm
    );
    if (isAlreadyViewed) {
      score -= 25;
    }

    // (G) Điểm chất lượng tự nhiên của sách
    score += (book.rating || 4.5) * 2;

    // Chỉ giữ lại sách có tín hiệu liên quan thực sự (score >= 18)
    if (score >= 18 && reasons.length > 0) {
      seenTitles.add(titleNorm);
      scoredBooks.push({
        book,
        score,
        matchReason: reasons[0], // Lý do chính xác nhất
      });
    }
  }

  // 4. Sắp xếp theo điểm số cá nhân hóa giảm dần
  scoredBooks.sort((a, b) => b.score - a.score);

  // Lấy top 4 đến 8 cuốn sách phù hợp nhất
  const topList = scoredBooks.slice(0, 8);
  if (topList.length < 2) {
    // Nếu ít hơn 2 cuốn, bổ sung các sách theo thể loại yêu thích của user
    const fallbackList = allBooks.filter((b) => {
      if (seenTitles.has(normalizeVietnamese(b.title))) return false;
      return userFavoriteGenres.some((fg) => normalizeVietnamese(fg) === normalizeVietnamese(b.genre));
    });
    for (const fb of fallbackList) {
      if (topList.length >= 4) break;
      topList.push({
        book: fb,
        score: 15,
        matchReason: `Gợi ý theo thể loại bạn quan tâm: ${fb.genre}`,
      });
    }
  }

  const matchReasonsMap: Record<string, string[]> = {};
  topList.forEach((item) => {
    matchReasonsMap[item.book.id] = [item.matchReason];
  });

  return {
    isPersonalized: topList.length > 0,
    books: topList.map((item) => item.book),
    matchReasonsMap,
    basisSummary: {
      recentSearchesCount: combinedSearches.length,
      viewedBooksCount: userHistory.length,
      topTopics: Array.from(topTopicsSet).slice(0, 4),
      topKeywords: combinedSearches.slice(0, 3),
    },
  };
}
