import { Book, BookStyle } from './book';

export interface UserRating {
  bookId: string;
  rating: number; // 1-5
  updatedAt: string;
}

export interface UserNote {
  bookId: string;
  bookTitle: string;
  content: string;
  updatedAt: string;
}

export interface ReadingHistoryItem {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  genre: string;
  coverUrl?: string;
  viewedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar: string; // avatar identifier or url
  bio?: string;
  preferredStyle?: BookStyle;
  favoriteGenres: string[];
  createdAt: string;
}

export interface UserAccount extends UserProfile {
  passwordHash: string; // encoded password for local simulation
  favorites: Book[];
  ratings: Record<string, number>; // bookId -> rating (1-5)
  notes: Record<string, UserNote>; // bookId -> note
  history: ReadingHistoryItem[];
}

export interface AuthState {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
