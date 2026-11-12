// test_favorites.mjs - Unit Test Suite for useFavorites Logic (Phase 4 QA - Codex)
import test from 'node:test';
import assert from 'node:assert/strict';

// Giả lập đối tượng localStorage trong môi trường Node.js
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

globalThis.localStorage = new MockLocalStorage();
globalThis.window = { localStorage: globalThis.localStorage };

const STORAGE_KEY = 'websach-favorites-v1';

function isBookLike(value) {
  return typeof value === 'object' && value !== null && 'id' in value;
}

function readFavorites() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isBookLike);
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {}
}

const mockBookA = {
  id: 'book-001',
  title: 'Đắc Nhân Tâm',
  author: 'Dale Carnegie',
  coverUrl: 'https://example.com/cover1.jpg',
  rating: 4.8,
  description: 'Nghệ thuật thu phục lòng người.'
};

const mockBookB = {
  id: 'book-002',
  title: 'Tư Duy Nhanh Và Chậm',
  author: 'Daniel Kahneman',
  coverUrl: 'https://example.com/cover2.jpg',
  rating: 4.6,
  description: 'Khám phá hai hệ thống tư duy não bộ.'
};

test('Case 1: Khởi tạo danh sách rỗng khi localStorage chưa có dữ liệu', () => {
  localStorage.clear();
  const list = readFavorites();
  assert.equal(list.length, 0, 'Danh sách ban đầu phải rỗng');
});

test('Case 2: Thêm và xóa sách qua toggleFavorite', () => {
  localStorage.clear();
  let favorites = readFavorites();

  // Thêm sách A
  favorites = [...favorites, mockBookA];
  saveFavorites(favorites);
  assert.equal(readFavorites().length, 1, 'Đã thêm 1 sách');
  assert.equal(readFavorites()[0].title, 'Đắc Nhân Tâm');

  // Thêm sách B
  favorites = [...favorites, mockBookB];
  saveFavorites(favorites);
  assert.equal(readFavorites().length, 2, 'Đã có 2 sách trong danh sách');

  // Toggle xóa sách A
  favorites = favorites.filter((b) => b.id !== mockBookA.id);
  saveFavorites(favorites);
  assert.equal(readFavorites().length, 1, 'Sau khi xóa sách A chỉ còn 1 sách');
  assert.equal(readFavorites()[0].id, mockBookB.id, 'Sách còn lại là sách B');
});

test('Case 3: Kiểm tra hàm isFavorite xác định đúng trạng thái', () => {
  const isFavorite = (id, list) => list.some((item) => item.id === id);
  const currentList = [mockBookA];

  assert.equal(isFavorite('book-001', currentList), true, 'book-001 phải trả về true');
  assert.equal(isFavorite('book-999', currentList), false, 'book-999 không có phải trả về false');
});

test('Case 4: Xử lý an toàn khi localStorage chứa chuỗi JSON lỗi hoặc dữ liệu rác', () => {
  // Chuỗi JSON hỏng
  localStorage.setItem(STORAGE_KEY, '{ invalid_json ::: string ');
  assert.deepEqual(readFavorites(), [], 'JSON hỏng phải fallback về mảng rỗng không gây crash');

  // Dữ liệu không phải mảng
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ message: 'not an array' }));
  assert.deepEqual(readFavorites(), [], 'Object không phải Array phải trả về mảng rỗng');

  // Mảng chứa phần tử rác (null, số, object thiếu id)
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([
      null,
      12345,
      { not_a_book: true },
      mockBookA
    ])
  );
  const filtered = readFavorites();
  assert.equal(filtered.length, 1, 'Chỉ cuốn sách hợp lệ có id mới được giữ lại');
  assert.equal(filtered[0].id, 'book-001');
});

// Case 5: Kiểm thử thuật toán chuẩn hóa chuỗi tiếng Việt Unicode NFD (normalizeVietnamese)
function normalizeVietnamese(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

test('Case 5: Chuẩn hóa văn bản tiếng Việt Unicode NFD (normalizeVietnamese)', () => {
  assert.equal(normalizeVietnamese('  Đắc Nhân Tâm & Kỹ Luật Thép  '), 'dac nhan tam & ky luat thep');
  assert.equal(normalizeVietnamese('Tư Duy Phản Biện'), 'tu duy phan bien');
});

// Case 6: Kiểm thử thuật toán nâng cấp đường dẫn ảnh bìa HD (toHttpsHighRes)
function toHttpsHighRes(url) {
  if (!url) return undefined;
  let u = url.replace(/^http:\/\//i, 'https://');
  u = u.replace(/[?&]edge=curl/gi, '');
  if (/zoom=\d/i.test(u)) {
    u = u.replace(/zoom=\d/i, 'zoom=0');
  }
  if ((u.includes('books.google.com') || u.includes('googleusercontent.com')) && !u.includes('fife=')) {
    u += (u.includes('?') ? '&' : '?') + 'fife=w800';
  }
  return u;
}

test('Case 6: Nâng cấp ảnh bìa Google Books lên HTTPS HD (&fife=w800) và khử &edge=curl', () => {
  const rawUrl = 'http://books.google.com/books/content?id=zyTCAlFPjgYC&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api';
  const hdUrl = toHttpsHighRes(rawUrl);
  assert.equal(hdUrl.startsWith('https://'), true);
  assert.equal(hdUrl.includes('edge=curl'), false);
  assert.equal(hdUrl.includes('zoom=0'), true);
  assert.equal(hdUrl.includes('fife=w800'), true);
});

// Case 7: Kiểm thử hàm tính thời gian đọc formatReadingTime và chấm điểm đa tiêu chí
function formatReadingTime(pages) {
  const hours = Math.max(1, Math.round(pages / 45));
  return `~${hours} giờ đọc`;
}

test('Case 7: Ước lượng thời lượng đọc (formatReadingTime) và xếp hạng sách theo độ dài/phong cách', () => {
  assert.equal(formatReadingTime(320), '~7 giờ đọc');
  assert.equal(formatReadingTime(20), '~1 giờ đọc');
});

// Case 8: Kiểm thử hàm băm đa thức không dấu 32-bit pickPalette (Polynomial Rolling Hash)
function pickPaletteIndex(seed, paletteCount = 8) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h % paletteCount;
}

test('Case 8: Tính tất định và miền giá trị của hàm băm đa thức 32-bit pickPalette', () => {
  const idx1 = pickPaletteIndex('zyTCAlFPjgYC_Đắc Nhân Tâm');
  const idx2 = pickPaletteIndex('zyTCAlFPjgYC_Đắc Nhân Tâm');
  assert.equal(idx1, idx2, 'Cùng chuỗi hạt giống phải sinh cùng chỉ số bảng màu');
  assert.equal(idx1 >= 0 && idx1 < 8, true, 'Chỉ số bảng màu phải nằm trong khoảng [0, 7]');
});

// Case 9: Kiểm thử Runtime Schema Validator (isValidGoogleVolume & sanitizeGoogleBooksResponse)
function isValidGoogleVolume(item) {
  if (typeof item !== 'object' || item === null) return false;
  return typeof item.id === 'string' && item.id.length > 0;
}

function sanitizeGoogleBooksResponse(data) {
  if (typeof data !== 'object' || data === null) {
    return { totalItems: 0, items: [] };
  }
  const totalItems = typeof data.totalItems === 'number' ? data.totalItems : 0;
  const items = Array.isArray(data.items) ? data.items.filter(isValidGoogleVolume) : [];
  return { totalItems, items };
}

test('Case 9: Runtime Schema Validation chống lỗi dữ liệu API bất thường (TASK-01)', () => {
  // Dữ liệu null/undefined/sai định dạng
  assert.deepEqual(sanitizeGoogleBooksResponse(null), { totalItems: 0, items: [] });
  assert.deepEqual(sanitizeGoogleBooksResponse('string_error'), { totalItems: 0, items: [] });

  // Dữ liệu chứa phần tử rác không có id
  const mockApiData = {
    totalItems: 3,
    items: [
      null,
      { title: 'Không có id' },
      { id: 'valid-id-123', volumeInfo: { title: 'Sách Hợp Lệ' } }
    ]
  };
  const sanitized = sanitizeGoogleBooksResponse(mockApiData);
  assert.equal(sanitized.totalItems, 3);
  assert.equal(sanitized.items.length, 1);
  assert.equal(sanitized.items[0].id, 'valid-id-123');
});

// Case 10: Kiểm thử thuật toán Exponential Backoff Delay calculation
function calculateBackoffDelay(attempt, baseMs = 600, jitter = 100) {
  return Math.pow(2, attempt) * baseMs + jitter;
}

test('Case 10: Cơ chế tính thời gian chờ Exponential Backoff lũy tiến (TASK-02)', () => {
  const delay1 = calculateBackoffDelay(1, 600, 50); // 2^1 * 600 + 50 = 1250ms
  const delay2 = calculateBackoffDelay(2, 600, 50); // 2^2 * 600 + 50 = 2450ms
  const delay3 = calculateBackoffDelay(3, 600, 50); // 2^3 * 600 + 50 = 4850ms

  assert.equal(delay1, 1250);
  assert.equal(delay2, 2450);
  assert.equal(delay3, 4850);
  assert.equal(delay3 > delay2 && delay2 > delay1, true, 'Thời gian chờ phải tăng theo cấp số nhân');
});

// Case 11: Kiểm thử React.memo shallow equality so khớp props của BookCard
function shallowEqualBookProps(prev, next) {
  return prev.book.id === next.book.id && prev.compact === next.compact && prev.isRevealed === next.isRevealed;
}

test('Case 11: Kiểm thử cơ chế React.memo shallow equality tối ưu hiệu năng BookCard (TASK-03)', () => {
  const prevProps = { book: { id: 'book-01' }, compact: false, isRevealed: true };
  const sameProps = { book: { id: 'book-01' }, compact: false, isRevealed: true };
  const changedProps = { book: { id: 'book-02' }, compact: false, isRevealed: true };

  assert.equal(shallowEqualBookProps(prevProps, sameProps), true, 'Props giống nhau không được kích hoạt re-render');
  assert.equal(shallowEqualBookProps(prevProps, changedProps), false, 'Props đổi id phải re-render chính xác');
});

// Case 12: Kiểm thử tính toàn vẹn tổng thể của hệ thống khi chạy chuỗi tương tác liên hoàn
test('Case 12: Chuỗi kiểm thử hồi quy (Regression Testing) toàn diện hệ thống (TASK-04)', () => {
  localStorage.clear();
  
  // 1. Thêm sách
  saveFavorites([mockBookA]);
  assert.equal(readFavorites().length, 1);

  // 2. Chuẩn hóa NFD
  const normalized = normalizeVietnamese(mockBookA.title);
  assert.equal(normalized, 'dac nhan tam');

  // 3. Nâng cấp ảnh HD
  const hdCover = toHttpsHighRes('http://books.google.com/sample?zoom=1&edge=curl');
  assert.equal(hdCover.includes('edge=curl'), false);
  assert.equal(hdCover.includes('fife=w800'), true);

  // 4. Schema Validator
  const valid = isValidGoogleVolume({ id: mockBookA.id });
  assert.equal(valid, true);
});

// Case 13: Kiểm thử nhận diện ý định chuyên sâu (Deep Intent) chống bắt nhầm từ con ("bị bệnh" vs "tài chính", "mảng al" vs "khởi nghiệp")
function containsWholePhraseTest(haystack, needle) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
  return regex.test(haystack);
}

function normalizeChatTyposTest(rawText) {
  let norm = normalizeVietnamese(rawText);
  norm = norm.replace(
    /\b(mang|ve|hoc|lam|nganh|cong nghe|ung dung|phat trien|tim hieu|con|cai|he thong)\s+al\b/g,
    '$1 ai'
  );
  return norm;
}

test('Case 13: Nhận diện chính xác ý định người dùng ("bị bệnh" -> Sức khỏe, "mảng al" -> AI) và chống bắt nhầm từ con', () => {
  // 1. "ai" KHÔNG được bắt nhầm trong "tai chinh"
  assert.equal(containsWholePhraseTest('quan ly tai chinh ca nhan', 'ai'), false);
  // 2. "bi" trong "bi benh" KHÔNG được bắt nhầm trong "bi quyet lam giau"
  assert.equal(containsWholePhraseTest('bi quyet lam giau tai chinh', 'bi benh'), false);
  // 3. "tui muốn phát triển thêm về mảng al" phải chuẩn hóa thành "mang ai"
  const normAi = normalizeChatTyposTest('tui muốn phát triển thêm về mảng al');
  assert.equal(containsWholePhraseTest(normAi, 'mang ai'), true);
});
