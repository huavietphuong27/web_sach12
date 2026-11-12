import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserAccount, UserProfile } from '../types/auth';
import { Book } from '../types/book';
import { AuthService } from '../services/authService';

interface AuthContextType {
  currentUser: UserAccount | null;
  isAuthenticated: boolean;
  favorites: Book[];
  isFavorite: (bookId: string) => boolean;
  toggleFavorite: (book: Book) => void;
  rateBook: (bookId: string, rating: number) => void;
  saveBookNote: (bookId: string, bookTitle: string, content: string) => void;
  deleteBookNote: (bookId: string) => void;
  addReadingHistory: (book: Book) => void;
  clearHistory: () => void;
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (email: string, password: string, name: string, avatar?: string) => { success: boolean; error?: string };
  changePassword: (oldPass: string, newPass: string) => { success: boolean; error?: string };
  resetPassword: (email: string, newPass: string) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  // Modal controls
  isAuthModalOpen: boolean;
  authModalMode: 'login' | 'register';
  openAuthModal: (mode?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_FAVORITES_KEY = 'websach-favorites-v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => AuthService.getCurrentSession());
  const [guestFavorites, setGuestFavorites] = useState<Book[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(GUEST_FAVORITES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Đồng bộ session user
  useEffect(() => {
    const sessionUser = AuthService.getCurrentSession();
    setCurrentUser(sessionUser);
  }, []);

  // Lưu guest favorites khi chưa đăng nhập
  useEffect(() => {
    if (!currentUser && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(guestFavorites));
      } catch {
        // ignore
      }
    }
  }, [guestFavorites, currentUser]);

  const favorites = currentUser ? currentUser.favorites : guestFavorites;

  const isFavorite = useCallback(
    (bookId: string) => favorites.some((b) => b.id === bookId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    (book: Book) => {
      if (currentUser) {
        const res = AuthService.toggleFavorite(currentUser.id, book);
        if (res) setCurrentUser(res.user);
      } else {
        setGuestFavorites((prev) =>
          prev.some((b) => b.id === book.id)
            ? prev.filter((b) => b.id !== book.id)
            : [...prev, book]
        );
      }
    },
    [currentUser]
  );

  const rateBook = useCallback(
    (bookId: string, rating: number) => {
      if (!currentUser) {
        setIsAuthModalOpen(true);
        return;
      }
      const updated = AuthService.rateBook(currentUser.id, bookId, rating);
      if (updated) setCurrentUser(updated);
    },
    [currentUser]
  );

  const saveBookNote = useCallback(
    (bookId: string, bookTitle: string, content: string) => {
      if (!currentUser) {
        setIsAuthModalOpen(true);
        return;
      }
      const updated = AuthService.saveNote(currentUser.id, bookId, bookTitle, content);
      if (updated) setCurrentUser(updated);
    },
    [currentUser]
  );

  const deleteBookNote = useCallback(
    (bookId: string) => {
      if (!currentUser) return;
      const updated = AuthService.deleteNote(currentUser.id, bookId);
      if (updated) setCurrentUser(updated);
    },
    [currentUser]
  );

  const addReadingHistory = useCallback(
    (book: Book) => {
      if (!currentUser) return;
      const updated = AuthService.addReadingHistory(currentUser.id, book);
      if (updated) setCurrentUser(updated);
    },
    [currentUser]
  );

  const clearHistory = useCallback(() => {
    if (!currentUser) return;
    const updated = AuthService.clearHistory(currentUser.id);
    if (updated) setCurrentUser(updated);
  }, [currentUser]);

  const login = useCallback(
    (email: string, pass: string) => {
      const res = AuthService.login(email, pass);
      if (res.success && res.user) {
        // Tự động gộp guestFavorites vào tài khoản nếu user chưa có
        if (guestFavorites.length > 0) {
          const existingIds = new Set(res.user.favorites.map((b) => b.id));
          const toAdd = guestFavorites.filter((b) => !existingIds.has(b.id));
          if (toAdd.length > 0) {
            toAdd.forEach((b) => AuthService.toggleFavorite(res.user!.id, b));
            const refreshed = AuthService.getCurrentSession();
            if (refreshed) {
              setCurrentUser(refreshed);
              setGuestFavorites([]);
              setIsAuthModalOpen(false);
              return { success: true };
            }
          }
        }
        setCurrentUser(res.user);
        setIsAuthModalOpen(false);
      }
      return res;
    },
    [guestFavorites]
  );

  const register = useCallback(
    (email: string, pass: string, name: string, avatar?: string) => {
      const res = AuthService.register(email, pass, name, avatar);
      if (res.success && res.user) {
        // Gộp guest favorites nếu có
        if (guestFavorites.length > 0) {
          guestFavorites.forEach((b) => AuthService.toggleFavorite(res.user!.id, b));
          const refreshed = AuthService.getCurrentSession();
          if (refreshed) {
            setCurrentUser(refreshed);
            setGuestFavorites([]);
            setIsAuthModalOpen(false);
            return { success: true };
          }
        }
        setCurrentUser(res.user);
        setIsAuthModalOpen(false);
      }
      return res;
    },
    [guestFavorites]
  );

  const changePassword = useCallback(
    (oldPass: string, newPass: string) => {
      if (!currentUser) return { success: false, error: 'Chưa đăng nhập.' };
      return AuthService.changePassword(currentUser.id, oldPass, newPass);
    },
    [currentUser]
  );

  const resetPassword = useCallback((email: string, newPass: string) => {
    return AuthService.resetPassword(email, newPass);
  }, []);

  const logout = useCallback(() => {
    AuthService.logout();
    setCurrentUser(null);
    setIsProfileModalOpen(false);
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      if (!currentUser) return;
      const updated = AuthService.updateProfile(currentUser.id, updates);
      if (updated) setCurrentUser(updated);
    },
    [currentUser]
  );

  const openAuthModal = useCallback((mode: 'login' | 'register' = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const openProfileModal = useCallback(() => {
    setIsProfileModalOpen(true);
  }, []);

  const closeProfileModal = useCallback(() => {
    setIsProfileModalOpen(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        favorites,
        isFavorite,
        toggleFavorite,
        rateBook,
        saveBookNote,
        deleteBookNote,
        addReadingHistory,
        clearHistory,
        login,
        register,
        changePassword,
        resetPassword,
        logout,
        updateProfile,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
