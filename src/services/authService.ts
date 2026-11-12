import { UserAccount, UserProfile, ReadingHistoryItem, UserNote } from '../types/auth';
import { Book } from '../types/book';

const USERS_STORAGE_KEY = 'websach-users-v2';
const SESSION_STORAGE_KEY = 'websach-current-session-v2';

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
      return JSON.parse(raw);
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

  public static getCurrentSession(): UserAccount | null {
    if (typeof window === 'undefined') return null;
    try {
      const email = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (!email) return null;
      const users = this.loadUsers();
      return users[email.toLowerCase()] || null;
    } catch {
      return null;
    }
  }

  public static setSession(email: string | null): void {
    if (typeof window === 'undefined') return;
    if (email) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, email.toLowerCase());
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
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
    password: string
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

    this.setSession(cleanEmail);
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
