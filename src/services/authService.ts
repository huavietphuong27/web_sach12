import { UserAccount, UserProfile, ReadingHistoryItem } from '../types/auth';
import { Book } from '../types/book';
import { CURATED_DATASET_BOOKS } from '../data/booksDataset';

const pickSeedBooks = (ids: string[]): Book[] =>
  CURATED_DATASET_BOOKS.filter((b) => ids.includes(b.id));

const USERS_STORAGE_KEY = 'websach-users-v3-deepcross';
const SESSION_STORAGE_KEY = 'websach-current-session-v3';
const REMEMBERED_EMAIL_KEY = 'websach-remembered-email-v3';

// Hàm băm mật khẩu đơn giản cho môi trường client (Client-side mock hash)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${str.length}`;
}

export const AVATAR_OPTIONS = [
  { id: 'avatar-1', label: 'Cú Đêm Tri Thức', bg: 'bg-indigo-600', icon: '🦉' },
  { id: 'avatar-2', label: 'Học Giả Uyên Bác', bg: 'bg-emerald-600', icon: '📖' },
  { id: 'avatar-3', label: 'Nhà Thám Hiểm AI', bg: 'bg-cyan-600', icon: '🚀' },
  { id: 'avatar-4', label: 'Tâm Hồn Nghệ Thuật', bg: 'bg-purple-600', icon: '✨' },
  { id: 'avatar-5', label: 'Chiến Binh Kỷ Luật', bg: 'bg-amber-600', icon: '⚡' },
  { id: 'avatar-6', label: 'Bình Yên Nội Tại', bg: 'bg-rose-500', icon: '🌸' },
];

// Khởi tạo một số tài khoản mẫu sẵn để người dùng có thể thử ngay không cần gõ dài dòng
const DEMO_USERS: Record<string, UserAccount> = {
  'demo@bookmind.vn': {
    id: 'u-demo-01',
    email: 'demo@bookmind.vn',
    name: 'Độc Giả Trải Nghiệm',
    role: 'user',
    avatar: 'avatar-1',
    bio: 'Đam mê đọc sách phát triển bản thân, công nghệ AI và tâm lý học ứng dụng.',
    favoriteGenres: ['Kỹ năng & Phát triển bản thân', 'Công nghệ & Trí tuệ nhân tạo', 'Tâm lý & Chữa lành'],
    preferredStyle: 'realistic',
    createdAt: '2026-11-10T08:00:00.000Z',
    passwordHash: simpleHash('123456'),
    favorites: [],
    ratings: {
      'ds-atomic-habits': 5,
      'ds-deep-work': 5,
      'ds-ai-2041': 5,
    },
    notes: {
      'ds-atomic-habits': {
        bookId: 'ds-atomic-habits',
        bookTitle: 'Thói Quen Nguyên Tử',
        content: 'Tập trung vào hệ thống 1% mỗi ngày thay vì chỉ mơ mộng về mục tiêu xa vời.',
        updatedAt: '2026-11-11T14:20:00.000Z',
      },
    },
    history: [
      {
        bookId: 'ds-atomic-habits',
        bookTitle: 'Thói Quen Nguyên Tử',
        bookAuthor: 'James Clear',
        genre: 'Kỹ năng & Phát triển bản thân',
        viewedAt: '2026-11-12T19:30:00.000Z',
      },
    ],
  },
  'admin@bookmind.vn': {
    id: 'u-admin-01',
    email: 'admin@bookmind.vn',
    name: 'Quản Trị Viên (Giảng Viên)',
    role: 'admin',
    avatar: 'avatar-2',
    bio: 'Tài khoản quản trị viên & kiểm thử mô hình gợi ý AI phục vụ đồ án.',
    favoriteGenres: ['Công nghệ & Trí tuệ nhân tạo', 'Kỹ năng & Phát triển bản thân'],
    preferredStyle: 'realistic',
    createdAt: '2026-11-10T08:00:00.000Z',
    passwordHash: simpleHash('admin123'),
    favorites: [],
    ratings: {},
    notes: {},
    history: [],
  },
  'tamly@bookmind.vn': {
    id: 'u-tamly-01',
    email: 'tamly@bookmind.vn',
    name: 'Minh Tâm Lý',
    role: 'user',
    avatar: 'avatar-6',
    bio: 'Yêu thích sách chữa lành tâm hồn, tâm lý học ứng dụng, thiền định và văn học sâu sắc.',
    favoriteGenres: ['Tâm lý & Chữa lành', 'Tư duy & Tâm lý học', 'Văn học & Triết lý sống', 'Tâm lý & Xã hội'],
    preferredStyle: 'subtle',
    createdAt: '2026-11-05T08:00:00.000Z',
    passwordHash: simpleHash('123456'),
    favorites: pickSeedBooks([
      'ds-hieu-ve-trai-tim',
      'ds-lam-nhu-choi',
      'ds-can-bang-cam-xuc',
      'ds-dai-duong-den',
      'ds-thinking-fast-slow',
      'ds-nha-gia-kim',
      'ds-nguoi-dua-dieu',
      'ds-mat-biec',
    ]),
    ratings: {
      'ds-hieu-ve-trai-tim': 5,
      'ds-lam-nhu-choi': 5,
      'ds-can-bang-cam-xuc': 5,
      'ds-dai-duong-den': 5,
      'ds-thinking-fast-slow': 4,
      'ds-nha-gia-kim': 5,
      'ds-nguoi-dua-dieu': 5,
      'ds-mat-biec': 4,
      'ds-dung-viec': 4,
      'ds-nguyen-ly-80-20': 2,
      'ds-nguoi-giau-co-nhat-babylon': 2,
    },
    notes: {
      'ds-hieu-ve-trai-tim': {
        bookId: 'ds-hieu-ve-trai-tim',
        bookTitle: 'Hiểu Về Trái Tim',
        content: 'Nhận diện cảm xúc giận dữ và khổ đau để chuyển hóa thành bình an nội tại.',
        updatedAt: '2026-11-15T10:15:00.000Z',
      },
      'ds-can-bang-cam-xuc': {
        bookId: 'ds-can-bang-cam-xuc',
        bookTitle: 'Cân Bằng Cảm Xúc, Cả Lúc Bão Giông',
        content: 'Học cách giữ tâm vững vàng trước áp lực công việc và các biến cố bất ngờ.',
        updatedAt: '2026-11-14T20:00:00.000Z',
      },
      'ds-lam-nhu-choi': {
        bookId: 'ds-lam-nhu-choi',
        bookTitle: 'Làm Như Chơi',
        content: 'Làm việc hết mình nhưng tâm thế nhẹ nhàng, không dính mắc vào kết quả.',
        updatedAt: '2026-11-14T09:30:00.000Z',
      },
      'ds-dai-duong-den': {
        bookId: 'ds-dai-duong-den',
        bookTitle: 'Đại Dương Đen: Những Câu Chuyện Từ Thế Giới Của Người Trầm Cảm',
        content: 'Sự lắng nghe không phán xét là liều thuốc quý giá nhất với người đang tổn thương.',
        updatedAt: '2026-11-13T16:40:00.000Z',
      },
      'ds-nha-gia-kim': {
        bookId: 'ds-nha-gia-kim',
        bookTitle: 'Nhà Giả Kim',
        content: 'Khi ta thực sự khao khát điều gì, cả vũ trụ sẽ hợp lực giúp ta đạt được.',
        updatedAt: '2026-11-12T21:10:00.000Z',
      },
      'ds-nguoi-dua-dieu': {
        bookId: 'ds-nguoi-dua-dieu',
        bookTitle: 'Người Đua Diều',
        content: 'Câu chuyện day dứt về tình bạn, sự chuộc lỗi và sức mạnh của lòng trắc ẩn.',
        updatedAt: '2026-11-11T19:00:00.000Z',
      },
    },
    history: [
      {
        bookId: 'ds-hieu-ve-trai-tim',
        bookTitle: 'Hiểu Về Trái Tim',
        bookAuthor: 'Minh Niệm',
        genre: 'Tâm lý & Chữa lành',
        viewedAt: '2026-11-16T09:30:00.000Z',
      },
      {
        bookId: 'ds-lam-nhu-choi',
        bookTitle: 'Làm Như Chơi',
        bookAuthor: 'Minh Niệm',
        genre: 'Tâm lý & Chữa lành',
        viewedAt: '2026-11-15T21:15:00.000Z',
      },
      {
        bookId: 'ds-can-bang-cam-xuc',
        bookTitle: 'Cân Bằng Cảm Xúc, Cả Lúc Bão Giông',
        bookAuthor: 'Richard Nicholls',
        genre: 'Tâm lý & Chữa lành',
        viewedAt: '2026-11-15T15:30:00.000Z',
      },
      {
        bookId: 'ds-dai-duong-den',
        bookTitle: 'Đại Dương Đen: Những Câu Chuyện Từ Thế Giới Của Người Trầm Cảm',
        bookAuthor: 'Đặng Hoàng Giang',
        genre: 'Tâm lý & Xã hội',
        viewedAt: '2026-11-14T18:45:00.000Z',
      },
      {
        bookId: 'ds-thinking-fast-slow',
        bookTitle: 'Tư Duy Nhanh Và Chậm',
        bookAuthor: 'Daniel Kahneman',
        genre: 'Tư duy & Tâm lý học',
        viewedAt: '2026-11-14T11:20:00.000Z',
      },
      {
        bookId: 'ds-nha-gia-kim',
        bookTitle: 'Nhà Giả Kim',
        bookAuthor: 'Paulo Coelho',
        genre: 'Văn học & Triết lý sống',
        viewedAt: '2026-11-13T20:10:00.000Z',
      },
      {
        bookId: 'ds-nguoi-dua-dieu',
        bookTitle: 'Người Đua Diều',
        bookAuthor: 'Khaled Hosseini',
        genre: 'Văn học & Tiểu thuyết',
        viewedAt: '2026-11-12T17:05:00.000Z',
      },
      {
        bookId: 'ds-mat-biec',
        bookTitle: 'Mắt Biếc',
        bookAuthor: 'Nguyễn Nhật Ánh',
        genre: 'Văn học Việt Nam',
        viewedAt: '2026-11-11T14:50:00.000Z',
      },
    ],
  },
  'congnghe@bookmind.vn': {
    id: 'u-congnghe-01',
    email: 'congnghe@bookmind.vn',
    name: 'Hùng Công Nghệ',
    role: 'user',
    avatar: 'avatar-3',
    bio: 'Kỹ sư phần mềm quan tâm sâu về AI, kiến trúc hệ thống, khởi nghiệp công nghệ và tài chính.',
    favoriteGenres: ['Công nghệ & Trí tuệ nhân tạo', 'Công nghệ & Kỹ thuật phần mềm', 'Kinh doanh & Công nghệ', 'Kinh doanh & Tài chính'],
    preferredStyle: 'realistic',
    createdAt: '2026-11-05T08:30:00.000Z',
    passwordHash: simpleHash('123456'),
    favorites: pickSeedBooks([
      'ds-ai-2041',
      'ds-clean-code',
      'ds-data-science-business',
      'ds-nexus-harari',
      'ds-zero-to-one',
      'ds-lean-startup',
      'ds-psychology-of-money',
      'ds-deep-work',
    ]),
    ratings: {
      'ds-ai-2041': 5,
      'ds-clean-code': 5,
      'ds-data-science-business': 5,
      'ds-nexus-harari': 5,
      'ds-zero-to-one': 5,
      'ds-lean-startup': 4,
      'ds-psychology-of-money': 5,
      'ds-deep-work': 5,
      'ds-nguyen-ly-80-20': 4,
      'ds-nghe-thuat-tu-duy-ranh-mach': 4,
      'ds-mat-biec': 2,
      'ds-lam-nhu-choi': 2,
    },
    notes: {
      'ds-ai-2041': {
        bookId: 'ds-ai-2041',
        bookTitle: 'AI 2041: 10 Viễn Cảnh Cho Tương Lai',
        content: 'Góc nhìn thực tế về cách Deep Learning và AI thay đổi thị trường lao động & y tế.',
        updatedAt: '2026-11-16T08:30:00.000Z',
      },
      'ds-clean-code': {
        bookId: 'ds-clean-code',
        bookTitle: 'Clean Code: Mã Sạch Và Con Đường Trở Thành Lập Trình Viên Giỏi',
        content: 'Code được đọc nhiều hơn viết — đặt tên biến rõ ràng và hàm ngắn gọn đơn nhiệm.',
        updatedAt: '2026-11-15T11:20:00.000Z',
      },
      'ds-data-science-business': {
        bookId: 'ds-data-science-business',
        bookTitle: 'Khoa Học Dữ Liệu Trong Kinh Doanh',
        content: 'Biến dữ liệu hành vi thành lợi thế cạnh tranh thông qua mô hình phân loại và dự đoán.',
        updatedAt: '2026-11-14T22:15:00.000Z',
      },
      'ds-zero-to-one': {
        bookId: 'ds-zero-to-one',
        bookTitle: 'Không Đến Một (Zero to One)',
        content: 'Cạnh tranh giết chết lợi nhuận; startup công nghệ cần tạo ra giá trị độc quyền mới từ 0 đến 1.',
        updatedAt: '2026-11-13T19:45:00.000Z',
      },
      'ds-deep-work': {
        bookId: 'ds-deep-work',
        bookTitle: 'Làm Ra Làm, Chơi Ra Chơi (Deep Work)',
        content: 'Tắt thông báo, dành 2-3 giờ tập trung sâu mỗi sáng để giải quyết bài toán kiến trúc khó.',
        updatedAt: '2026-11-12T15:00:00.000Z',
      },
      'ds-psychology-of-money': {
        bookId: 'ds-psychology-of-money',
        bookTitle: 'Tâm Lý Học Về Tiền',
        content: 'Lãi kép và biên độ an toàn quan trọng hơn việc đoán đỉnh đáy ngắn hạn.',
        updatedAt: '2026-11-11T10:30:00.000Z',
      },
    },
    history: [
      {
        bookId: 'ds-ai-2041',
        bookTitle: 'AI 2041: 10 Viễn Cảnh Cho Tương Lai',
        bookAuthor: 'Kai-Fu Lee, Chen Qiufan',
        genre: 'Công nghệ & Trí tuệ nhân tạo',
        viewedAt: '2026-11-16T10:00:00.000Z',
      },
      {
        bookId: 'ds-clean-code',
        bookTitle: 'Clean Code: Mã Sạch Và Con Đường Trở Thành Lập Trình Viên Giỏi',
        bookAuthor: 'Robert C. Martin',
        genre: 'Công nghệ & Kỹ thuật phần mềm',
        viewedAt: '2026-11-15T19:10:00.000Z',
      },
      {
        bookId: 'ds-data-science-business',
        bookTitle: 'Khoa Học Dữ Liệu Trong Kinh Doanh',
        bookAuthor: 'Foster Provost, Tom Fawcett',
        genre: 'Công nghệ & Trí tuệ nhân tạo',
        viewedAt: '2026-11-15T14:20:00.000Z',
      },
      {
        bookId: 'ds-nexus-harari',
        bookTitle: 'Nexus: Lược Sử Của Những Mạng Lưới Thông Tin Từ Thời Đồ Đá Đến AI',
        bookAuthor: 'Yuval Noah Harari',
        genre: 'Công nghệ & Triết học',
        viewedAt: '2026-11-14T21:00:00.000Z',
      },
      {
        bookId: 'ds-zero-to-one',
        bookTitle: 'Không Đến Một (Zero to One)',
        bookAuthor: 'Peter Thiel, Blake Masters',
        genre: 'Kinh doanh & Công nghệ',
        viewedAt: '2026-11-14T11:30:00.000Z',
      },
      {
        bookId: 'ds-lean-startup',
        bookTitle: 'Khởi Nghiệp Tinh Gọn',
        bookAuthor: 'Eric Ries',
        genre: 'Kinh doanh & Khởi nghiệp',
        viewedAt: '2026-11-13T16:40:00.000Z',
      },
      {
        bookId: 'ds-psychology-of-money',
        bookTitle: 'Tâm Lý Học Về Tiền',
        bookAuthor: 'Morgan Housel',
        genre: 'Kinh doanh & Tài chính',
        viewedAt: '2026-11-12T09:15:00.000Z',
      },
      {
        bookId: 'ds-deep-work',
        bookTitle: 'Làm Ra Làm, Chơi Ra Chơi (Deep Work)',
        bookAuthor: 'Cal Newport',
        genre: 'Kỹ năng & Hiệu suất',
        viewedAt: '2026-11-11T17:50:00.000Z',
      },
    ],
  },
  'taichinh@bookmind.vn': {
    id: 'u-taichinh-01',
    email: 'taichinh@bookmind.vn',
    name: 'Hoàng Đầu Tư',
    role: 'user',
    avatar: 'avatar-5',
    bio: 'Nhà đầu tư cá nhân, nghiên cứu quản trị dòng tiền, phân tích báo cáo tài chính và đầu tư cổ phiếu giá trị.',
    favoriteGenres: ['Kinh doanh & Tài chính', 'Đầu tư & Chứng khoán', 'Kinh tế học', 'Khởi nghiệp & Quản trị'],
    preferredStyle: 'realistic',
    createdAt: '2026-11-05T09:00:00.000Z',
    passwordHash: simpleHash('123456'),
    favorites: pickSeedBooks([
      'ds-psychology-of-money',
      'ds-nguoi-giau-co-nhat-babylon',
      'ds-mot-doi-quan-tri',
      'ds-nguyen-ly-80-20',
      'ds-lean-startup',
      'ds-zero-to-one',
      'ds-thinking-fast-slow',
    ]),
    ratings: {
      'ds-psychology-of-money': 5,
      'ds-nguoi-giau-co-nhat-babylon': 5,
      'ds-mot-doi-quan-tri': 5,
      'ds-nguyen-ly-80-20': 5,
      'ds-lean-startup': 4,
      'ds-zero-to-one': 4,
      'ds-thinking-fast-slow': 4,
      'ds-mat-biec': 2,
      'ds-hieu-ve-trai-tim': 2,
    },
    notes: {
      'ds-psychology-of-money': {
        bookId: 'ds-psychology-of-money',
        bookTitle: 'Tâm Lý Học Về Tiền',
        content: 'Tự do tài chính không phải là kiếm thật nhiều tiền để phô trương, mà là quyền năng kiểm soát thời gian của chính mình.',
        updatedAt: '2026-11-16T14:30:00.000Z',
      },
      'ds-nguoi-giau-co-nhat-babylon': {
        bookId: 'ds-nguoi-giau-co-nhat-babylon',
        bookTitle: 'Người Giàu Có Nhất Thành Babylon',
        content: 'Trả cho bản thân trước tiên ít nhất 10% tổng thu nhập và để số tiền đó sinh sôi theo lãi kép.',
        updatedAt: '2026-11-15T09:10:00.000Z',
      },
      'ds-mot-doi-quan-tri': {
        bookId: 'ds-mot-doi-quan-tri',
        bookTitle: 'Một Đời Quản Trị',
        content: 'Quản trị là đưa con người cùng hướng về một mục đích chung với lòng chân thành và kỷ luật.',
        updatedAt: '2026-11-14T20:45:00.000Z',
      },
    },
    history: [
      {
        bookId: 'ds-psychology-of-money',
        bookTitle: 'Tâm Lý Học Về Tiền',
        bookAuthor: 'Morgan Housel',
        genre: 'Kinh doanh & Tài chính',
        viewedAt: '2026-11-16T15:00:00.000Z',
      },
      {
        bookId: 'ds-nguoi-giau-co-nhat-babylon',
        bookTitle: 'Người Giàu Có Nhất Thành Babylon',
        bookAuthor: 'George S. Clason',
        genre: 'Kinh doanh & Tài chính',
        viewedAt: '2026-11-15T10:00:00.000Z',
      },
      {
        bookId: 'ds-mot-doi-quan-tri',
        bookTitle: 'Một Đời Quản Trị',
        bookAuthor: 'Phan Văn Trường',
        genre: 'Kinh doanh & Quản trị',
        viewedAt: '2026-11-14T21:00:00.000Z',
      },
      {
        bookId: 'ds-nguyen-ly-80-20',
        bookTitle: 'Nguyên Lý 80/20: Bí Quyết Đạt Được Nhiều Hơn Với Ít Hơn',
        bookAuthor: 'Richard Koch',
        genre: 'Kinh doanh & Năng suất',
        viewedAt: '2026-11-13T18:20:00.000Z',
      },
      {
        bookId: 'ds-lean-startup',
        bookTitle: 'Khởi Nghiệp Tinh Gọn',
        bookAuthor: 'Eric Ries',
        genre: 'Kinh doanh & Khởi nghiệp',
        viewedAt: '2026-11-12T11:40:00.000Z',
      },
    ],
  },
};

export class AuthService {
  private static loadUsers(): Record<string, UserAccount> {
    if (typeof window === 'undefined') return { ...DEMO_USERS };
    try {
      const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
      if (!raw) {
        window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEMO_USERS));
        return { ...DEMO_USERS };
      }
      const parsed = JSON.parse(raw);
      // Đảm bảo các tài khoản mẫu hệ thống luôn được cập nhật phiên bản mới nhất (không bị cache cũ đè)
      return { ...parsed, ...DEMO_USERS };
    } catch {
      return { ...DEMO_USERS };
    }
  }

  private static saveUsers(users: Record<string, UserAccount>): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn('Lỗi lưu trữ danh sách người dùng:', e);
    }
  }

  public static getAllUsers(): UserAccount[] {
    return Object.values(this.loadUsers());
  }

  public static getCurrentSession(): UserAccount | null {
    if (typeof window === 'undefined') return null;
    try {
      const email =
        window.localStorage.getItem(SESSION_STORAGE_KEY) ||
        window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!email) return null;
      const users = this.loadUsers();
      return users[email.toLowerCase()] || null;
    } catch {
      return null;
    }
  }

  public static getRememberedEmail(): string {
    if (typeof window === 'undefined') return '';
    try {
      return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  }

  public static setSession(email: string | null, remember = true): void {
    if (typeof window === 'undefined') return;
    if (email) {
      const cleanEmail = email.toLowerCase();
      if (remember) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, cleanEmail);
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, cleanEmail);
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }

  public static register(
    email: string,
    password: string,
    name: string,
    avatar = 'avatar-1'
  ): { success: boolean; user?: UserAccount; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Email không hợp lệ.' };
    }
    if (!password || password.length < 6) {
      return { success: false, error: 'Mật khẩu phải từ 6 ký tự trở lên.' };
    }
    if (!name.trim()) {
      return { success: false, error: 'Vui lòng nhập họ và tên của bạn.' };
    }

    const users = this.loadUsers();
    if (users[cleanEmail]) {
      return { success: false, error: 'Email này đã được đăng ký tài khoản.' };
    }

    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      name: name.trim(),
      avatar: avatar || 'avatar-1',
      bio: 'Người yêu sách và khám phá tri thức.',
      favoriteGenres: ['Kỹ năng & Phát triển bản thân', 'Kinh doanh & Tài chính'],
      preferredStyle: 'realistic',
      createdAt: new Date().toISOString(),
      passwordHash: simpleHash(password),
      favorites: [],
      ratings: {},
      notes: {},
      history: [],
    };

    users[cleanEmail] = newUser;
    this.saveUsers(users);
    this.setSession(cleanEmail);

    return { success: true, user: newUser };
  }

  public static login(
    email: string,
    password: string,
    remember = true
  ): { success: boolean; user?: UserAccount; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const users = this.loadUsers();
    const user = users[cleanEmail];

    if (!user) {
      return { success: false, error: 'Tài khoản không tồn tại. Bạn hãy bấm "Đăng ký" nhé!' };
    }

    if (user.passwordHash !== simpleHash(password)) {
      return { success: false, error: 'Mật khẩu không chính xác. Vui lòng thử lại.' };
    }

    this.setSession(cleanEmail, remember);
    return { success: true, user };
  }

  public static logout(): void {
    this.setSession(null);
  }

  public static changePassword(
    userId: string,
    oldPass: string,
    newPass: string
  ): { success: boolean; error?: string } {
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải từ 6 ký tự trở lên.' };
    }
    const users = this.loadUsers();
    const emailKey = Object.keys(users).find((k) => users[k].id === userId);
    if (!emailKey) return { success: false, error: 'Không tìm thấy người dùng.' };

    const user = users[emailKey];
    if (user.passwordHash !== simpleHash(oldPass)) {
      return { success: false, error: 'Mật khẩu hiện tại không đúng.' };
    }

    user.passwordHash = simpleHash(newPass);
    users[emailKey] = user;
    this.saveUsers(users);
    return { success: true };
  }

  public static resetPassword(
    email: string,
    newPass: string
  ): { success: boolean; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải từ 6 ký tự trở lên.' };
    }
    const users = this.loadUsers();
    const user = users[cleanEmail];
    if (!user) {
      return { success: false, error: 'Email này chưa được đăng ký trong hệ thống.' };
    }

    user.passwordHash = simpleHash(newPass);
    users[cleanEmail] = user;
    this.saveUsers(users);
    return { success: true };
  }

  public static updateProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): UserAccount | null {
    const users = this.loadUsers();
    const emailKey = Object.keys(users).find((k) => users[k].id === userId);
    if (!emailKey) return null;

    const current = users[emailKey];
    const updated: UserAccount = {
      ...current,
      ...updates,
      id: current.id,
      email: current.email, // email không được đổi
    };

    users[emailKey] = updated;
    this.saveUsers(users);
    return updated;
  }

  public static toggleFavorite(userId: string, book: Book): { user: UserAccount; isAdded: boolean } | null {
    const users = this.loadUsers();
    const emailKey = Object.keys(users).find((k) => users[k].id === userId);
    if (!emailKey) return null;

    const user = users[emailKey];
    const exists = user.favorites.some((b) => b.id === book.id);
    let newFavorites: Book[];
    let isAdded = false;

    if (exists) {
      newFavorites = user.favorites.filter((b) => b.id !== book.id);
    } else {
      newFavorites = [...user.favorites, book];
      isAdded = true;
    }

    user.favorites = newFavorites;
    users[emailKey] = user;
    this.saveUsers(users);
    return { user, isAdded };
  }

  public static rateBook(userId: string, bookId: string, rating: number): UserAccount | null {
    const users = this.loadUsers();
    const emailKey = Object.keys(users).find((k) => users[k].id === userId);
    if (!emailKey) return null;

    const user = users[emailKey];
    user.ratings = {
      ...user.ratings,
      [bookId]: Math.max(1, Math.min(5, rating)),
    };

    users[emailKey] = user;
    this.saveUsers(users);
    return user;
  }

  public static saveNote(
    userId: string,
    bookId: string,
    bookTitle: string,
    content: string
  ): UserAccount | null {
    const users = this.loadUsers();
    const emailKey = Object.keys(users).find((k) => users[k].id === userId);
    if (!emailKey) return null;

    const user = users[emailKey];
    const trimmed = content.trim();

    if (!trimmed) {
      delete user.notes[bookId];
    } else {
      user.notes[bookId] = {
        bookId,
        bookTitle,
        content: trimmed,
        updatedAt: new Date().toISOString(),
      };
    }

    users[emailKey] = user;
    this.saveUsers(users);
    return user;
  }

  public static deleteNote(userId: string, bookId: string): UserAccount | null {
    const users = this.loadUsers();
    const emailKey = Object.keys(users).find((k) => users[k].id === userId);
    if (!emailKey) return null;

    const user = users[emailKey];
    delete user.notes[bookId];
    users[emailKey] = user;
    this.saveUsers(users);
    return user;
  }

  public static addReadingHistory(userId: string, book: Book): UserAccount | null {
    const users = this.loadUsers();
    const emailKey = Object.keys(users).find((k) => users[k].id === userId);
    if (!emailKey) return null;

    const user = users[emailKey];
    const history = user.history || [];
    // Loại bỏ mục cũ nếu đã xem trước đó để đẩy lên đầu
    const filtered = history.filter((h) => h.bookId !== book.id);
    const newEntry: ReadingHistoryItem = {
      bookId: book.id,
      bookTitle: book.title,
      bookAuthor: book.author,
      genre: book.genre,
      coverUrl: book.coverUrl,
      viewedAt: new Date().toISOString(),
    };

    user.history = [newEntry, ...filtered].slice(0, 50); // Lưu tối đa 50 cuốn gần nhất
    users[emailKey] = user;
    this.saveUsers(users);
    return user;
  }

  public static clearHistory(userId: string): UserAccount | null {
    const users = this.loadUsers();
    const emailKey = Object.keys(users).find((k) => users[k].id === userId);
    if (!emailKey) return null;

    const user = users[emailKey];
    user.history = [];
    users[emailKey] = user;
    this.saveUsers(users);
    return user;
  }
}
