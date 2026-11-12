// src/types/events.ts - Hệ Thống Sự Kiện Hành Vi (Implicit & Explicit Feedback)

export type EventType =
  | 'search_submitted'
  | 'recommendation_impression'
  | 'book_detail_open'
  | 'favorite_toggle'
  | 'rating_submitted'
  | 'book_dismissed'
  | 'book_note_saved';

export interface UserBehaviorEvent {
  eventId: string;
  userId: string; // 'guest' nếu chưa đăng nhập
  sessionId: string;
  eventType: EventType;
  timestamp: number;
  bookId?: string;
  bookTitle?: string;
  bookCategories?: string[];
  bookAuthors?: string[];
  payload?: {
    query?: string;
    position?: number;
    modelVersion?: string;
    source?: 'search' | 'recommendation' | 'category' | 'favorite' | 'modal';
    isFavorite?: boolean;
    rating?: number;
    dismissReason?: 'not_interested' | 'already_read' | 'irrelevant' | 'duplicate';
    dwellTimeSeconds?: number;
    noteLength?: number;
  };
}

export interface UserPreferenceSummary {
  userId: string;
  updatedAt: number;
  totalEventsCount: number;
  categoryAffinity: Record<string, number>; // điểm từ 0.0 đến 1.0
  authorAffinity: Record<string, number>;
  keywordWeights: Record<string, number>;
  recentlyViewedBookIds: string[];
  recentlyDismissedBookIds: string[];
  preferredMaturity?: string;
  engagementMetrics: {
    totalSearches: number;
    totalImpressions: number;
    totalBookOpens: number;
    clickThroughRate: number; // CTR = totalBookOpens / totalImpressions
    positiveSignals: number; // favorites + ratings >= 4
    negativeSignals: number; // dismissals + ratings <= 2
  };
}
