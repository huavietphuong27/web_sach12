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
import {
  AdvisorBook,
  advisorBookToBook,
  fetchBookById,
  fetchManyVietnameseBooks,
} from './services/googleBooks';
import { FloatingChat } from './components/FloatingChat';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('home');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [liveBooks, setLiveBooks] = useState<Book[]>(FALLBACK_BOOKS);
  const lastFetchRef = useRef(0);

  // Cache vào sessionStorage để lần mở sau hiện sách NGAY, không phải chờ API.
  const CACHE_KEY = 'websach-books-v3';
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

  // Lấy sách từ Google Books API kết hợp danh sách tuyển chọn dự phòng.
  const refreshBooks = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 30_000) return;
    lastFetchRef.current = now;
    try {
      const books = await fetchManyVietnameseBooks();
      if (books.length > 0) {
        setLiveBooks(books);
        writeCache(books);
      }
    } catch {
      /* giữ danh sách hiện có */
    }
  }, []);

  // Lần đầu mở web: hiện sách từ cache/dự phòng NGAY, đồng thời làm mới từ API (nền).
  useEffect(() => {
    const cached = readCache();
    if (cached && cached.books.length) setLiveBooks(cached.books);
    refreshBooks(true);
  }, [refreshBooks]);

  // Tự cập nhật mỗi khi vào thư viện (cách nhau ít nhất 30 giây).
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
      if (['home', 'goal', 'catalog', 'explore', 'about', 'advisor'].includes(hash)) {
        setCurrentRoute(hash);
      } else if (hash.startsWith('book-') || hash.startsWith('detail-')) {
        const prefixLen = hash.startsWith('detail-') ? 7 : 5;
        const bookId = decodeURIComponent(hash.slice(prefixLen));
        const found = liveBooks.find((b) => b.id === bookId) || FALLBACK_BOOKS.find((b) => b.id === bookId);
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

        {currentRoute === 'detail' && selectedBook && (
          <BookDetailView
            book={selectedBook}
            allBooks={allBooks}
            onBack={handleBackFromDetail}
            onSelectBook={handleSelectBook}
            onFilterByAttribute={handleFilterByAttribute}
          />
        )}
      </main>

      {/* Footer */}
      <Footer onNavigate={navigateTo} />

      {/* Floating Chat Bubble & Mini Drawer (ẩn trên trang AI Advisor chuyên sâu để tránh đè khung nhập) */}
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
    </div>
  );
}
