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

class EventTrackerService {
  private impressionCache = new Set<string>(); // Chống ghi đè impression trùng lặp trong 60 giây

  private getStorageKey(userId?: string): string {
    const uid = userId && userId.trim() ? userId : 'guest';
    return `${STORAGE_PREFIX}${uid}`;
  }

  // Lấy danh sách sự kiện từ LocalStorage
  public getEvents(userId?: string): UserBehaviorEvent[] {
    try {
      const raw = localStorage.getItem(this.getStorageKey(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('Lỗi đọc sự kiện người dùng:', e);
      return [];
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
      bookCategories: data.bookCategories || data.book?.categories || [],
      bookAuthors: data.bookAuthors || data.book?.authors || [],
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
