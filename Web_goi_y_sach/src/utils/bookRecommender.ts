import { Book, FilterState, BookStyle } from '../types/book';

export interface RecommendationCriteria {
  query?: string;
  goalId?: string;
  preferredLength?: 'all' | 'short' | 'medium' | 'long';
  style?: BookStyle | 'all';
}

export interface ScoredBook {
  book: Book;
  score: number;
  matchReasons: string[];
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
    // Search query match
    if (normQuery) {
      const matchTitle = normalizeVietnamese(book.title).includes(normQuery);
      const matchAuthor = normalizeVietnamese(book.author).includes(normQuery);
      const matchTranslator = book.translator && normalizeVietnamese(book.translator).includes(normQuery);
      const matchGenre = normalizeVietnamese(book.genre).includes(normQuery);
      const matchPub = normalizeVietnamese(book.publisher).includes(normQuery);
      const matchDesc = normalizeVietnamese(book.description).includes(normQuery);
      if (!matchTitle && !matchAuthor && !matchTranslator && !matchGenre && !matchPub && !matchDesc) {
        return false;
      }
    }

    // Category match
    if (filters.category !== 'all' && book.category !== filters.category) {
      return false;
    }

    // Genre match
    if (filters.genre !== 'all' && book.genre !== filters.genre) {
      return false;
    }

    // Length match
    if (filters.length !== 'all') {
      if (book.pages <= 0) return false;
      if (filters.length === 'short' && book.pages > 200) return false;
      if (filters.length === 'medium' && (book.pages <= 200 || book.pages > 400)) return false;
      if (filters.length === 'long' && book.pages <= 400) return false;
    }

    // Tag filter match (author, publisher, year)
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

const GOAL_KEYWORDS: Record<string, string[]> = {
  skills: ['ky luat', 'thoi quen', 'hieu suat', 'thoi gian', 'tap trung', 'tri hoan', 'phat trien ban than', 'ky nang', 'tu hoc'],
  business: ['kinh doanh', 'khoi nghiep', 'tai chinh', 'dau tu', 'tien', 'quan tri', 'chien luoc', 'marketing', 'lam giau'],
  healing: ['tam ly', 'chua lanh', 'cam xuc', 'binh yen', 'cang thang', 'stress', 'ap luc', 'buoc cham', 'trai tim', 'hanh phuc'],
  tech: ['cong nghe', 'tri tue nhan tao', 'ai', 'tuong lai', 'khoa hoc', 'so hoa', 'du lieu', 'may tinh'],
  communication: ['giao tiep', 'lanh dao', 'ung xu', 'thuyet phuc', 'quan he', 'dac nhan tam', 'quan ly', 'ket noi'],
  wisdom: ['triet', 'tu duy', 'phan bien', 'logic', 'y nghia', 'khai minh', 'nhan sinh', 'quyet dinh'],
};

export function recommendByGoal(books: Book[], criteria: RecommendationCriteria): ScoredBook[] {
  const normQuery = normalizeVietnamese(criteria.query || '');
  const hasAnyFilter =
    Boolean(normQuery) ||
    Boolean(criteria.goalId) ||
    Boolean(criteria.preferredLength && criteria.preferredLength !== 'all') ||
    Boolean(criteria.style && criteria.style !== 'all');

  const scored: ScoredBook[] = books.map((book) => {
    let score = hasAnyFilter ? 0 : 10;
    const matchReasons: string[] = [];
    const normAll = normalizeVietnamese(
      `${book.title} ${book.author} ${book.genre} ${book.description} ${book.curatorNote} ${book.quote} ${book.readingGoals.join(' ')}`
    );

    // Length matching
    if (criteria.preferredLength && criteria.preferredLength !== 'all') {
      if (criteria.preferredLength === 'short' && book.pages > 0 && book.pages <= 200) {
        score += 25;
        matchReasons.push('Độ dài tinh gọn, đọc nhanh');
      } else if (criteria.preferredLength === 'medium' && book.pages > 200 && book.pages <= 400) {
        score += 25;
        matchReasons.push('Độ dày trang tiêu chuẩn');
      } else if (criteria.preferredLength === 'long' && book.pages > 400) {
        score += 25;
        matchReasons.push('Nội dung chuyên sâu, dày dặn');
      }
    }

    // Style matching
    if (criteria.style && criteria.style !== 'all') {
      if (book.style === criteria.style) {
        score += 30;
        matchReasons.push('Đúng phong cách tiếp cận bạn chọn');
      }
    }

    // Goal matching (both style and domain keywords)
    if (criteria.goalId) {
      const goalToStyle: Record<string, BookStyle[]> = {
        skills: ['realistic', 'nostalgic'],
        business: ['realistic'],
        healing: ['subtle', 'nostalgic'],
        tech: ['philosophical', 'realistic'],
        communication: ['subtle', 'realistic'],
        wisdom: ['philosophical', 'nostalgic'],
      };
      const goalToLabel: Record<string, string> = {
        skills: 'Phù hợp mục tiêu phát triển bản thân & kỷ luật',
        business: 'Phù hợp mục tiêu kinh doanh & tài chính',
        healing: 'Phù hợp mục tiêu tâm lý & chữa lành',
        tech: 'Phù hợp mục tiêu công nghệ & tương lai AI',
        communication: 'Phù hợp mục tiêu giao tiếp & lãnh đạo',
        wisdom: 'Phù hợp mục tiêu triết lý & tư duy phản biện',
      };

      const targetStyles = goalToStyle[criteria.goalId] || [];
      if (targetStyles.includes(book.style)) {
        score += 20;
      }

      const kws = GOAL_KEYWORDS[criteria.goalId] || [];
      let kwHits = 0;
      for (const kw of kws) {
        if (normAll.includes(kw)) kwHits++;
      }
      if (kwHits > 0) {
        score += 25 + Math.min(30, kwHits * 10);
        matchReasons.unshift(goalToLabel[criteria.goalId] || 'Phù hợp mục tiêu đọc sách');
      } else if (targetStyles.includes(book.style)) {
        matchReasons.push(goalToLabel[criteria.goalId] || 'Phù hợp mục tiêu đọc sách');
      }
    }

    // Query text relevance
    if (normQuery) {
      const stopWords = new Set(['toi', 'muon', 'tim', 'sach', 've', 'va', 'cho', 'nguoi', 'moi', 'bat', 'dau', 'lam', 'sao', 'de', 'co', 'nhung', 'cuon', 'hay', 'nhat']);
      const queryWords = normQuery
        .split(/\s+/)
        .filter((w) => w.length > 1 && !stopWords.has(w));

      let hitCount = 0;
      queryWords.forEach((word) => {
        if (normAll.includes(word)) {
          hitCount++;
        }
      });

      if (hitCount > 0) {
        const textRelevance = Math.min(50, hitCount * 12);
        score += textRelevance;
        if (!matchReasons.some((r) => r.includes('Phù hợp mục tiêu'))) {
          matchReasons.push('Khớp với nhu cầu tìm kiếm của bạn');
        }
      }
    }

    // Baseline boost for featured & top rated books
    if (book.isFeatured) {
      score += 8;
    }
    if (book.rating && book.rating >= 4.7) {
      score += 5;
    }

    return {
      book,
      score,
      matchReasons: matchReasons.length > 0 ? matchReasons : ['Tác phẩm nổi bật được đề xuất'],
    };
  });

  const matched = scored
    .filter((item) => (hasAnyFilter ? item.score > 15 : item.score > 0))
    .sort((a, b) => b.score - a.score || (b.book.rating || 0) - (a.book.rating || 0));

  return matched.length > 0 ? matched : scored.sort((a, b) => b.score - a.score).slice(0, 6);
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
  const scored = recommendByGoal(allBooks, { query: userText });
  const topBooks = scored.slice(0, 3).map((s) => s.book);
  const picked = topBooks.length >= 3 ? topBooks : allBooks.slice(0, 3);

  if (picked.length === 0) {
    return {
      replyText: 'Hiện tại hệ thống chưa tìm thấy cuốn sách nào phù hợp.',
      suggestedBooks: [],
    };
  }

  const sections = picked.map((b, idx) => {
    const rawDesc = b.description || b.curatorNote || 'Tác phẩm giải quyết sâu sắc vấn đề thực tế.';
    const quoteSnippet = b.quote ? `“${b.quote}”` : `Chi tiết đắt giá từ tác giả ${b.author}`;
    return `### ${idx + 1}. [${b.title}] – [${b.author}]
* **Thể loại & Tình trạng:** ${b.genre} | Đã xuất bản tiếng Việt
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
      return normalizeVietnamese(b.publisher).includes(normalizeVietnamese(String(criteria.value)));
    }
    if (criteria.type === 'year') {
      return b.publishYear === Number(criteria.value);
    }
    return false;
  });
}

