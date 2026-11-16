// src/services/eventTracker.ts - Bộ Thu Thập & Chuẩn Hóa Sự Kiện Hành Vi Độc Giả
import { UserBehaviorEvent, EventType, UserPreferenceSummary } from '../types/events';
import { Book } from '../types/book';

const STORAGE_PREFIX = 'bookmind_events_';
const SESSION_KEY = 'bookmind_session_id';

// Quản lý Session ID duy nhất cho mỗi phiên duyệt web
export function getOrCreateSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return 'sess_fallback_' + Date.now();
  }
}

const HOUR_MS = 3600 * 1000;

function makeSeedEvent(
  userId: string,
  idx: number,
  hoursAgo: number,
  eventType: EventType,
  extra: Partial<UserBehaviorEvent>
): UserBehaviorEvent {
  return {
    eventId: `seed_${userId}_${idx}`,
    userId,
    sessionId: `sess_seed_${userId}`,
    eventType,
    timestamp: Date.now() - hoursAgo * HOUR_MS,
    ...extra,
  };
}

function getSeedEventsForUser(userId?: string): UserBehaviorEvent[] {
  if (userId === 'u-tamly-01') {
    return [
      makeSeedEvent(userId, 1, 2, 'search_submitted', { payload: { query: 'chữa lành tâm lý' } }),
      makeSeedEvent(userId, 2, 3, 'book_detail_open', { bookId: 'ds-hieu-ve-trai-tim', bookTitle: 'Hiểu Về Trái Tim', bookAuthors: ['Minh Niệm'], bookCategories: ['Tâm lý & Chữa lành'], payload: { source: 'search' } }),
      makeSeedEvent(userId, 3, 3, 'favorite_toggle', { bookId: 'ds-hieu-ve-trai-tim', bookTitle: 'Hiểu Về Trái Tim', bookAuthors: ['Minh Niệm'], bookCategories: ['Tâm lý & Chữa lành'], payload: { isFavorite: true } }),
      makeSeedEvent(userId, 4, 3, 'rating_submitted', { bookId: 'ds-hieu-ve-trai-tim', bookTitle: 'Hiểu Về Trái Tim', bookAuthors: ['Minh Niệm'], bookCategories: ['Tâm lý & Chữa lành'], payload: { rating: 5 } }),
      makeSeedEvent(userId, 5, 10, 'search_submitted', { payload: { query: 'cân bằng cảm xúc' } }),
      makeSeedEvent(userId, 6, 11, 'book_detail_open', { bookId: 'ds-can-bang-cam-xuc', bookTitle: 'Cân Bằng Cảm Xúc, Cả Lúc Bão Giông', bookAuthors: ['Richard Nicholls'], bookCategories: ['Tâm lý & Chữa lành'], payload: { source: 'recommendation' } }),
      makeSeedEvent(userId, 7, 11, 'favorite_toggle', { bookId: 'ds-can-bang-cam-xuc', bookTitle: 'Cân Bằng Cảm Xúc, Cả Lúc Bão Giông', bookAuthors: ['Richard Nicholls'], bookCategories: ['Tâm lý & Chữa lành'], payload: { isFavorite: true } }),
      makeSeedEvent(userId, 8, 11, 'rating_submitted', { bookId: 'ds-can-bang-cam-xuc', bookTitle: 'Cân Bằng Cảm Xúc, Cả Lúc Bão Giông', bookAuthors: ['Richard Nicholls'], bookCategories: ['Tâm lý & Chữa lành'], payload: { rating: 5 } }),
      makeSeedEvent(userId, 9, 20, 'book_detail_open', { bookId: 'ds-lam-nhu-choi', bookTitle: 'Làm Như Chơi', bookAuthors: ['Minh Niệm'], bookCategories: ['Tâm lý & Chữa lành'], payload: { source: 'category' } }),
      makeSeedEvent(userId, 10, 20, 'favorite_toggle', { bookId: 'ds-lam-nhu-choi', bookTitle: 'Làm Như Chơi', bookAuthors: ['Minh Niệm'], bookCategories: ['Tâm lý & Chữa lành'], payload: { isFavorite: true } }),
      makeSeedEvent(userId, 11, 36, 'search_submitted', { payload: { query: 'vượt qua trầm cảm' } }),
      makeSeedEvent(userId, 12, 37, 'book_detail_open', { bookId: 'ds-dai-duong-den', bookTitle: 'Đại Dương Đen', bookAuthors: ['Đặng Hoàng Giang'], bookCategories: ['Tâm lý & Xã hội'], payload: { source: 'search' } }),
      makeSeedEvent(userId, 13, 37, 'rating_submitted', { bookId: 'ds-dai-duong-den', bookTitle: 'Đại Dương Đen', bookAuthors: ['Đặng Hoàng Giang'], bookCategories: ['Tâm lý & Xã hội'], payload: { rating: 5 } }),
      makeSeedEvent(userId, 14, 60, 'book_detail_open', { bookId: 'ds-thinking-fast-slow', bookTitle: 'Tư Duy Nhanh Và Chậm', bookAuthors: ['Daniel Kahneman'], bookCategories: ['Tư duy & Tâm lý học'], payload: { source: 'recommendation' } }),
      makeSeedEvent(userId, 15, 72, 'book_detail_open', { bookId: 'ds-nha-gia-kim', bookTitle: 'Nhà Giả Kim', bookAuthors: ['Paulo Coelho'], bookCategories: ['Văn học & Triết lý sống'], payload: { source: 'category' } }),
      makeSeedEvent(userId, 16, 72, 'favorite_toggle', { bookId: 'ds-nha-gia-kim', bookTitle: 'Nhà Giả Kim', bookAuthors: ['Paulo Coelho'], bookCategories: ['Văn học & Triết lý sống'], payload: { isFavorite: true } }),
      makeSeedEvent(userId, 17, 96, 'rating_submitted', { bookId: 'ds-nguyen-ly-80-20', bookTitle: 'Nguyên Lý 80/20', bookAuthors: ['Richard Koch'], bookCategories: ['Kinh doanh & Hiệu suất'], payload: { rating: 2 } }),
      makeSeedEvent(userId, 18, 120, 'recommendation_impression', { bookId: 'ds-nguoi-dua-dieu', bookTitle: 'Người Đua Diều', bookAuthors: ['Khaled Hosseini'], bookCategories: ['Văn học & Tiểu thuyết'], payload: { position: 1 } }),
    ];
  }

  if (userId === 'u-congnghe-01') {
    return [
      makeSeedEvent(userId, 1, 2, 'search_submitted', { payload: { query: 'trí tuệ nhân tạo AI' } }),
      makeSeedEvent(userId, 2, 2, 'book_detail_open', { bookId: 'ds-ai-2041', bookTitle: 'AI 2041: 10 Viễn Cảnh Cho Tương Lai', bookAuthors: ['Kai-Fu Lee', 'Chen Qiufan'], bookCategories: ['Công nghệ & Trí tuệ nhân tạo'], payload: { source: 'search' } }),
      makeSeedEvent(userId, 3, 2, 'favorite_toggle', { bookId: 'ds-ai-2041', bookTitle: 'AI 2041: 10 Viễn Cảnh Cho Tương Lai', bookAuthors: ['Kai-Fu Lee', 'Chen Qiufan'], bookCategories: ['Công nghệ & Trí tuệ nhân tạo'], payload: { isFavorite: true } }),
      makeSeedEvent(userId, 4, 2, 'rating_submitted', { bookId: 'ds-ai-2041', bookTitle: 'AI 2041: 10 Viễn Cảnh Cho Tương Lai', bookAuthors: ['Kai-Fu Lee', 'Chen Qiufan'], bookCategories: ['Công nghệ & Trí tuệ nhân tạo'], payload: { rating: 5 } }),
      makeSeedEvent(userId, 5, 8, 'search_submitted', { payload: { query: 'lập trình clean code' } }),
      makeSeedEvent(userId, 6, 9, 'book_detail_open', { bookId: 'ds-clean-code', bookTitle: 'Clean Code', bookAuthors: ['Robert C. Martin'], bookCategories: ['Công nghệ & Kỹ thuật phần mềm'], payload: { source: 'search' } }),
      makeSeedEvent(userId, 7, 9, 'favorite_toggle', { bookId: 'ds-clean-code', bookTitle: 'Clean Code', bookAuthors: ['Robert C. Martin'], bookCategories: ['Công nghệ & Kỹ thuật phần mềm'], payload: { isFavorite: true } }),
      makeSeedEvent(userId, 8, 9, 'rating_submitted', { bookId: 'ds-clean-code', bookTitle: 'Clean Code', bookAuthors: ['Robert C. Martin'], bookCategories: ['Công nghệ & Kỹ thuật phần mềm'], payload: { rating: 5 } }),
      makeSeedEvent(userId, 9, 18, 'search_submitted', { payload: { query: 'dữ liệu kinh doanh' } }),
      makeSeedEvent(userId, 10, 19, 'book_detail_open', { bookId: 'ds-data-science-business', bookTitle: 'Khoa Học Dữ Liệu Trong Kinh Doanh', bookAuthors: ['Foster Provost', 'Tom Fawcett'], bookCategories: ['Công nghệ & Trí tuệ nhân tạo'], payload: { source: 'recommendation' } }),
      makeSeedEvent(userId, 11, 19, 'favorite_toggle', { bookId: 'ds-data-science-business', bookTitle: 'Khoa Học Dữ Liệu Trong Kinh Doanh', bookAuthors: ['Foster Provost', 'Tom Fawcett'], bookCategories: ['Công nghệ & Trí tuệ nhân tạo'], payload: { isFavorite: true } }),
      makeSeedEvent(userId, 12, 30, 'book_detail_open', { bookId: 'ds-nexus-harari', bookTitle: 'Nexus', bookAuthors: ['Yuval Noah Harari'], bookCategories: ['Công nghệ & Triết học'], payload: { source: 'recommendation' } }),
      makeSeedEvent(userId, 13, 40, 'search_submitted', { payload: { query: 'khởi nghiệp công nghệ' } }),
      makeSeedEvent(userId, 14, 41, 'book_detail_open', { bookId: 'ds-zero-to-one', bookTitle: 'Không Đến Một (Zero to One)', bookAuthors: ['Peter Thiel'], bookCategories: ['Kinh doanh & Công nghệ'], payload: { source: 'category' } }),
      makeSeedEvent(userId, 15, 41, 'rating_submitted', { bookId: 'ds-zero-to-one', bookTitle: 'Không Đến Một (Zero to One)', bookAuthors: ['Peter Thiel'], bookCategories: ['Kinh doanh & Công nghệ'], payload: { rating: 5 } }),
      makeSeedEvent(userId, 16, 65, 'book_detail_open', { bookId: 'ds-psychology-of-money', bookTitle: 'Tâm Lý Học Về Tiền', bookAuthors: ['Morgan Housel'], bookCategories: ['Kinh doanh & Tài chính'], payload: { source: 'category' } }),
      makeSeedEvent(userId, 17, 90, 'book_detail_open', { bookId: 'ds-deep-work', bookTitle: 'Deep Work', bookAuthors: ['Cal Newport'], bookCategories: ['Kỹ năng & Hiệu suất'], payload: { source: 'recommendation' } }),
      makeSeedEvent(userId, 18, 110, 'rating_submitted', { bookId: 'ds-mat-biec', bookTitle: 'Mắt Biếc', bookAuthors: ['Nguyễn Nhật Ánh'], bookCategories: ['Văn học Việt Nam'], payload: { rating: 2 } }),
    ];
  }

  return [];
}

class EventTrackerService {
  private impressionCache = new Set<string>(); // Chống ghi đè impression trùng lặp trong 60 giây

  private getStorageKey(userId?: string): string {
    const uid = userId && userId.trim() ? userId : 'guest';
    return `${STORAGE_PREFIX}${uid}`;
  }

  // Lấy danh sách sự kiện từ LocalStorage (nạp dữ liệu mẫu nếu tài khoản seed chưa có sự kiện)
  public getEvents(userId?: string): UserBehaviorEvent[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey(userId));
      if (!raw) return getSeedEventsForUser(userId);
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Lỗi đọc sự kiện người dùng:', e);
      return getSeedEventsForUser(userId);
    }
  }

  // Ghi nhận một sự kiện hành vi
  public logEvent(
    eventType: EventType,
    data: {
      userId?: string;
      book?: Book;
      bookId?: string;
      bookTitle?: string;
      bookCategories?: string[];
      bookAuthors?: string[];
      payload?: UserBehaviorEvent['payload'];
    }
  ): UserBehaviorEvent {
    const userId = data.userId || 'guest';
    const sessionId = getOrCreateSessionId();
    const eventId = 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const event: UserBehaviorEvent = {
      eventId,
      userId,
      sessionId,
      eventType,
      timestamp: Date.now(),
      bookId: data.bookId || data.book?.id,
      bookTitle: data.bookTitle || data.book?.title,
      bookCategories: data.bookCategories || (data.book?.genre ? [data.book.genre] : []),
      bookAuthors: data.bookAuthors || (data.book?.author ? [data.book.author] : []),
      payload: data.payload || {},
    };

    try {
      const existing = this.getEvents(userId);
      // Giới hạn lưu tối đa 500 sự kiện gần nhất cho mỗi tài khoản để tiết kiệm bộ nhớ
      const updated = [event, ...existing].slice(0, 500);
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(updated));
    } catch (e) {
      console.warn('Không thể lưu sự kiện hành vi vào localStorage:', e);
    }

    return event;
  }

  // 1. Ghi nhận tìm kiếm
  public trackSearch(query: string, userId?: string, position?: number): void {
    if (!query || !query.trim()) return;
    this.logEvent('search_submitted', {
      userId,
      payload: { query: query.trim(), position },
    });
  }

  // Lấy các từ khóa tìm kiếm gần đây của người dùng
  public getRecentSearches(userId?: string, limit = 5): string[] {
    const events = this.getEvents(userId);
    const searches: string[] = [];
    const seen = new Set<string>();
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (ev.eventType === 'search_submitted' && ev.payload?.query) {
        const q = String(ev.payload.query).trim();
        const norm = q.toLowerCase();
        if (norm && !seen.has(norm)) {
          seen.add(norm);
          searches.push(q);
          if (searches.length >= limit) break;
        }
      }
    }
    return searches;
  }

  // 2. Ghi nhận hiển thị sách (Impression) với chống trùng lặp
  public trackImpression(
    book: Book,
    position: number,
    userId?: string,
    modelVersion = 'Hybrid Ensemble v2.1',
    query?: string
  ): void {
    if (!book || !book.id) return;
    const cacheKey = `${userId || 'guest'}_${book.id}_pos${position}_${Math.floor(Date.now() / 60000)}`;
    if (this.impressionCache.has(cacheKey)) return; // Đã ghi trong 1 phút qua
    this.impressionCache.add(cacheKey);

    // Dọn dẹp cache nếu quá lớn
    if (this.impressionCache.size > 200) {
      this.impressionCache.clear();
    }

    this.logEvent('recommendation_impression', {
      userId,
      book,
      payload: { position, modelVersion, query },
    });
  }

  // 3. Ghi nhận mở chi tiết sách
  public trackBookOpen(
    book: Book,
    source: 'search' | 'recommendation' | 'category' | 'favorite' | 'modal' = 'recommendation',
    userId?: string
  ): void {
    if (!book || !book.id) return;
    this.logEvent('book_detail_open', {
      userId,
      book,
      payload: { source },
    });
  }

  // 4. Ghi nhận yêu thích
  public trackFavorite(book: Book, isFavorite: boolean, userId?: string): void {
    if (!book || !book.id) return;
    this.logEvent('favorite_toggle', {
      userId,
      book,
      payload: { isFavorite },
    });
  }

  // 5. Ghi nhận đánh giá sao
  public trackRating(book: Book, rating: number, userId?: string): void {
    if (!book || !book.id) return;
    this.logEvent('rating_submitted', {
      userId,
      book,
      payload: { rating },
    });
  }

  // 6. Ghi nhận bỏ qua sách (Dismissal)
  public trackDismiss(
    book: Book,
    reason: 'not_interested' | 'already_read' | 'irrelevant' | 'duplicate' = 'not_interested',
    userId?: string
  ): void {
    if (!book || !book.id) return;
    this.logEvent('book_dismissed', {
      userId,
      book,
      payload: { dismissReason: reason },
    });
  }

  // 7. Tính toán chỉ số tương tác (CTR, Positive/Negative signals)
  public computeEngagementMetrics(userId?: string): UserPreferenceSummary['engagementMetrics'] {
    const events = this.getEvents(userId);
    let totalSearches = 0;
    let totalImpressions = 0;
    let totalBookOpens = 0;
    let positiveSignals = 0;
    let negativeSignals = 0;

    events.forEach(ev => {
      switch (ev.eventType) {
        case 'search_submitted':
          totalSearches++;
          break;
        case 'recommendation_impression':
          totalImpressions++;
          break;
        case 'book_detail_open':
          totalBookOpens++;
          break;
        case 'favorite_toggle':
          if (ev.payload?.isFavorite) positiveSignals += 2;
          else negativeSignals += 1;
          break;
        case 'rating_submitted':
          if ((ev.payload?.rating || 0) >= 4) positiveSignals += 2;
          else if ((ev.payload?.rating || 0) <= 2) negativeSignals += 2;
          break;
        case 'book_dismissed':
          negativeSignals += 2;
          break;
      }
    });

    const clickThroughRate = totalImpressions > 0
      ? Math.round((totalBookOpens / totalImpressions) * 1000) / 10 // Đổi ra phần trăm có 1 chữ số thập phân
      : 0;

    return {
      totalSearches,
      totalImpressions,
      totalBookOpens,
      clickThroughRate,
      positiveSignals,
      negativeSignals,
    };
  }
}

export const eventTracker = new EventTrackerService();
