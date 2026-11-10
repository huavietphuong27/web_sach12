import { Book, BookStyle } from '../types/book';
import { translateCategory } from '../utils/categories';
import { FALLBACK_BOOKS } from '../data/content';

// Google Books API: dùng key trong .env (VITE_GOOGLE_BOOKS_API_KEY).
const API_KEY: string = (import.meta.env.VITE_GOOGLE_BOOKS_API_KEY || '').trim();

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

// Bảng màu bìa dự phòng đồng bộ hệ màu Slate & Indigo
const PALETTES = [
  { bg: '#EEF2FF', spine: '#312E81', text: '#1E1B4B', accent: '#4F46E5' },
  { bg: '#F8FAFC', spine: '#0F172A', text: '#0F172A', accent: '#4F46E5' },
  { bg: '#EFF6FF', spine: '#1E3A8A', text: '#172554', accent: '#2563EB' },
  { bg: '#F0FDF4', spine: '#14532D', text: '#052E16', accent: '#16A34A' },
  { bg: '#FFF7ED', spine: '#7C2D12', text: '#431407', accent: '#EA580C' },
  { bg: '#F5F3FF', spine: '#4C1D95', text: '#2E1065', accent: '#7C3AED' },
  { bg: '#F0F9FF', spine: '#0C4A6E', text: '#082F49', accent: '#0284C7' },
  { bg: '#FEFCE8', spine: '#713F12', text: '#422006', accent: '#CA8A04' },
];

export interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    averageRating?: number;
    ratingsCount?: number;
    industryIdentifiers?: { type: string; identifier: string }[];
    infoLink?: string;
    canonicalVolumeLink?: string;
  };
  searchInfo?: { textSnippet?: string };
}

export interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleVolume[];
}

/**
 * Gọi Google Books API có cơ chế tự phục hồi:
 * 1. Thử gọi kèm API_KEY nếu có.
 * 2. Nếu key bị lỗi 400 (sai key), 401, 403 (chặn quyền/quota) -> Tự động gọi lại công khai (không kèm key).
 * 3. Hỗ trợ timeout linh hoạt (mặc định 10 giây).
 */
async function fetchGoogleBooksApi(
  params: Record<string, string>,
  signal?: AbortSignal
): Promise<GoogleBooksResponse> {
  const queryObj = { langRestrict: 'vi', ...params };
  
  // Lần 1: Thử gọi kèm key (nếu có key)
  if (API_KEY) {
    try {
      const qsWithKey = new URLSearchParams({ ...queryObj, key: API_KEY }).toString();
      const res = await fetch(`${BASE_URL}?${qsWithKey}`, { signal });
      if (res.ok) {
        return (await res.json()) as GoogleBooksResponse;
      }
      // Nếu lỗi do key (400, 401, 403, 429) -> Bỏ qua và chuyển sang gọi công khai
      console.warn(`[GoogleBooks] Key trả về mã lỗi ${res.status}, tự động chuyển sang chế độ công khai.`);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') throw err;
      // Lỗi mạng hoặc lỗi kết nối, tiếp tục thử fallback
    }
  }

  // Lần 2: Gọi công khai không cần API key
  const qsNoKey = new URLSearchParams(queryObj).toString();
  const resNoKey = await fetch(`${BASE_URL}?${qsNoKey}`, { signal });
  if (resNoKey.ok) {
    const data = (await resNoKey.json()) as GoogleBooksResponse;
    if (data.items && data.items.length > 0) return data;
  }

  // Lần 3: Nếu vẫn rỗng (có thể do langRestrict=vi quá hẹp), thử bỏ langRestrict
  if (queryObj.langRestrict) {
    const { langRestrict: _, ...broadQuery } = queryObj;
    const qsBroad = new URLSearchParams(broadQuery).toString();
    const resBroad = await fetch(`${BASE_URL}?${qsBroad}`, { signal });
    if (resBroad.ok) {
      return (await resBroad.json()) as GoogleBooksResponse;
    }
  }

  if (!resNoKey.ok) {
    throw new Error(`HTTP_${resNoKey.status}`);
  }
  return (await resNoKey.json()) as GoogleBooksResponse;
}

function pickPalette(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTES[h % PALETTES.length];
}

function extractYear(publishedDate?: string): number {
  if (!publishedDate) return 2022;
  const match = publishedDate.match(/(\d{4})/);
  return match ? Number(match[1]) : 2022;
}

function toHttpsHighRes(url?: string): string | undefined {
  if (!url) return undefined;
  return url
    .replace(/^http:\/\//, 'https://')
    .replace(/&edge=curl/g, '')
    .replace(/zoom=1/g, 'zoom=2');
}

const VIETNAMESE_SURNAMES = /^(nguyễn|trần|lê|phạm|hoàng|huỳnh|phan|vũ|võ|đặng|bùi|đỗ|hồ|ngô|dương|lý|đinh|trương|đoàn|lương|tô|tạ|châu|thạch|bảo|giản|minh niệm|rosie|nam cao|vũ trọng phụng|tô hoài)/i;

function inferCategory(authors: string, title: string, genre: string): 'vietnam' | 'world' {
  const firstAuthor = authors.split(',')[0].trim();
  if (VIETNAMESE_SURNAMES.test(firstAuthor) || /việt nam/i.test(genre) || /việt nam/i.test(title)) {
    return 'vietnam';
  }
  return 'world';
}

function inferStyleAndGoals(genre: string, title: string, description: string): { style: BookStyle; readingGoals: string[] } {
  const text = `${genre} ${title} ${description}`.toLowerCase();
  if (/kinh doanh|khởi nghiệp|tài chính|đầu tư|quản trị|marketing|kỷ luật|thói quen|hiệu suất|kỹ năng/.test(text)) {
    return {
      style: 'realistic',
      readingGoals: ['Ứng dụng thực tế', 'Phát triển kỹ năng', 'Nâng cao hiệu suất'],
    };
  }
  if (/triết|tư duy|khoa học|công nghệ|trí tuệ nhân tạo|\bai\b|lịch sử|vũ trụ|logic/.test(text)) {
    return {
      style: 'philosophical',
      readingGoals: ['Tư duy sâu sắc', 'Mở rộng tri thức', 'Góc nhìn mới'],
    };
  }
  if (/tiểu thuyết|hồi ký|tuổi trẻ|ký ức|văn học|truyện|thơ|tản văn/.test(text)) {
    return {
      style: 'nostalgic',
      readingGoals: ['Nuôi dưỡng tâm hồn', 'Chiêm nghiệm cuộc sống'],
    };
  }
  return {
    style: 'subtle',
    readingGoals: ['Cân bằng cảm xúc', 'Thấu hiểu bản thân'],
  };
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function mapVolumeToBook(volume: GoogleVolume): Book {
  const vi = volume.volumeInfo || {};
  const title = vi.title || 'Không rõ tựa đề';
  const authors = vi.authors && vi.authors.length > 0 ? vi.authors.join(', ') : 'Không rõ tác giả';
  const isbn =
    vi.industryIdentifiers?.find((i) => i.type === 'ISBN_13' || i.type === 'ISBN_10')?.identifier;
  const palette = pickPalette(volume.id + title);
  const genre = translateCategory(
    vi.categories && vi.categories.length > 0 ? vi.categories[0] : undefined,
    'Tri thức & Đời sống'
  );
  const rawDesc = vi.description || volume.searchInfo?.textSnippet || '';
  const description = stripHtml(rawDesc) || 'Tác phẩm chọn lọc cung cấp góc nhìn giá trị và thiết thực cho độc giả.';
  const category = inferCategory(authors, title, genre);
  const { style, readingGoals } = inferStyleAndGoals(genre, title, description);

  return {
    id: volume.id,
    title,
    author: authors,
    genre,
    category,
    publishYear: extractYear(vi.publishedDate),
    pages: vi.pageCount && vi.pageCount > 0 ? vi.pageCount : 240,
    publisher: vi.publisher || 'NXB Tổng Hợp',
    description,
    curatorNote: '',
    quote: '',
    readingGoals,
    style,
    coverPalette: palette,
    isFeatured: (vi.averageRating || 0) >= 4.5,
    isbn,
    coverUrl: toHttpsHighRes(vi.imageLinks?.thumbnail) || toHttpsHighRes(vi.imageLinks?.smallThumbnail),
    infoLink: vi.canonicalVolumeLink || vi.infoLink,
    rating: typeof vi.averageRating === 'number' ? vi.averageRating : 4.5,
    ratingsCount: typeof vi.ratingsCount === 'number' ? vi.ratingsCount : 12,
  };
}

// Chỉ giữ lại sách tiếng Việt (phòng trường hợp API trả lẫn ngôn ngữ khác)
function keepVietnamese(volumes: GoogleVolume[]): GoogleVolume[] {
  return volumes.filter((v) => {
    const lang = v.volumeInfo?.language;
    if (lang && lang !== 'vi' && lang !== 'vie') return false;
    return true;
  });
}

export async function searchVietnameseBooks(query: string, maxResults = 20): Promise<Book[]> {
  try {
    const data = await fetchGoogleBooksApi({ q: query, maxResults: String(maxResults) });
    const items = keepVietnamese(data.items || []);
    if (items.length > 0) {
      return items.map(mapVolumeToBook);
    }
    // Nếu lọc tiếng Việt rỗng, lấy toàn bộ items tìm được
    if (data.items && data.items.length > 0) {
      return data.items.map(mapVolumeToBook);
    }
  } catch (err) {
    console.warn('[GoogleBooks] Search error, using fallback matching:', err);
  }

  // Fallback: Tìm kiếm trong kho sách chọn lọc nội bộ nếu Google Books không phản hồi
  const qNorm = (query || '').toLowerCase().trim();
  const words = qNorm.split(/\s+/).filter(Boolean);
  const matched = FALLBACK_BOOKS.filter((b) => {
    const hay = `${b.title} ${b.author} ${b.genre} ${b.description}`.toLowerCase();
    return words.some((w) => hay.includes(w));
  });
  return matched.length > 0 ? matched : FALLBACK_BOOKS.slice(0, maxResults);
}

export async function fetchFeaturedVietnameseBooks(maxResults = 16): Promise<Book[]> {
  try {
    const results = await searchVietnameseBooks('phát triển bản thân kinh doanh tâm lý', maxResults);
    return results.length > 0 ? results : FALLBACK_BOOKS;
  } catch {
    return FALLBACK_BOOKS;
  }
}

// Truy vấn chọn lọc các chủ đề thịnh hành (giảm số lượng request đồng thời để tránh lỗi 429 Rate Limit)
const QUERIES = [
  'phát triển bản thân kỹ năng',
  'kinh doanh khởi nghiệp tài chính',
  'tâm lý học chữa lành',
  'trí tuệ nhân tạo công nghệ',
  'tư duy phản biện triết học',
  'văn học việt nam chọn lọc',
];

export async function fetchManyVietnameseBooks(perQuery = 12): Promise<Book[]> {
  const lists = await Promise.all(
    QUERIES.map((q) => searchVietnameseBooks(q, perQuery).catch(() => [] as Book[]))
  );
  const seen = new Set<string>();
  const out: Book[] = [];

  for (const list of lists) {
    for (const b of list) {
      if (!b.coverUrl) continue;
      if (!b.author || /không rõ|đang cập nhật|unknown/i.test(b.author)) continue;
      const k = b.title.trim().toLowerCase();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(b);
    }
  }

  // Luôn bổ sung sách tuyển chọn từ FALLBACK_BOOKS (nếu chưa trùng tên) để kho sách đa dạng và không bao giờ rỗng
  for (const fb of FALLBACK_BOOKS) {
    const k = fb.title.trim().toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(fb);
    }
  }

  return out;
}

// ============================================================================
// Tích hợp cho AI Advisor (AdvisorBook, fetchLiveBooks, fetchBookById)
// ============================================================================

export interface AdvisorBook {
  id: string;
  title: string;
  authors: string;
  category: string;
  rating: number;
  coverImage: string;
  description: string;
  previewLink: string;
  publishedDate?: string;
  pageCount?: number;
  matchReason?: string;
}

export interface FetchBooksResult {
  books: AdvisorBook[];
  isFallback: boolean;
  errorCode?: string;
}

export function createCoverPlaceholder(title = 'BookMind AI'): string {
  const safeTitle = title
    .slice(0, 28)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect width="300" height="450" fill="#EEF2FF"/><rect width="16" height="450" fill="#312E81"/><text x="158" y="215" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="16" fill="#1E1B4B">${safeTitle}</text><text x="158" y="245" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#4F46E5">BookMind AI</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function advisorBookToBook(ab: AdvisorBook): Book {
  const existing = FALLBACK_BOOKS.find((b) => b.id === ab.id);
  if (existing) {
    return {
      ...existing,
      curatorNote: ab.matchReason ? stripHtml(ab.matchReason.replace(/\*\*/g, '')) : existing.curatorNote,
    };
  }
  const palette = pickPalette(ab.id + ab.title);
  const category = inferCategory(ab.authors, ab.title, ab.category);
  const { style, readingGoals } = inferStyleAndGoals(ab.category, ab.title, ab.description);
  return {
    id: ab.id,
    title: ab.title,
    author: ab.authors,
    genre: ab.category || 'Tri thức & Đời sống',
    category,
    publishYear: ab.publishedDate ? extractYear(ab.publishedDate) : 2023,
    pages: ab.pageCount && ab.pageCount > 0 ? ab.pageCount : 240,
    publisher: 'NXB Tổng Hợp',
    description: ab.description,
    curatorNote: ab.matchReason ? ab.matchReason.replace(/\*\*/g, '') : '',
    quote: '',
    readingGoals,
    style,
    coverPalette: palette,
    isFeatured: ab.rating >= 4.5,
    coverUrl: ab.coverImage.startsWith('data:image/svg') ? undefined : ab.coverImage,
    infoLink: ab.previewLink,
    rating: ab.rating || 4.6,
    ratingsCount: 20,
  };
}

function mapVolumeToAdvisorBook(volume: GoogleVolume): AdvisorBook {
  const vi = volume.volumeInfo || {};
  const title = vi.title || 'Chưa có tên sách';
  const rawDesc = vi.description || volume.searchInfo?.textSnippet || '';
  return {
    id: volume.id,
    title,
    authors: vi.authors && vi.authors.length ? vi.authors.join(', ') : 'Nhiều tác giả',
    category: translateCategory(vi.categories && vi.categories.length ? vi.categories[0] : undefined),
    rating: typeof vi.averageRating === 'number' ? vi.averageRating : 4.6,
    coverImage:
      toHttpsHighRes(vi.imageLinks?.thumbnail) ||
      toHttpsHighRes(vi.imageLinks?.smallThumbnail) ||
      createCoverPlaceholder(title),
    description: stripHtml(rawDesc) || 'Chưa có mô tả chi tiết cho cuốn sách này.',
    previewLink: vi.canonicalVolumeLink || vi.infoLink || `https://books.google.com/books?id=${volume.id}`,
    publishedDate: vi.publishedDate ? String(vi.publishedDate).slice(0, 4) : '',
    pageCount: typeof vi.pageCount === 'number' ? vi.pageCount : 0,
  };
}

function loadAdvisorFallback(searchQuery = ''): AdvisorBook[] {
  const q = searchQuery.toLowerCase().trim();
  const mapped: AdvisorBook[] = FALLBACK_BOOKS.map((b) => ({
    id: b.id,
    title: b.title,
    authors: b.author,
    category: b.genre,
    rating: b.rating || 4.8,
    coverImage: b.coverUrl || createCoverPlaceholder(b.title),
    description: b.description,
    previewLink:
      b.infoLink || `https://www.google.com/search?tbm=bks&q=${encodeURIComponent(b.title)}`,
    publishedDate: String(b.publishYear),
    pageCount: b.pages,
    matchReason: b.curatorNote,
  }));

  if (!q) return mapped.slice(0, 6);
  const words = q.split(/\s+/).filter((w) => w.length > 1);
  return mapped
    .map((b) => {
      const hay = `${b.title} ${b.authors} ${b.category} ${b.description}`.toLowerCase();
      let hits = 0;
      for (const w of words) {
        if (hay.includes(w)) hits++;
      }
      return { b, hits };
    })
    .sort((a, b) => b.hits - a.hits)
    .map((s) => s.b)
    .slice(0, 6);
}

export async function fetchBookById(id: string): Promise<Book | null> {
  const local = FALLBACK_BOOKS.find((b) => b.id === id);
  if (local) return local;

  // 1. Thử gọi có key nếu có
  if (API_KEY) {
    try {
      const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}?key=${encodeURIComponent(API_KEY)}`);
      if (res.ok) {
        const item = (await res.json()) as GoogleVolume;
        if (item && item.volumeInfo) return mapVolumeToBook(item);
      }
    } catch {
      // bỏ qua để thử gọi không key
    }
  }

  // 2. Thử gọi không key
  try {
    const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}`);
    if (res.ok) {
      const item = (await res.json()) as GoogleVolume;
      if (item && item.volumeInfo) return mapVolumeToBook(item);
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchLiveBooks(
  searchQuery: string,
  categoryFilter?: string,
  isTrending = false
): Promise<FetchBooksResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { books: loadAdvisorFallback(searchQuery), isFallback: false };
  }

  const controller = new AbortController();
  // Tăng thời gian chờ lên 12 giây để không bị timeout sớm khi mạng chập chờn
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const q = categoryFilter ? `${categoryFilter} ${searchQuery}` : searchQuery;
    const data = await fetchGoogleBooksApi({ q, maxResults: '20' }, controller.signal);

    if (data.items && data.items.length > 0) {
      let books = keepVietnamese(data.items).map(mapVolumeToAdvisorBook);
      if (books.length === 0) books = data.items.map(mapVolumeToAdvisorBook);
      if (isTrending) {
        const top = books.filter((b) => b.rating >= 4.5);
        books = top.length >= 3 ? top : books;
      }
      if (books.length > 0) {
        return { books: books.slice(0, 8), isFallback: false };
      }
    }
    // Nếu API trả về rỗng, lấy từ kho tuyển chọn mà không đánh dấu lỗi
    return { books: loadAdvisorFallback(searchQuery), isFallback: false };
  } catch (e: unknown) {
    const err = e as { code?: string; name?: string };
    const errorCode = err?.code || (err?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
    console.warn('[GoogleBooks] fetchLiveBooks falling back:', errorCode);
    return { books: loadAdvisorFallback(searchQuery), isFallback: false, errorCode };
  } finally {
    clearTimeout(timer);
  }
}


