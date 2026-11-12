import { Book, FilterState, BookStyle } from '../types/book';
import {
  BookRecommendationEngine,
  RecommendationModelType,
  ModelScoreBreakdown,
} from '../services/recommendationModels';

export interface RecommendationCriteria {
  query?: string;
  goalId?: string;
  preferredLength?: 'all' | 'short' | 'medium' | 'long';
  style?: BookStyle | 'all';
  modelType?: RecommendationModelType;
  favoriteBookIds?: string[];
}

export interface ScoredBook {
  book: Book;
  score: number;
  matchReasons: string[];
  breakdown?: ModelScoreBreakdown;
}

export function normalizeVietnamese(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export function filterAndSortBooks(books: Book[], filters: FilterState): Book[] {
  const normQuery = normalizeVietnamese(filters.searchQuery || '');

  const filtered = books.filter((book) => {
    if (normQuery) {
      const matchTitle = normalizeVietnamese(book.title).includes(normQuery);
      const matchAuthor = normalizeVietnamese(book.author).includes(normQuery);
      const matchTranslator =
        book.translator && normalizeVietnamese(book.translator).includes(normQuery);
      const matchGenre = normalizeVietnamese(book.genre).includes(normQuery);
      const matchPub = normalizeVietnamese(book.publisher).includes(normQuery);
      const matchDesc = normalizeVietnamese(book.description).includes(normQuery);
      if (
        !matchTitle &&
        !matchAuthor &&
        !matchTranslator &&
        !matchGenre &&
        !matchPub &&
        !matchDesc
      ) {
        return false;
      }
    }

    if (filters.category !== 'all' && book.category !== filters.category) {
      return false;
    }

    if (filters.genre !== 'all' && book.genre !== filters.genre) {
      return false;
    }

    if (filters.length !== 'all') {
      if (book.pages <= 0) return false;
      if (filters.length === 'short' && book.pages > 200) return false;
      if (filters.length === 'medium' && (book.pages <= 200 || book.pages > 400)) return false;
      if (filters.length === 'long' && book.pages <= 400) return false;
    }

    if (filters.tagFilter) {
      if (filters.tagFilter.type === 'author') {
        const targetAuthor = normalizeVietnamese(String(filters.tagFilter.value));
        if (!normalizeVietnamese(book.author).includes(targetAuthor)) {
          return false;
        }
      } else if (filters.tagFilter.type === 'publisher') {
        const targetPub = normalizeVietnamese(String(filters.tagFilter.value));
        if (!normalizeVietnamese(book.publisher).includes(targetPub)) {
          return false;
        }
      } else if (filters.tagFilter.type === 'year') {
        if (book.publishYear !== Number(filters.tagFilter.value)) {
          return false;
        }
      }
    }

    return true;
  });

  return filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case 'title':
        return a.title.localeCompare(b.title, 'vi');
      case 'pages-asc':
        return (a.pages || 9999) - (b.pages || 9999);
      case 'pages-desc':
        return (b.pages || 0) - (a.pages || 0);
      case 'year':
        return b.publishYear - a.publishYear;
      case 'featured':
      default:
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return (b.rating || 0) - (a.rating || 0) || a.title.localeCompare(b.title, 'vi');
    }
  });
}

/**
 * Chạy hệ thống mô hình gợi ý sách (Hybrid Ensemble / TF-IDF Cosine / BM25 / Collaborative KNN / Rule-based)
 */
export function recommendByGoal(books: Book[], criteria: RecommendationCriteria): ScoredBook[] {
  const engine = new BookRecommendationEngine(books);
  const { results } = engine.rankBooks(
    {
      query: criteria.query,
      goalId: criteria.goalId,
      preferredLength: criteria.preferredLength,
      style: criteria.style,
      favoriteBookIds: criteria.favoriteBookIds,
    },
    criteria.modelType || 'hybrid-ensemble'
  );
  return results;
}

export function formatReadingTime(pages: number): string {
  if (!pages || pages <= 0) {
    return 'Đang cập nhật số trang';
  }
  const estHours = Math.max(1, Math.round(pages / 45));
  return `${pages} trang · ~${estHours} giờ đọc`;
}

export function generateAssistantResponse(
  userText: string,
  allBooks: Book[]
): { replyText: string; suggestedBooks: Book[] } {
  const scored = recommendByGoal(allBooks, {
    query: userText,
    modelType: 'hybrid-ensemble',
  });
  const topBooks = scored.slice(0, 3).map((s) => s.book);
  const picked = topBooks.length >= 3 ? topBooks : allBooks.slice(0, 3);

  if (picked.length === 0) {
    return {
      replyText: 'Hiện tại hệ thống chưa tìm thấy cuốn sách nào phù hợp.',
      suggestedBooks: [],
    };
  }

  const sections = picked.map((b, idx) => {
    const rawDesc =
      b.description || b.curatorNote || 'Tác phẩm giải quyết sâu sắc vấn đề thực tế.';
    const quoteSnippet = b.quote
      ? `“${b.quote}”`
      : `Chi tiết đắt giá từ tác giả ${b.author}`;
    const scoreInfo = scored[idx]?.breakdown
      ? ` (Độ khớp Hybrid AI: ${scored[idx].score}% · TF-IDF Cosine: ${Math.round(
          scored[idx].breakdown!.tfidfCosine * 100
        )}% · BM25: ${Math.round(scored[idx].breakdown!.bm25Normalized * 100)}%)`
      : '';
    return `### ${idx + 1}. [${b.title}] – [${b.author}]
* **Thể loại & Tình trạng:** ${b.genre} | Đã xuất bản tiếng Việt${scoreInfo}
* **Đối chiếu trực tiếp với lời chat của bạn:**
  - *Chi tiết bạn nhắc đến:* "${userText.slice(0, 60)}"
  - *Điểm khớp hoàn toàn trong sách:* Cuốn sách này đồng điệu trực tiếp với hoàn cảnh và cảm xúc bạn vừa chia sẻ, đem lại góc nhìn thấu đáo.
* **Nội dung chi tiết của sách:** ${rawDesc.slice(0, 200)}
* **Tình tiết / Trích dẫn đắt giá nhất:** ${quoteSnippet}
* **Giá trị nhận được sau khi đọc:** Giúp bạn gỡ rối khúc mắc và có định hướng hành động rõ ràng cho hoàn cảnh hiện tại.`;
  });

  return {
    replyText: sections.join('\n\n---\n\n'),
    suggestedBooks: picked,
  };
}

export function getRelatedBooksByAttribute(
  books: Book[],
  criteria: { type: 'author' | 'publisher' | 'year'; value: string | number; excludeBookId?: string }
): Book[] {
  return books.filter((b) => {
    if (criteria.excludeBookId && b.id === criteria.excludeBookId) return false;
    if (criteria.type === 'author') {
      return normalizeVietnamese(b.author).includes(normalizeVietnamese(String(criteria.value)));
    }
    if (criteria.type === 'publisher') {
      return normalizeVietnamese(b.publisher).includes(
        normalizeVietnamese(String(criteria.value))
      );
    }
    if (criteria.type === 'year') {
      return b.publishYear === Number(criteria.value);
    }
    return false;
  });
}
