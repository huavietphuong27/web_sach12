// src/services/userPreferenceEngine.ts - Bộ Tổng Hợp Sở Thích Động Kèm Trọng Số Thời Gian (Dynamic User Preference Engine)
import { UserBehaviorEvent, UserPreferenceSummary } from '../types/events';
import { eventTracker } from './eventTracker';

const PREF_CACHE_PREFIX = 'bookmind_user_pref_';

export class UserPreferenceEngine {
  // Tính hệ số suy giảm thời gian (Time-decay factor)
  // Càng gần hiện tại trọng số càng lớn, tương tác cũ sẽ phai nhạt dần để không khóa chết người dùng vào 1 chủ đề
  private calculateTimeDecay(eventTimestamp: number, now: number): number {
    const diffHours = (now - eventTimestamp) / (1000 * 60 * 60);

    if (diffHours <= 24) return 1.0; // Trong vòng 24 giờ: 100%
    if (diffHours <= 24 * 7) return 0.75; // Trong vòng 7 ngày: 75%
    if (diffHours <= 24 * 30) return 0.45; // Trong vòng 30 ngày: 45%
    return 0.20; // Cũ hơn 1 tháng: 20%
  }

  // Phân tích toàn bộ sự kiện và sinh hồ sơ sở thích cá nhân hóa
  public buildPreferenceSummary(userId?: string): UserPreferenceSummary {
    const targetUserId = userId && userId.trim() ? userId : 'guest';
    const events = eventTracker.getEvents(targetUserId);
    const now = Date.now();

    const categoryScores: Record<string, number> = {};
    const authorScores: Record<string, number> = {};
    const keywordScores: Record<string, number> = {};
    const viewedBookIds = new Set<string>();
    const dismissedBookIds = new Set<string>();

    events.forEach(ev => {
      const decay = this.calculateTimeDecay(ev.timestamp, now);

      // 1. Phân loại theo loại sự kiện và gán điểm tín hiệu (Implicit/Explicit Feedback)
      let signalWeight = 0;
      switch (ev.eventType) {
        case 'rating_submitted':
          const rating = ev.payload?.rating || 3;
          signalWeight = rating >= 4 ? 4.0 : rating <= 2 ? -3.0 : 0.5;
          break;
        case 'favorite_toggle':
          signalWeight = ev.payload?.isFavorite ? 3.5 : -1.5;
          break;
        case 'book_detail_open':
          signalWeight = 1.8;
          if (ev.bookId) viewedBookIds.add(ev.bookId);
          break;
        case 'search_submitted':
          signalWeight = 1.0;
          if (ev.payload?.query) {
            const words = ev.payload.query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            words.forEach(w => {
              keywordScores[w] = (keywordScores[w] || 0) + 1.0 * decay;
            });
          }
          break;
        case 'book_dismissed':
          signalWeight = -3.5;
          if (ev.bookId) dismissedBookIds.add(ev.bookId);
          break;
        case 'recommendation_impression':
          signalWeight = 0.1; // Điểm chạm nhẹ
          break;
        default:
          signalWeight = 0.5;
      }

      const effectivePoints = signalWeight * decay;

      // 2. Cập nhật điểm Thể loại (Categories)
      if (ev.bookCategories && Array.isArray(ev.bookCategories)) {
        ev.bookCategories.forEach(cat => {
          if (!cat) return;
          const cleanCat = cat.trim();
          categoryScores[cleanCat] = (categoryScores[cleanCat] || 0) + effectivePoints;
        });
      }

      // 3. Cập nhật điểm Tác giả (Authors)
      if (ev.bookAuthors && Array.isArray(ev.bookAuthors)) {
        ev.bookAuthors.forEach(author => {
          if (!author) return;
          const cleanAuthor = author.trim();
          authorScores[cleanAuthor] = (authorScores[cleanAuthor] || 0) + effectivePoints;
        });
      }

      // 4. Trích xuất từ khóa tiêu đề sách tích cực
      if (signalWeight > 1.0 && ev.bookTitle) {
        const words = ev.bookTitle.toLowerCase().split(/[\s,.-]+/).filter(w => w.length > 3);
        words.forEach(w => {
          keywordScores[w] = (keywordScores[w] || 0) + 0.8 * decay;
        });
      }
    });

    // Chuẩn hóa điểm số về khoảng [0, 1]
    const normalize = (record: Record<string, number>): Record<string, number> => {
      const result: Record<string, number> = {};
      const values = Object.values(record).filter(v => v > 0);
      if (values.length === 0) return result;
      const max = Math.max(...values, 1);

      Object.entries(record).forEach(([k, v]) => {
        if (v > 0) {
          result[k] = Math.round((v / max) * 100) / 100;
        }
      });
      return result;
    };

    const engagementMetrics = eventTracker.computeEngagementMetrics(targetUserId);

    const summary: UserPreferenceSummary = {
      userId: targetUserId,
      updatedAt: now,
      totalEventsCount: events.length,
      categoryAffinity: normalize(categoryScores),
      authorAffinity: normalize(authorScores),
      keywordWeights: normalize(keywordScores),
      recentlyViewedBookIds: Array.from(viewedBookIds).slice(0, 15),
      recentlyDismissedBookIds: Array.from(dismissedBookIds).slice(0, 30),
      engagementMetrics,
    };

    // Cache kết quả
    try {
      localStorage.setItem(`${PREF_CACHE_PREFIX}${targetUserId}`, JSON.stringify(summary));
    } catch (e) {
      console.warn('Lỗi cache user preference:', e);
    }

    return summary;
  }

  // Lấy top 3 thể loại yêu thích nhất đã học được
  public getTopCategories(summary: UserPreferenceSummary, limit = 3): string[] {
    return Object.entries(summary.categoryAffinity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([cat]) => cat);
  }

  // Lấy top tác giả yêu thích
  public getTopAuthors(summary: UserPreferenceSummary, limit = 3): string[] {
    return Object.entries(summary.authorAffinity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([author]) => author);
  }
}

export const userPreferenceEngine = new UserPreferenceEngine();
