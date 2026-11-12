import React, { useState, useRef, useMemo } from 'react';
import { Book } from '../types/book';
import {
  formatReadingTime,
  getRelatedBooksByAttribute,
  getRelatedBooksByContent,
  buildRelatedBookSearchQueries,
} from '../utils/bookRecommender';
import { searchVietnameseBooks } from '../services/googleBooks';
import { BookRowGrid } from '../components/BookRowGrid';
import { QuoteHighlighter } from '../components/QuoteHighlighter';
import { ArrowLeft, BookOpen, Quote, Sparkles, Share2, Check, ExternalLink, Bookmark } from 'lucide-react';

interface BookDetailViewProps {
  book: Book;
  allBooks: Book[];
  onBack: () => void;
  onSelectBook: (book: Book) => void;
  onFilterByAttribute: (type: 'author' | 'publisher' | 'year', value: string | number) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (book: Book) => void;
}

type RelatedFilterMode = 'similar' | 'author' | 'publisher' | 'year';

export const BookDetailView: React.FC<BookDetailViewProps> = ({
  book,
  allBooks,
  onBack,
  onSelectBook,
  onFilterByAttribute,
  isFavorite = false,
  onToggleFavorite,
}) => {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [relatedMode, setRelatedMode] = useState<RelatedFilterMode>('similar');
  const [liveRelatedBooks, setLiveRelatedBooks] = useState<Book[]>([]);
  const [isLoadingRelated, setIsLoadingRelated] = useState<boolean>(false);
  const relatedSectionRef = useRef<HTMLElement>(null);

  React.useEffect(() => {
    setImgError(false);
    setRelatedMode('similar');
  }, [book.id, book.coverUrl]);

  // Tự động truy vấn Google Books API để bổ sung các đầu sách liên quan mật thiết về nội dung & cùng tác giả
  React.useEffect(() => {
    let cancelled = false;
    const { topicQuery, authorQuery } = buildRelatedBookSearchQueries(book);

    setIsLoadingRelated(true);
    Promise.all([
      searchVietnameseBooks(topicQuery, 12).catch(() => [] as Book[]),
      authorQuery ? searchVietnameseBooks(authorQuery, 8).catch(() => [] as Book[]) : Promise.resolve([] as Book[]),
    ])
      .then(([byTopic, byAuthor]) => {
        if (cancelled) return;
        const merged = [...byTopic, ...byAuthor].filter(
          (b) => b.id !== book.id && Boolean(b.coverUrl)
        );
        setLiveRelatedBooks(merged);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRelated(false);
      });

    return () => {
      cancelled = true;
    };
  }, [book]);

  // Gộp kho sách cục bộ + sách liên quan vừa tải trực tiếp từ Google Books (khử trùng lặp)
  const combinedBooksPool = useMemo(() => {
    const map = new Map<string, Book>();
    for (const b of allBooks) {
      if (b.id !== book.id) map.set(b.id, b);
    }
    for (const b of liveRelatedBooks) {
      if (b.id !== book.id && !map.has(b.id)) map.set(b.id, b);
    }
    return Array.from(map.values());
  }, [allBooks, liveRelatedBooks, book.id]);

  // Sách gợi ý có nội dung & chủ đề liên quan mật thiết nhất
  const booksBySimilarContent = useMemo(
    () => getRelatedBooksByContent(book, combinedBooksPool, 8),
    [book, combinedBooksPool]
  );

  // Related collections theo thuộc tính
  const booksBySameAuthor = useMemo(
    () =>
      getRelatedBooksByAttribute(combinedBooksPool, {
        type: 'author',
        value: book.author,
        excludeBookId: book.id,
      }).slice(0, 8),
    [combinedBooksPool, book.author, book.id]
  );

  const booksBySamePublisher = useMemo(
    () =>
      getRelatedBooksByAttribute(combinedBooksPool, {
        type: 'publisher',
        value: book.publisher,
        excludeBookId: book.id,
      }).slice(0, 8),
    [combinedBooksPool, book.publisher, book.id]
  );

  const booksBySameYear = useMemo(
    () =>
      getRelatedBooksByAttribute(combinedBooksPool, {
        type: 'year',
        value: book.publishYear,
        excludeBookId: book.id,
      }).slice(0, 8),
    [combinedBooksPool, book.publishYear, book.id]
  );

  // Active list of books based on relatedMode
  const activeRelatedBooks = (() => {
    switch (relatedMode) {
      case 'author':
        return booksBySameAuthor;
      case 'publisher':
        return booksBySamePublisher;
      case 'year':
        return booksBySameYear;
      case 'similar':
      default:
        return booksBySimilarContent;
    }
  })();

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${book.title} — ${book.author} | BookMind AI (${window.location.href})`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleQuickAttributeClick = (type: 'author' | 'publisher' | 'year', _value?: string | number) => {
    setRelatedMode(type);
    relatedSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-16">
      {/* Back button */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer group py-2 px-3 -ml-3 rounded-lg hover:bg-slate-100 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </button>
      </div>

      {/* Main Detail Presentation (2-column on desktop, stacked on mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
        {/* Left Column: Book Cover Presentation (2:3 aspect ratio) */}
        <div className="lg:col-span-5 max-w-md mx-auto w-full group">
          <div className="relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-white shadow-md border border-slate-200">
            {book.coverUrl && !imgError ? (
              <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-slate-900/5">
                {/* Lớp nền mờ nghệ thuật phía sau */}
                <img
                  src={book.coverUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-35 scale-110 pointer-events-none"
                />
                {/* Bìa sách hiển thị trọn vẹn 100%, không bị xén chữ hay góc cạnh */}
                <img
                  src={book.coverUrl}
                  alt={`Bìa sách ${book.title}`}
                  className="relative max-w-full max-h-full object-contain p-2 z-10 drop-shadow-md"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div
                className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8"
                style={{
                  backgroundColor: book.coverPalette.bg,
                  borderLeft: `14px solid ${book.coverPalette.spine}`,
                }}
              >
                {/* Header on Cover: Interactive publisher and year */}
                <div
                  className="flex items-center justify-between text-xs font-sans tracking-widest uppercase opacity-85 z-10"
                  style={{ color: book.coverPalette.text }}
                >
                  <button
                    type="button"
                    onClick={() => handleQuickAttributeClick('publisher', book.publisher)}
                    className="hover:underline hover:opacity-100 cursor-pointer transition-colors max-w-[65%] truncate text-left min-h-[44px] flex items-center"
                    title={`Xem các sách của ${book.publisher}`}
                  >
                    {book.publisher}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAttributeClick('year', book.publishYear)}
                    className="hover:underline hover:opacity-100 cursor-pointer transition-colors ml-1 tabular-nums min-h-[44px] flex items-center"
                    title={`Xem các sách năm ${book.publishYear}`}
                  >
                    {book.publishYear}
                  </button>
                </div>

                {/* Title & Author on Cover */}
                <div className="my-auto text-center px-4">
                  <h2
                    className="font-serif font-bold text-2xl sm:text-3xl leading-snug mb-3"
                    style={{ color: book.coverPalette.text }}
                  >
                    {book.title}
                  </h2>
                  {book.originalTitle && (
                    <p
                      className="text-xs font-sans italic opacity-75 mb-3"
                      style={{ color: book.coverPalette.text }}
                    >
                      ({book.originalTitle})
                    </p>
                  )}
                  <div
                    className="w-12 h-0.5 mx-auto my-3 rounded-full opacity-60"
                    style={{ backgroundColor: book.coverPalette.accent }}
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickAttributeClick('author', book.author)}
                    className="text-base font-sans font-medium hover:underline cursor-pointer opacity-90 hover:opacity-100 transition-colors z-10 inline-flex items-center min-h-[44px]"
                    style={{ color: book.coverPalette.text }}
                    title={`Xem các tác phẩm của ${book.author}`}
                  >
                    {book.author}
                  </button>
                  {book.translator && (
                    <p
                      className="text-xs font-sans opacity-75 mt-1"
                      style={{ color: book.coverPalette.text }}
                    >
                      Bản dịch: {book.translator}
                    </p>
                  )}
                </div>

                {/* Footer on Cover */}
                <div
                  className="text-xs font-sans text-center opacity-75 border-t border-black/10 pt-3"
                  style={{ color: book.coverPalette.text }}
                >
                  {book.genre}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Book Metadata, Quote, Curator Commentary, Synopsis */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
              <span>{book.category === 'vietnam' ? 'Tác phẩm Việt Nam' : 'Sách Quốc Tế & Chuyên Ngành'}</span>
              <span>·</span>
              <span>{book.genre}</span>
            </div>

            <h1 className="font-sans text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {book.title}
            </h1>

            <div className="text-lg text-slate-600 mt-2 flex flex-wrap items-center gap-2">
              <span>Tác giả:</span>
              <button
                type="button"
                onClick={() => handleQuickAttributeClick('author', book.author)}
                className="font-bold text-base text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer transition-colors min-h-[44px] inline-flex items-center"
                title={`Xem các tác phẩm liên quan đến tác giả ${book.author}`}
              >
                {book.author}
              </button>
              {book.translator && (
                <span className="text-sm font-sans text-slate-500">
                  (Dịch giả: {book.translator})
                </span>
              )}
            </div>
          </div>

          {/* Featured Literary Quote with Highlighter Stroke */}
          {book.quote && (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 relative">
              <Quote className="w-6 h-6 text-indigo-400 absolute top-4 left-4" />
              <blockquote className="font-serif italic text-base sm:text-lg text-slate-800 pl-8 leading-relaxed">
                “<QuoteHighlighter quoteIndex={0}>{book.quote}</QuoteHighlighter>”
              </blockquote>
            </div>
          )}

          {/* Curator Commentary / Lời biên tập viên */}
          {book.curatorNote && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Góc nhìn gợi ý từ BookMind AI</span>
              </div>
              <p className="text-base text-slate-700 leading-relaxed max-w-prose bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
                {book.curatorNote}
              </p>
            </div>
          )}

          {/* Synopsis */}
          <div className="space-y-2">
            <h3 className="font-sans text-base font-bold text-slate-900">
              Tóm lược nội dung
            </h3>
            <p className="text-base text-slate-600 leading-relaxed max-w-prose">
              {book.description}
            </p>
          </div>

          {/* Suitable Reading Goals */}
          {book.readingGoals && book.readingGoals.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Mục tiêu đọc phù hợp
              </h4>
              <div className="flex flex-wrap gap-2">
                {book.readingGoals.map((goal, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3.5 py-2 min-h-[44px] inline-flex items-center rounded-lg bg-white border border-slate-200 text-slate-800 font-medium shadow-2xs"
                  >
                    {goal}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Publication Facts with hairline dividers */}
          <div className="border-t border-slate-200 pt-6">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Thông tin ấn bản
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-sm py-4 border-y border-slate-200">
              {/* Publisher Fact Item */}
              <div>
                <span className="text-xs text-slate-500 block">Nhà xuất bản</span>
                <button
                  type="button"
                  onClick={() => handleQuickAttributeClick('publisher', book.publisher)}
                  className="mt-1 font-semibold text-slate-900 hover:text-indigo-600 hover:underline text-left cursor-pointer transition-colors group flex items-center gap-1.5 min-h-[44px]"
                  title={`Xem các sách của ${book.publisher}`}
                >
                  <span className="truncate">{book.publisher}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600 shrink-0 opacity-70 group-hover:opacity-100" />
                </button>
              </div>

              {/* Publish Year Fact Item */}
              <div>
                <span className="text-xs text-slate-500 block">Năm phát hành</span>
                <button
                  type="button"
                  onClick={() => handleQuickAttributeClick('year', book.publishYear)}
                  className="mt-1 font-semibold text-slate-900 hover:text-indigo-600 hover:underline text-left cursor-pointer transition-colors tabular-nums group flex items-center gap-1.5 min-h-[44px]"
                  title={`Xem các sách năm ${book.publishYear}`}
                >
                  <span>{book.publishYear}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-600 shrink-0 opacity-70 group-hover:opacity-100" />
                </button>
              </div>

              {/* Pages */}
              <div>
                <span className="text-xs text-slate-500 block">Dung lượng</span>
                <span className="mt-1 flex items-center font-medium text-slate-900 min-h-[44px]">{formatReadingTime(book.pages)}</span>
              </div>

              {/* ISBN */}
              {book.isbn && (
                <div>
                  <span className="text-xs text-slate-500 block">Mã ISBN</span>
                  <span className="mt-1 flex items-center font-mono text-xs text-slate-900 truncate min-h-[44px]">{book.isbn}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(book)}
                className={`px-5 py-2.5 min-h-[44px] rounded-xl border text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                  isFavorite
                    ? 'border-pink-500 bg-pink-50 text-pink-600'
                    : 'border-slate-200 bg-white hover:border-pink-300 hover:text-pink-600 text-slate-800'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-current text-pink-600' : 'text-slate-500'}`} />
                <span>{isFavorite ? 'Đã lưu yêu thích' : 'Lưu vào yêu thích'}</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="px-5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-600">Đã sao chép</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-slate-600" />
                  <span>Chia sẻ tác phẩm</span>
                </>
              )}
            </button>

            {book.infoLink && (
              <a
                href={book.infoLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-800 transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <ExternalLink className="w-4 h-4 text-indigo-600" />
                <span>Mở trên Google Books</span>
              </a>
            )}

            <button
              onClick={() => onFilterByAttribute('author', book.author)}
              className="px-5 py-2.5 min-h-[44px] rounded-xl bg-slate-900 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Xem sách cùng tác giả</span>
            </button>
          </div>
        </div>
      </div>

      {/* Related Books Section with Filter Selector */}
      <section ref={relatedSectionRef} className="border-t border-slate-200 pt-12 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              Khám Phá Mở Rộng
            </p>
            <h3 className="font-sans text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Các đầu sách liên quan
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Chọn tiêu chí liên quan để khám phá thêm các tác phẩm cùng tác giả, nhà xuất bản hoặc cùng chủ đề.
            </p>
          </div>

          <button
            onClick={() => {
              if (relatedMode === 'author') onFilterByAttribute('author', book.author);
              else if (relatedMode === 'publisher') onFilterByAttribute('publisher', book.publisher);
              else if (relatedMode === 'year') onFilterByAttribute('year', book.publishYear);
              else onFilterByAttribute('author', book.author);
            }}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start md:self-auto min-h-[44px]"
          >
            <span>Mở trong Thư viện sách</span>
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => setRelatedMode('similar')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
              relatedMode === 'similar'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Cùng nội dung &amp; chủ đề ({booksBySimilarContent.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setRelatedMode('author')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              relatedMode === 'author'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            Cùng tác giả: {book.author} ({booksBySameAuthor.length})
          </button>

          <button
            type="button"
            onClick={() => setRelatedMode('publisher')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              relatedMode === 'publisher'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            Cùng nhà xuất bản: {book.publisher} ({booksBySamePublisher.length})
          </button>

          <button
            type="button"
            onClick={() => setRelatedMode('year')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              relatedMode === 'year'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            Cùng năm phát hành: {book.publishYear} ({booksBySameYear.length})
          </button>
        </div>

        {/* Related Books Grid using BookRowGrid */}
        {activeRelatedBooks.length > 0 ? (
          <div className="pt-2">
            <BookRowGrid
              books={activeRelatedBooks}
              onSelectBook={onSelectBook}
              onFilterByAttribute={onFilterByAttribute}
            />
          </div>
        ) : isLoadingRelated ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-sm text-slate-500">
            Đang tìm các đầu sách liên quan mật thiết tới <strong>{book.title}</strong>...
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-sm text-slate-500 space-y-3">
            <p>Chưa tìm thấy thêm tác phẩm trùng tiêu chí này.</p>
            {relatedMode !== 'similar' && booksBySimilarContent.length > 0 && (
              <button
                type="button"
                onClick={() => setRelatedMode('similar')}
                className="px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-semibold text-xs hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                Xem {booksBySimilarContent.length} sách cùng nội dung &amp; chủ đề
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
