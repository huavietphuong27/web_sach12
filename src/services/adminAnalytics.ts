import { Book } from '../types/book';
import { AuthService } from './authService';
import { eventTracker } from './eventTracker';
import { getUserSearchQueries } from './homeRecommendations';

export interface AdminBookStat {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  views: number;
  favorites: number;
  ratingsCount: number;
  avgRating: number;
  score: number;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar: string;
  favoriteGenres: string[];
  favoritesCount: number;
  historyCount: number;
  ratingsCount: number;
  notesCount: number;
  searchesCount: number;
  eventsCount: number;
  recentSearches: string[];
}

export interface AdminSystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalBooks: number;
  totalViews: number;
  totalFavorites: number;
  totalRatings: number;
  avgRatingOverall: number;
  totalNotes: number;
  totalSearches: number;
  totalEvents: number;
  ctrPercent: number;
  positiveSignals: number;
  negativeSignals: number;
  topBooks: AdminBookStat[];
  topGenres: Array<{ genre: string; count: number; percent: number }>;
  topKeywords: Array<{ keyword: string; count: number }>;
  users: AdminUserRow[];
}

interface BookAccumulator {
  bookId: string;
  title: string;
  author: string;
  genre: string;
  views: number;
  favorites: number;
  ratingsCount: number;
  ratingSum: number;
}

export function computeAdminSystemMetrics(allBooks: Book[]): AdminSystemMetrics {
  const rawUsers = AuthService.getAllUsers();
  const bookMap = new Map<string, Book>(allBooks.map((b) => [b.id, b]));
  const bookAccMap = new Map<string, BookAccumulator>();

  const getOrCreateBookAcc = (
    bookId: string,
    fallback?: { title?: string; author?: string; genre?: string }
  ): BookAccumulator => {
    const existing = bookAccMap.get(bookId);
    if (existing) return existing;
    const book = bookMap.get(bookId);
    const created: BookAccumulator = {
      bookId,
      title: book?.title || fallback?.title || bookId,
      author: book?.author || fallback?.author || 'Chưa rõ',
      genre: book?.genre || fallback?.genre || 'Khác',
      views: 0,
      favorites: 0,
      ratingsCount: 0,
      ratingSum: 0,
    };
    bookAccMap.set(bookId, created);
    return created;
  };

  const genreCounts = new Map<string, number>();
  const addGenreCount = (genre?: string) => {
    const clean = genre?.trim();
    if (!clean) return;
    genreCounts.set(clean, (genreCounts.get(clean) || 0) + 1);
  };

  const keywordCounts = new Map<string, { label: string; count: number }>();
  const addKeywordCount = (rawKeyword?: string) => {
    const clean = rawKeyword?.trim();
    if (!clean) return;
    const norm = clean.toLowerCase();
    const existing = keywordCounts.get(norm);
    if (existing) {
      existing.count += 1;
    } else {
      keywordCounts.set(norm, { label: clean, count: 1 });
    }
  };

  let activeUsers = 0;
  let totalViews = 0;
  let totalFavorites = 0;
  let totalRatings = 0;
  let ratingSumOverall = 0;
  let totalNotes = 0;
  let totalSearches = 0;
  let totalEvents = 0;
  let totalImpressions = 0;
  let totalBookOpens = 0;
  let positiveSignals = 0;
  let negativeSignals = 0;

  const userRows: AdminUserRow[] = rawUsers.map((u) => {
    const events = eventTracker.getEvents(u.id);
    const engagement = eventTracker.computeEngagementMetrics(u.id);
    const storedSearches = getUserSearchQueries(u.id);

    const eventSearchQueries: string[] = [];
    events.forEach((ev) => {
      if (ev.eventType === 'search_submitted' && ev.payload?.query) {
        const q = String(ev.payload.query).trim();
        if (q) eventSearchQueries.push(q);
      }
    });

    const mergedSearchesMap = new Map<string, string>();
    [...eventSearchQueries, ...storedSearches].forEach((q) => {
      const clean = q.trim();
      if (!clean) return;
      const norm = clean.toLowerCase();
      if (!mergedSearchesMap.has(norm)) {
        mergedSearchesMap.set(norm, clean);
      }
    });
    const recentSearches = Array.from(mergedSearchesMap.values()).slice(0, 10);

    // Count keywords from unique user search history + search events
    const countedForUser = new Set<string>();
    storedSearches.forEach((q) => {
      const norm = q.trim().toLowerCase();
      if (norm && !countedForUser.has(norm)) {
        countedForUser.add(norm);
        addKeywordCount(q);
      }
    });
    eventSearchQueries.forEach((q) => {
      const norm = q.trim().toLowerCase();
      if (norm && !countedForUser.has(norm)) {
        countedForUser.add(norm);
        addKeywordCount(q);
      }
    });

    const favorites = u.favorites || [];
    const history = u.history || [];
    const ratings = u.ratings || {};
    const notes = u.notes || {};
    const favoriteGenres = u.favoriteGenres || [];

    const favoritesCount = favorites.length;
    const historyCount = history.length;
    const ratingsCount = Object.keys(ratings).length;
    const notesCount = Object.keys(notes).length;
    const searchesCount = Math.max(engagement.totalSearches, recentSearches.length);
    const eventsCount = events.length;

    if (
      eventsCount > 0 ||
      historyCount > 0 ||
      favoritesCount > 0 ||
      ratingsCount > 0 ||
      notesCount > 0 ||
      searchesCount > 0
    ) {
      activeUsers += 1;
    }

    totalFavorites += favoritesCount;
    totalNotes += notesCount;
    totalViews += historyCount;
    totalSearches += searchesCount;
    totalEvents += eventsCount;
    totalImpressions += engagement.totalImpressions;
    totalBookOpens += engagement.totalBookOpens;
    positiveSignals += engagement.positiveSignals;
    negativeSignals += engagement.negativeSignals;

    favoriteGenres.forEach((g) => addGenreCount(g));

    favorites.forEach((book) => {
      const acc = getOrCreateBookAcc(book.id, {
        title: book.title,
        author: book.author,
        genre: book.genre,
      });
      acc.favorites += 1;
      addGenreCount(book.genre);
    });

    history.forEach((item) => {
      const acc = getOrCreateBookAcc(item.bookId, {
        title: item.bookTitle,
        author: item.bookAuthor,
        genre: item.genre,
      });
      acc.views += 1;
      addGenreCount(item.genre);
    });

    Object.entries(ratings).forEach(([bookId, rating]) => {
      if (typeof rating !== 'number' || Number.isNaN(rating)) return;
      totalRatings += 1;
      ratingSumOverall += rating;
      const acc = getOrCreateBookAcc(bookId);
      acc.ratingsCount += 1;
      acc.ratingSum += rating;
    });

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role === 'admin' ? 'admin' : 'user',
      avatar: u.avatar,
      favoriteGenres,
      favoritesCount,
      historyCount,
      ratingsCount,
      notesCount,
      searchesCount,
      eventsCount,
      recentSearches,
    };
  });

  // Include 'guest' events in total events / CTR / signals / views
  const guestEvents = eventTracker.getEvents('guest');
  const guestEngagement = eventTracker.computeEngagementMetrics('guest');
  totalEvents += guestEvents.length;
  totalSearches += guestEngagement.totalSearches;
  totalImpressions += guestEngagement.totalImpressions;
  totalBookOpens += guestEngagement.totalBookOpens;
  totalViews += guestEngagement.totalBookOpens;
  positiveSignals += guestEngagement.positiveSignals;
  negativeSignals += guestEngagement.negativeSignals;

  guestEvents.forEach((ev) => {
    if (ev.eventType === 'search_submitted' && ev.payload?.query) {
      addKeywordCount(String(ev.payload.query));
    } else if (ev.eventType === 'book_detail_open' && ev.bookId) {
      const acc = getOrCreateBookAcc(ev.bookId, {
        title: ev.bookTitle,
        author: ev.bookAuthors?.[0],
        genre: ev.bookCategories?.[0],
      });
      acc.views += 1;
      ev.bookCategories?.forEach((g) => addGenreCount(g));
    }
  });

  const avgRatingOverall =
    totalRatings > 0 ? Math.round((ratingSumOverall / totalRatings) * 100) / 100 : 0;

  const ctrPercent =
    totalImpressions > 0 ? Math.round((totalBookOpens / totalImpressions) * 1000) / 10 : 0;

  const topBooks: AdminBookStat[] = Array.from(bookAccMap.values())
    .map((acc) => {
      const avgRating =
        acc.ratingsCount > 0 ? Math.round((acc.ratingSum / acc.ratingsCount) * 10) / 10 : 0;
      const score =
        Math.round((acc.views * 1 + acc.favorites * 3 + acc.ratingsCount * 2 + avgRating) * 10) /
        10;
      return {
        bookId: acc.bookId,
        title: acc.title,
        author: acc.author,
        genre: acc.genre,
        views: acc.views,
        favorites: acc.favorites,
        ratingsCount: acc.ratingsCount,
        avgRating,
        score,
      };
    })
    .filter((b) => b.score > 0)
    .sort((a, b) => b.score - a.score || b.views - a.views || b.favorites - a.favorites)
    .slice(0, 10);

  const totalGenreMentions = Array.from(genreCounts.values()).reduce((sum, c) => sum + c, 0);
  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([genre, count]) => ({
      genre,
      count,
      percent: totalGenreMentions > 0 ? Math.round((count / totalGenreMentions) * 1000) / 10 : 0,
    }));

  const topKeywords = Array.from(keywordCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(({ label, count }) => ({ keyword: label, count }));

  return {
    totalUsers: rawUsers.length,
    activeUsers,
    totalBooks: allBooks.length,
    totalViews,
    totalFavorites,
    totalRatings,
    avgRatingOverall,
    totalNotes,
    totalSearches,
    totalEvents,
    ctrPercent,
    positiveSignals,
    negativeSignals,
    topBooks,
    topGenres,
    topKeywords,
    users: userRows,
  };
}
