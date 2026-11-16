import { Book, BookStyle } from '../types/book';
import { translateCategory } from '../utils/categories';
import { FALLBACK_BOOKS } from '../data/content';
import { normalizeVietnamese } from '../utils/bookRecommender';

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
 * Gọi Google Books API có cơ chế tự phục hồi:
 * 1. Thử gọi kèm API_KEY nếu có.
 * 2. Nếu key bị lỗi 400 (sai key), 401, 403 (chặn quyền/quota) -> Tự động gọi lại công khai (không kèm key).
 * 3. Hỗ trợ timeout linh hoạt.
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
      console.warn(`[GoogleBooks] Key trả về mã lỗi ${res.status}, tự động chuyển sang chế độ công khai.`);
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError') throw err;
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

export function pickPalette(seed: string) {
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

export function inferStyleAndGoals(genre: string, title: string, description: string): { style: BookStyle; readingGoals: string[] } {
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

function keepVietnamese(volumes: GoogleVolume[]): GoogleVolume[] {
  return volumes.filter((v) => {
    const lang = v.volumeInfo?.language;
    if (lang && lang !== 'vi' && lang !== 'vie') return false;
    return true;
  });
}

/**
 * Trích xuất tên tác giả chính, loại bỏ các từ khóa nhà xuất bản hay lẫn trong metadata của Google Books
 * Ví dụ: "Dorie Clark, NXB Lao Động, StreetLib" -> "Dorie Clark"
 */
export function extractCleanAuthor(author: string): string {
  if (!author) return '';
  const parts = author.split(/[,;\/]/).map((p) => p.trim()).filter(Boolean);
  const cleanParts = parts.filter(
    (p) => !/nxb|nhà xuất bản|streetlib|tổng hợp|lao động|phụ nữ|kim đồng|trẻ|nhiều tác giả/i.test(p)
  );
  return cleanParts[0] || parts[0] || author.trim();
}

export function extractCleanPublisher(rawPublisher: string): string {
  if (!rawPublisher) return '';
  return rawPublisher
    .replace(/^nhà xuất bản\s+/i, '')
    .replace(/^nxb\s+/i, '')
    .replace(/\(.*?\)/g, '')
    .trim();
}

/**
 * Gọi API Google Books để lấy toàn bộ sách của một tác giả cụ thể
 */
export async function fetchBooksByAuthor(rawAuthor: string, maxResults = 24): Promise<Book[]> {
  const authorName = extractCleanAuthor(rawAuthor);
  if (!authorName) return [];

  try {
    // Lần 1: Tìm theo cú pháp tác giả inauthor
    const data = await fetchGoogleBooksApi({
      q: `inauthor:"${authorName}"`,
      maxResults: String(maxResults),
    });

    let items = keepVietnamese(data.items || []);
    if (items.length === 0 && data.items && data.items.length > 0) {
      items = data.items;
    }

    // Lần 2: Nếu ít hơn 3 cuốn, tìm mở rộng thêm với từ khóa tên tác giả
    if (items.length < 3) {
      try {
        const broadData = await fetchGoogleBooksApi({
          q: authorName,
          maxResults: String(maxResults),
        });
        const extraItems = (broadData.items || []).filter(
          (v) => !items.some((existing) => existing.id === v.id)
        );
        items = [...items, ...extraItems];
      } catch {
        // bỏ qua nếu lỗi
      }
    }

    if (items.length > 0) {
      return items.map(mapVolumeToBook);
    }
  } catch (err) {
    console.warn(`[GoogleBooks] fetchBooksByAuthor error for "${authorName}":`, err);
  }

  // Fallback: Tìm trong kho Dataset sẵn có
  const norm = normalizeVietnamese(authorName);
  return FALLBACK_BOOKS.filter((b) => {
    const bNorm = normalizeVietnamese(b.author);
    return bNorm.includes(norm) || norm.includes(bNorm);
  });
}

/**
 * Gọi API Google Books để lấy sách theo Nhà xuất bản
 */
export async function fetchBooksByPublisher(rawPublisher: string, maxResults = 24): Promise<Book[]> {
  const cleanPub = extractCleanPublisher(rawPublisher);
  if (!cleanPub) return [];

  try {
    // Lần 1: Tìm theo cú pháp inpublisher
    const data = await fetchGoogleBooksApi({
      q: `inpublisher:"${cleanPub}"`,
      maxResults: String(maxResults),
    });

    let items = keepVietnamese(data.items || []);
    if (items.length === 0 && data.items && data.items.length > 0) {
      items = data.items;
    }

    // Lần 2: Nếu ít hơn 3 cuốn, tìm mở rộng với từ khóa nhà xuất bản
    if (items.length < 3) {
      try {
        const broadData = await fetchGoogleBooksApi({
          q: `nhà xuất bản ${cleanPub}`,
          maxResults: String(maxResults),
        });
        const extraItems = (broadData.items || []).filter(
          (v) => !items.some((existing) => existing.id === v.id)
        );
        items = [...items, ...extraItems];
      } catch {
        // bỏ qua
      }
    }

    if (items.length > 0) {
      return items.map(mapVolumeToBook);
    }
  } catch (err) {
    console.warn(`[GoogleBooks] fetchBooksByPublisher error for "${cleanPub}":`, err);
  }

  // Fallback tìm trong Dataset chuẩn
  const norm = normalizeVietnamese(cleanPub);
  return FALLBACK_BOOKS.filter((b) => {
    const bNorm = normalizeVietnamese(b.publisher);
    return bNorm.includes(norm) || norm.includes(bNorm);
  });
}

/**
 * Gọi API Google Books để lấy sách theo Năm phát hành
 */
export async function fetchBooksByYear(year: number | string, maxResults = 24): Promise<Book[]> {
  const yearNum = Number(year);
  if (!yearNum || isNaN(yearNum)) return [];

  try {
    const data = await fetchGoogleBooksApi({
      q: `sách tiếng việt xuất bản năm ${yearNum}`,
      maxResults: String(maxResults),
    });

    let items = keepVietnamese(data.items || []);
    if (items.length === 0 && data.items && data.items.length > 0) {
      items = data.items;
    }

    if (items.length < 3) {
      try {
        const broadData = await fetchGoogleBooksApi({
          q: `sách ${yearNum}`,
          maxResults: String(maxResults),
        });
        const extraItems = (broadData.items || []).filter(
          (v) => !items.some((existing) => existing.id === v.id)
        );
        items = [...items, ...extraItems];
      } catch {
        // bỏ qua
      }
    }

    if (items.length > 0) {
      return items.map((v) => {
        const b = mapVolumeToBook(v);
        if (!b.publishYear || Math.abs(b.publishYear - yearNum) > 3) {
          b.publishYear = yearNum;
        }
        return b;
      });
    }
  } catch (err) {
    console.warn(`[GoogleBooks] fetchBooksByYear error for "${yearNum}":`, err);
  }

  return FALLBACK_BOOKS.filter((b) => Math.abs(b.publishYear - yearNum) <= 1);
}

/**
 * Gọi API Google Books để lấy sách theo Thể loại / Chủ đề
 */
export async function fetchBooksByCategory(categoryOrGenre: string, maxResults = 24): Promise<Book[]> {
  const norm = normalizeVietnamese(categoryOrGenre);
  if (!norm) return [];

  let queryTerms = categoryOrGenre;
  if (/kinh doanh|khoi nghiep|tai chinh/i.test(norm)) {
    queryTerms = 'kinh doanh khởi nghiệp tài chính quản trị';
  } else if (/ky nang|phat trien ban than|hieu suat/i.test(norm)) {
    queryTerms = 'kỹ năng sống phát triển bản thân quản lý thời gian';
  } else if (/tam ly|chua lanh/i.test(norm)) {
    queryTerms = 'tâm lý học chữa lành cảm xúc bình yên';
  } else if (/tu duy|triet hoc|triet ly/i.test(norm)) {
    queryTerms = 'tư duy phản biện triết học nhân sinh';
  } else if (/cong nghe|tri tue nhan tao|ai|lap trinh/i.test(norm)) {
    queryTerms = 'trí tuệ nhân tạo công nghệ khoa học dữ liệu';
  } else if (/van hoc|tieu thuyet/i.test(norm)) {
    queryTerms = 'văn học tiểu thuyết việt nam';
  }

  try {
    const data = await fetchGoogleBooksApi({
      q: queryTerms,
      maxResults: String(maxResults),
    });

    let items = keepVietnamese(data.items || []);
    if (items.length === 0 && data.items && data.items.length > 0) {
      items = data.items;
    }

    if (items.length > 0) {
      return items.map(mapVolumeToBook);
    }
  } catch (err) {
    console.warn(`[GoogleBooks] fetchBooksByCategory error for "${categoryOrGenre}":`, err);
  }

  return FALLBACK_BOOKS.filter((b) => {
    const bCat = normalizeVietnamese(`${b.category} ${b.genre}`);
    return bCat.includes(norm) || norm.includes(bCat);
  });
}

/**
 * Hàm điều phối chung: Lấy thêm sách từ Google Books API theo bất kỳ thuộc tính nào
 * (Tác giả, Nhà xuất bản, Năm phát hành, Thể loại, Danh mục)
 */
export async function fetchBooksByAttribute(
  type: 'author' | 'publisher' | 'year' | 'genre' | 'category',
  value: string | number,
  maxResults = 24
): Promise<Book[]> {
  switch (type) {
    case 'author':
      return fetchBooksByAuthor(String(value), maxResults);
    case 'publisher':
      return fetchBooksByPublisher(String(value), maxResults);
    case 'year':
      return fetchBooksByYear(value, maxResults);
    case 'genre':
    case 'category':
      return fetchBooksByCategory(String(value), maxResults);
    default:
      return searchVietnameseBooks(String(value), maxResults);
  }
}

export async function searchVietnameseBooks(query: string, maxResults = 24): Promise<Book[]> {
  try {
    const data = await fetchGoogleBooksApi({ q: query, maxResults: String(maxResults) });
    const items = keepVietnamese(data.items || []);
    if (items.length > 0) {
      return items.map(mapVolumeToBook);
    }
    if (data.items && data.items.length > 0) {
      return data.items.map(mapVolumeToBook);
    }
  } catch (err) {
    console.warn('[GoogleBooks] Search error:', err);
  }

  // Fallback tìm trong Dataset chuẩn khi mất mạng hoặc API giới hạn
  const norm = normalizeVietnamese(query);
  if (!norm) return FALLBACK_BOOKS.slice(0, maxResults);
  const matched = FALLBACK_BOOKS.filter((b) =>
    normalizeVietnamese(`${b.title} ${b.author} ${b.genre} ${b.description} ${b.readingGoals.join(' ')}`).includes(norm)
  );
  return matched.length > 0 ? matched : FALLBACK_BOOKS.slice(0, 8);
}

export async function fetchFeaturedVietnameseBooks(maxResults = 20): Promise<Book[]> {
  try {
    const results = await searchVietnameseBooks('phát triển bản thân kinh doanh tâm lý học', maxResults);
    if (results.length > 0) return results;
  } catch {
    // ignore
  }
  return FALLBACK_BOOKS.slice(0, maxResults);
}

// Danh sách chủ đề chính truy vấn mặc định từ Google Books
const QUERIES = [
  'phát triển bản thân kỹ năng sống',
  'kinh doanh khởi nghiệp tài chính',
  'tâm lý học chữa lành cảm xúc',
  'trí tuệ nhân tạo công nghệ',
  'tư duy phản biện triết học',
  'văn học tiểu thuyết việt nam',
  'nghệ thuật giao tiếp lãnh đạo',
  'quản trị doanh nghiệp marketing',
  'đầu tư chứng khoán tự do tài chính',
  'khoa học dữ liệu lập trình máy tính',
];

// Các gói chủ đề mở rộng để người dùng bấm "Chạy thêm dữ liệu" (Load More Data Batches)
export const EXTRA_QUERY_BATCHES: { label: string; queries: string[] }[] = [
  {
    label: 'Gói dữ liệu 1: Khoa học, Vũ trụ & Tương lai học',
    queries: [
      'khoa học vũ trụ vật lý thiên văn',
      'sinh học tiến hóa con người tương lai',
      'công nghệ sinh học năng lượng xanh',
      'lịch sử thế giới văn minh nhân loại',
    ],
  },
  {
    label: 'Gói dữ liệu 2: Kinh tế học, Quản trị Chiến lược & Đàm phán',
    queries: [
      'kinh tế học hành vi vĩ mô vi mô',
      'nghệ thuật đàm phán thương lượng bán hàng',
      'quản trị nhân sự xây dựng đội ngũ',
      'thương hiệu marketing số tăng trưởng',
    ],
  },
  {
    label: 'Gói dữ liệu 3: Thiền định, Chánh niệm & Văn học Kinh điển',
    queries: [
      'thiền định chánh niệm tỉnh thức bình an',
      'tiểu thuyết văn học kinh điển thế giới',
      'tản văn hồi ký truyền cảm hứng sống',
      'giáo dục gia đình nuôi dạy con thông minh',
    ],
  },
];

export function deduplicateAndMergeBooks(primary: Book[], secondary: Book[]): Book[] {
  const seen = new Set<string>();
  const out: Book[] = [];

  for (const b of [...primary, ...secondary]) {
    const key = normalizeVietnamese(b.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

export async function fetchManyVietnameseBooks(perQuery = 15): Promise<Book[]> {
  const lists = await Promise.all(
    QUERIES.map((q) => searchVietnameseBooks(q, perQuery).catch(() => [] as Book[]))
  );
  const liveOut: Book[] = [];

  for (const list of lists) {
    for (const b of list) {
      if (!b.coverUrl) continue;
      if (!b.author || /không rõ|đang cập nhật|unknown/i.test(b.author)) continue;
      liveOut.push(b);
    }
  }

  // Hợp nhất Dataset chuẩn (CURATED_DATASET_BOOKS) và dữ liệu trực tuyến từ Google Books API
  return deduplicateAndMergeBooks(FALLBACK_BOOKS, liveOut);
}

/**
 * Chạy nạp thêm lô dữ liệu mới từ Google Books theo gói chủ đề mở rộng
 */
export async function fetchExtraDatasetBatch(batchIndex: number, perQuery = 16): Promise<{
  batchLabel: string;
  addedBooks: Book[];
}> {
  const batch = EXTRA_QUERY_BATCHES[batchIndex % EXTRA_QUERY_BATCHES.length];
  const lists = await Promise.all(
    batch.queries.map((q) => searchVietnameseBooks(q, perQuery).catch(() => [] as Book[]))
  );
  const addedBooks: Book[] = [];
  const seen = new Set<string>();

  for (const list of lists) {
    for (const b of list) {
      const k = normalizeVietnamese(b.title);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      addedBooks.push(b);
    }
  }

  return {
    batchLabel: batch.label,
    addedBooks,
  };
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
  if (existing) return existing;

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

export function bookToAdvisorBook(b: Book): AdvisorBook {
  return {
    id: b.id,
    title: b.title,
    authors: b.author,
    category: b.genre,
    rating: b.rating || 4.8,
    coverImage: b.coverUrl || createCoverPlaceholder(b.title),
    description: b.description,
    previewLink: b.infoLink || `https://books.google.com/books?q=${encodeURIComponent(b.title)}`,
    publishedDate: String(b.publishYear),
    pageCount: b.pages,
  };
}

function loadAdvisorFallback(searchQuery = ''): AdvisorBook[] {
  const norm = normalizeVietnamese(searchQuery);
  if (!norm) {
    return FALLBACK_BOOKS.slice(0, 8).map(bookToAdvisorBook);
  }
  const words = norm.split(/\s+/).filter((w) => w.length > 1);
  const scored = FALLBACK_BOOKS.map((b) => {
    const text = normalizeVietnamese(
      `${b.title} ${b.author} ${b.genre} ${b.description} ${b.curatorNote} ${b.readingGoals.join(' ')}`
    );
    let hits = 0;
    words.forEach((w) => {
      if (text.includes(w)) hits += 1;
    });
    return { b, hits };
  }).sort((a, b) => b.hits - a.hits || (b.b.rating || 0) - (a.b.rating || 0));

  return scored.slice(0, 8).map((item) => bookToAdvisorBook(item.b));
}

export async function fetchBookById(id: string): Promise<Book | null> {
  // Kiểm tra trong kho Dataset trước
  const localFound = FALLBACK_BOOKS.find((b) => b.id === id);
  if (localFound) return localFound;

  if (API_KEY) {
    try {
      const res = await fetch(`${BASE_URL}/${encodeURIComponent(id)}?key=${encodeURIComponent(API_KEY)}`);
      if (res.ok) {
        const item = (await res.json()) as GoogleVolume;
        if (item && item.volumeInfo) return mapVolumeToBook(item);
      }
    } catch {
      // bỏ qua
    }
  }

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
  const datasetMatches = loadAdvisorFallback(searchQuery).slice(0, 4);

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { books: loadAdvisorFallback(searchQuery), isFallback: true, errorCode: 'OFFLINE' };
  }

  const controller = new AbortController();
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
        // Kết hợp sách phù hợp nhất từ Dataset chuẩn và sách trực tuyến từ Google Books
        const seen = new Set(books.map((b) => normalizeVietnamese(b.title)));
        const merged = [
          ...books.slice(0, 6),
          ...datasetMatches.filter((d) => !seen.has(normalizeVietnamese(d.title))).slice(0, 3),
        ];
        return { books: merged.slice(0, 8), isFallback: false };
      }
    }
    return { books: loadAdvisorFallback(searchQuery), isFallback: false };
  } catch (e: unknown) {
    const err = e as { code?: string; name?: string };
    const errorCode = err?.code || (err?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK');
    console.warn('[GoogleBooks] fetchLiveBooks falling back:', errorCode);
    return { books: loadAdvisorFallback(searchQuery), isFallback: true, errorCode };
  } finally {
    clearTimeout(timer);
  }
}
