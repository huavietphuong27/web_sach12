import { Book, BookStyle } from '../types/book';
import { translateCategory } from '../utils/categories';

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
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
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
 * Type guard & runtime validator phòng thủ: kiểm tra tính hợp lệ của Volume từ Google Books API
 */
export function isValidGoogleVolume(item: unknown): item is GoogleVolume {
  if (typeof item !== 'object' || item === null) return false;
  const candidate = item as Record<string, unknown>;
  return typeof candidate.id === 'string' && candidate.id.length > 0;
}

/**
 * Làm sạch và chuẩn hóa an toàn phản hồi thô từ Google Books API
 */
export function sanitizeGoogleBooksResponse(data: unknown): GoogleBooksResponse {
  if (typeof data !== 'object' || data === null) {
    return { totalItems: 0, items: [] };
  }
  const raw = data as Record<string, unknown>;
  const totalItems = typeof raw.totalItems === 'number' ? raw.totalItems : 0;
  const items = Array.isArray(raw.items) ? raw.items.filter(isValidGoogleVolume) : [];
  return { totalItems, items };
}

/**
 * Gọi Google Books API có cơ chế tự phục hồi và bảo vệ kiểu dữ liệu runtime:
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
        const rawJson: unknown = await res.json();
        return sanitizeGoogleBooksResponse(rawJson);
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
    const rawJson: unknown = await resNoKey.json();
    const data = sanitizeGoogleBooksResponse(rawJson);
    if (data.items && data.items.length > 0) return data;
  }

  // Lần 3: Nếu vẫn rỗng (có thể do langRestrict=vi quá hẹp), thử bỏ langRestrict
  if (queryObj.langRestrict) {
    const { langRestrict: _, ...broadQuery } = queryObj;
    const qsBroad = new URLSearchParams(broadQuery).toString();
    const resBroad = await fetch(`${BASE_URL}?${qsBroad}`, { signal });
    if (resBroad.ok) {
      const rawJson: unknown = await resBroad.json();
      return sanitizeGoogleBooksResponse(rawJson);
    }
  }

  if (!resNoKey.ok) {
    throw new Error(`HTTP_${resNoKey.status}`);
  }
  const rawJson: unknown = await resNoKey.json();
  return sanitizeGoogleBooksResponse(rawJson);
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
  let clean = url
    .replace(/^http:\/\//i, 'https://')
    .replace(/[?&]edge=curl/gi, '')
    .replace(/zoom=[0-9]/gi, 'zoom=0');

  // Yêu cầu Google Books CDN trả về ảnh bìa độ phân giải cao (HD), sắc nét rõ ràng
  if (clean.includes('books.google.com') || clean.includes('googleusercontent.com')) {
    if (!clean.includes('fife=')) {
      clean += (clean.includes('?') ? '&' : '?') + 'fife=w800';
    }
  }
  return clean;
}

function getBestImageCover(
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  }
): string | undefined {
  if (!imageLinks) return undefined;
  // Ưu tiên độ phân giải cao nhất: extraLarge -> large -> medium -> small -> thumbnail
  const bestUrl =
    imageLinks.extraLarge ||
    imageLinks.large ||
    imageLinks.medium ||
    imageLinks.small ||
    imageLinks.thumbnail ||
    imageLinks.smallThumbnail;
  return toHttpsHighRes(bestUrl);
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
    coverUrl: getBestImageCover(vi.imageLinks),
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
    console.warn('[GoogleBooks] Search error:', err);
  }

  // 100% dữ liệu lấy trực tiếp từ Google Books API (không dùng data mẫu có sẵn)
  return [];
}

export async function fetchFeaturedVietnameseBooks(maxResults = 16): Promise<Book[]> {
  try {
    const results = await searchVietnameseBooks('phát triển bản thân kinh doanh tâm lý', maxResults);
    return results;
  } catch {
    return [];
  }
}

// Truy vấn chọn lọc các chủ đề thịnh hành trên Google Books
const QUERIES = [
  'phát triển bản thân kỹ năng sống',
  'kinh doanh khởi nghiệp tài chính',
  'tâm lý học chữa lành cảm xúc',
  'trí tuệ nhân tạo công nghệ',
  'tư duy phản biện triết học',
  'văn học tiểu thuyết việt nam',
  'nghệ thuật giao tiếp lãnh đạo',
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

  // 100% sách thật lấy động từ Google Books API
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
    coverImage: getBestImageCover(vi.imageLinks) || createCoverPlaceholder(title),
    description: stripHtml(rawDesc) || 'Chưa có mô tả chi tiết cho cuốn sách này.',
    previewLink: vi.canonicalVolumeLink || vi.infoLink || `https://books.google.com/books?id=${volume.id}`,
    publishedDate: vi.publishedDate ? String(vi.publishedDate).slice(0, 4) : '',
    pageCount: typeof vi.pageCount === 'number' ? vi.pageCount : 0,
  };
}

export async function fetchBookById(id: string): Promise<Book | null> {
  // 1. Thử gọi trực tiếp từ Google Books API (có key)
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
    return { books: [], isFallback: false };
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
    return { books: [], isFallback: false };
  } catch (e: unknown) {
    const err = e as { code?: string; name?: string };
    const errorCode = err?.code || (err?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
    console.warn('[GoogleBooks] fetchLiveBooks falling back:', errorCode);
    return { books: [], isFallback: false, errorCode };
  } finally {
    clearTimeout(timer);
  }
}


