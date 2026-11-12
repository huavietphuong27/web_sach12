import { useState, useEffect, useRef, useCallback } from 'react';
import { Book, ReadingGoal, QuickFilterTag } from './types/book';
import { FALLBACK_BOOKS } from './data/content';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { GoalFinderView } from './views/GoalFinderView';
import { LibraryView } from './views/LibraryView';
import { ExploreView } from './views/ExploreView';
import { AboutView } from './views/AboutView';
import { AdvisorView } from './views/AdvisorView';
import { BookDetailView } from './views/BookDetailView';
import { AuthView } from './views/AuthView';
import {
  AdvisorBook,
  advisorBookToBook,
  fetchBookById,
  fetchManyVietnameseBooks,
  deduplicateAndMergeBooks,
} from './services/googleBooks';
import { FloatingChat } from './components/FloatingChat';
import { FavoritesModal } from './views/FavoritesModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';

function MainApp() {
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [liveBooks, setLiveBooks] = useState<Book[]>(FALLBACK_BOOKS);
  const lastFetchRef = useRef(0);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);

  const { favorites, isFavorite, toggleFavorite } = useAuth();

  const CACHE_KEY = 'websach-google-books-live-v2';
  const readCache = (): { t: number; books: Book[] } | null => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { t: number; books: Book[] };
      return Array.isArray(parsed?.books) && parsed.books.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  };
  const writeCache = (books: Book[]) => {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), books }));
    } catch {
      /* bộ nhớ đầy: bỏ qua */
    }
  };

  // Nạp thêm dữ liệu sách mới vào kho dữ liệu toàn cục và lưu cache
  const handleAppendBooks = useCallback((addedBooks: Book[]): number => {
    if (!addedBooks || addedBooks.length === 0) return 0;
    let newlyAddedCount = 0;
    setLiveBooks((prev) => {
      const merged = deduplicateAndMergeBooks(prev, addedBooks);
      newlyAddedCount = Math.max(0, merged.length - prev.length);
      writeCache(merged);
      return merged;
    });
    return newlyAddedCount;
  }, []);

  // Lấy sách từ Google Books API kết hợp danh sách Dataset chuẩn
  const refreshBooks = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 30_000) return;
    lastFetchRef.current = now;
    try {
      const books = await fetchManyVietnameseBooks();
      if (books.length > 0) {
        setLiveBooks((prev) => {
          const merged = deduplicateAndMergeBooks(prev, books);
          writeCache(merged);
          return merged;
        });
      }
    } catch {
      /* giữ danh sách hiện có */
    }
  }, []);

  useEffect(() => {
    const cached = readCache();
    if (cached && cached.books.length) {
      setLiveBooks(deduplicateAndMergeBooks(FALLBACK_BOOKS, cached.books));
    }
    refreshBooks(true);
  }, [refreshBooks]);

  useEffect(() => {
    if (currentRoute === 'catalog') refreshBooks();
  }, [currentRoute, refreshBooks]);

  const allBooks = liveBooks;
  const [selectedGoal, setSelectedGoal] = useState<ReadingGoal | null>(null);
  const [quickQuery, setQuickQuery] = useState<string>('');
  const [activeTagFilter, setActiveTagFilter] = useState<QuickFilterTag | null>(null);
  const [previousRoute, setPreviousRoute] = useState<string>('home');
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState<boolean>(false);

  // Handle URL hash routing if present
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (!hash) {
        setCurrentRoute('home');
        return;
      }
      if (['home', 'goal', 'catalog', 'explore', 'about', 'advisor', 'auth', 'profile'].includes(hash)) {
        setCurrentRoute(hash === 'profile' ? 'auth' : hash);
      } else if (hash.startsWith('book-') || hash.startsWith('detail-')) {
        const prefixLen = hash.startsWith('detail-') ? 7 : 5;
        const bookId = decodeURIComponent(hash.slice(prefixLen));
        const found = liveBooks.find((b) => b.id === bookId);
        if (found) {
          setSelectedBook(found);
          setCurrentRoute('detail');
        } else {
          fetchBookById(bookId).then((fetched) => {
            if (fetched) {
              setSelectedBook(fetched);
              setCurrentRoute('detail');
            }
          });
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [liveBooks]);

  const navigateTo = (route: string) => {
    if (currentRoute !== 'detail') {
      setPreviousRoute(currentRoute);
    }
    setCurrentRoute(route);
    window.location.hash = route;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectBook = (book: Book) => {
    if (currentRoute !== 'detail') {
      setPreviousRoute(currentRoute);
    }
    setSelectedBook(book);
    setCurrentRoute('detail');
    window.location.hash = `detail-${encodeURIComponent(book.id)}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromDetail = () => {
    const target = previousRoute || 'catalog';
    setCurrentRoute(target);
    window.location.hash = target;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAdvisorBook = (book: AdvisorBook) => {
    handleSelectBook(advisorBookToBook(book));
  };

  const handleSelectGoal = (goal: ReadingGoal) => {
    setSelectedGoal(goal);
    setQuickQuery('');
    navigateTo('goal');
  };

  const handleQuickSearch = (query: string) => {
    setQuickQuery(query);
    setSelectedGoal(null);
    navigateTo('advisor');
  };

  const handleFilterByAttribute = (
    type: 'author' | 'publisher' | 'year',
    value: string | number
  ) => {
    let label = '';
    if (type === 'author') label = `Tác giả: ${value}`;
    else if (type === 'publisher') label = `Nhà xuất bản: ${value}`;
    else if (type === 'year') label = `Năm phát hành: ${value}`;

    setActiveTagFilter({
      type,
      value,
      label,
    });
    if (currentRoute !== 'detail') {
      setPreviousRoute(currentRoute);
    }
    setCurrentRoute('catalog');
    window.location.hash = 'catalog';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClearTagFilter = () => {
    setActiveTagFilter(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] font-sans">
      {/* Top Navigation Bar */}
      <Navbar
        currentRoute={currentRoute}
        onNavigate={(route) => {
          if (route === 'catalog') {
            setActiveTagFilter(null);
          }
          navigateTo(route);
        }}
        onOpenGoalFinder={() => navigateTo('advisor')}
        favoritesCount={favorites.length}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 animate-view-fade" key={currentRoute}>
        {currentRoute === 'home' && (
          <HomeView
            books={allBooks}
            onSelectBook={handleSelectBook}
            onNavigate={navigateTo}
            onSelectGoal={handleSelectGoal}
            onQuickSearch={handleQuickSearch}
            onFilterByAttribute={handleFilterByAttribute}
          />
        )}

        {currentRoute === 'goal' && (
          <GoalFinderView
            books={allBooks}
            onSelectBook={handleSelectBook}
            initialGoal={selectedGoal}
            initialQuery={quickQuery}
            onFilterByAttribute={handleFilterByAttribute}
            onAppendBooks={handleAppendBooks}
            favoriteBookIds={favorites.map((f) => f.id)}
          />
        )}

        {currentRoute === 'catalog' && (
          <LibraryView
            books={allBooks}
            onSelectBook={handleSelectBook}
            activeTagFilter={activeTagFilter}
            onFilterByAttribute={handleFilterByAttribute}
            onClearTagFilter={handleClearTagFilter}
          />
        )}

        {currentRoute === 'explore' && (
          <ExploreView onSelectBook={handleSelectBook} />
        )}

        {currentRoute === 'about' && <AboutView onNavigate={navigateTo} />}

        {currentRoute === 'advisor' && (
          <AdvisorView
            onOpenBook={handleOpenAdvisorBook}
            initialQuery={quickQuery}
            onConsumeQuery={() => setQuickQuery('')}
          />
        )}

        {currentRoute === 'auth' && (
          <AuthView
            allBooks={allBooks}
            onSelectBookById={(bookId) => {
              const b = allBooks.find((item) => item.id === bookId);
              if (b) {
                handleSelectBook(b);
              } else {
                fetchBookById(bookId).then((fetched) => {
                  if (fetched) handleSelectBook(fetched);
                });
              }
            }}
            onNavigateHome={() => navigateTo('home')}
          />
        )}

        {currentRoute === 'detail' && selectedBook && (
          <BookDetailView
            book={selectedBook}
            allBooks={allBooks}
            onBack={handleBackFromDetail}
            onSelectBook={handleSelectBook}
            onFilterByAttribute={handleFilterByAttribute}
            isFavorite={isFavorite(selectedBook.id)}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Floating Chat Bubble & Mini Drawer */}
      {currentRoute !== 'advisor' && (
        <FloatingChat
          books={allBooks}
          isOpen={isFloatingChatOpen}
          onToggle={() => setIsFloatingChatOpen((prev) => !prev)}
          onSelectBook={(book) => {
            handleSelectBook(book);
            setIsFloatingChatOpen(false);
          }}
          onOpenFullChat={() => {
            setIsFloatingChatOpen(false);
            navigateTo('advisor');
          }}
        />
      )}

      {/* Favorites Modal */}
      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onRemove={toggleFavorite}
        onViewDetail={(book) => {
          handleSelectBook(book);
          setIsFavoritesOpen(false);
        }}
      />

      {/* Authentication Modal (Đăng nhập / Đăng ký) */}
      <AuthModal />

      {/* User Profile & Data Management Modal (Lịch sử đọc, Ghi chú, Đánh giá, Xuất JSON) */}
      <UserProfileModal
        allBooks={allBooks}
        onSelectBookById={(bookId) => {
          const b = allBooks.find((item) => item.id === bookId);
          if (b) {
            handleSelectBook(b);
          } else {
            fetchBookById(bookId).then((fetched) => {
              if (fetched) handleSelectBook(fetched);
            });
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
