import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Book } from '../types/book';
import { formatReadingTime, getRelatedBooksByAttribute } from '../utils/bookRecommender';
import { BookRecommendationEngine } from '../services/recommendationModels';
import { BookRowGrid } from '../components/BookRowGrid';
import { QuoteHighlighter } from '../components/QuoteHighlighter';
import {
  ArrowLeft,
  BookOpen,
  Quote,
  Sparkles,
  Share2,
  Check,
  ExternalLink,
  Bookmark,
  Cpu,
  Star,
  Edit3,
  Trash2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface BookDetailViewProps {
  book: Book;
  allBooks: Book[];
  onBack: () => void;
  onSelectBook: (book: Book) => void;
  onFilterByAttribute: (type: 'author' | 'publisher' | 'year', value: string | number) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (book: Book) => void;
}

type RelatedFilterMode = 'ai-model' | 'author' | 'publisher' | 'year' | 'genre';

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
  const [relatedMode, setRelatedMode] = useState<RelatedFilterMode>('ai-model');
  const relatedSectionRef = useRef<HTMLElement>(null);

  const {
    currentUser,
    rateBook,
    saveBookNote,
    deleteBookNote,
    addReadingHistory,
    openAuthModal,
  } = useAuth();

  const userRating = currentUser?.ratings?.[book.id] || 0;
  const existingNote = currentUser?.notes?.[book.id]?.content || '';
  const [noteText, setNoteText] = useState(existingNote);
  const [noteSavedAlert, setNoteSavedAlert] = useState(false);

  useEffect(() => {
    setNoteText(currentUser?.notes?.[book.id]?.content || '');
  }, [book.id, currentUser]);

  // Tự động ghi lại lịch sử đọc sách vào tài khoản người dùng
  useEffect(() => {
    addReadingHistory(book);
  }, [book.id, addReadingHistory]);

  React.useEffect(() => {
    setImgError(false);
  }, [book.id, book.coverUrl]);

  const handleRate = (star: number) => {
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    rateBook(book.id, star);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      openAuthModal('login');
      return;
    }
    saveBookNote(book.id, book.title, noteText);
    setNoteSavedAlert(true);
    setTimeout(() => setNoteSavedAlert(false), 2000);
  };

  // Chạy mô hình TF-IDF Cosine + Item-Item Collaborative KNN tìm sách tương đồng
  const aiSimilarItems = useMemo(() => {
    const engine = new BookRecommendationEngine(allBooks);
    return engine.findSimilarBooks(book, 4);
  }, [allBooks, book]);

  // Related collections
  const booksBySameAuthor = getRelatedBooksByAttribute(allBooks, {
    type: 'author',
    value: book.author,
    excludeBookId: book.id,
  });

  const booksBySamePublisher = getRelatedBooksByAttribute(allBooks, {
    type: 'publisher',
    value: book.publisher,
    excludeBookId: book.id,
  });

  const booksBySameYear = getRelatedBooksByAttribute(allBooks, {
    type: 'year',
    value: book.publishYear,
    excludeBookId: book.id,
  });

  const booksBySameEmotion = allBooks
    .filter((b) => b.id !== book.id && (b.category === book.category || b.style === book.style))
    .slice(0, 4);

  // Active list of books based on relatedMode
  const activeRelatedBooks = (() => {
    switch (relatedMode) {
      case 'ai-model':
        return aiSimilarItems.map((i) => i.book);
      case 'author':
        return booksBySameAuthor.length > 0 ? booksBySameAuthor : booksBySameEmotion;
      case 'publisher':
        return booksBySamePublisher.length > 0 ? booksBySamePublisher : booksBySameEmotion;
      case 'year':
        return booksBySameYear.length > 0 ? booksBySameYear : booksBySameEmotion;
      case 'genre':
      default:
        return booksBySameEmotion;
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

          {/* User Personal Rating & Notes (Lưu trữ data người dùng) */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Dữ Liệu Đọc Của Bạn</span>
                </span>
                <h4 className="font-serif text-sm font-bold text-slate-900">
                  Đánh giá &amp; Ghi chú cá nhân cho cuốn sách này
                </h4>
              </div>

              {/* Star Rating Controls */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 mr-1.5 font-medium">Đánh giá:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRate(star)}
                    className="p-1 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                    title={`Đánh giá ${star} sao`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        userRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                {userRating > 0 && (
                  <span className="text-xs font-bold text-amber-600 ml-1">({userRating}/5)</span>
                )}
              </div>
            </div>

            {/* Note Form */}
            <form onSubmit={handleSaveNote} className="space-y-2.5">
              <textarea
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={
                  currentUser
                    ? 'Viết bài học, trích dẫn hoặc cảm nhận tâm đắc của bạn về cuốn sách này...'
                    : 'Đăng nhập để lưu ghi chú và trích dẫn cá nhân cho cuốn sách này...'
                }
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/30"
              />

              <div className="flex items-center justify-between gap-2">
                <div>
                  {noteSavedAlert && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 animate-fade-in">
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã lưu ghi chú vào hồ sơ của bạn!</span>
                    </span>
                  )}
                  {!currentUser && (
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Ghi chú sẽ được gắn vào tài khoản của bạn</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {existingNote && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteBookNote(book.id);
                        setNoteText('');
                      }}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      Xóa ghi chú
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs"
                  >
                    {existingNote ? 'Cập nhật ghi chú' : 'Lưu ghi chú'}
                  </button>
                </div>
              </div>
            </form>
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
            onClick={() => setRelatedMode('ai-model')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer border inline-flex items-center gap-1.5 ${
              relatedMode === 'ai-model'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Model AI: TF-IDF Cosine + KNN ({aiSimilarItems.length})</span>
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

          <button
            type="button"
            onClick={() => setRelatedMode('genre')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              relatedMode === 'genre'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
            }`}
          >
            Cùng chủ đề &amp; định hướng ({booksBySameEmotion.length})
          </button>
        </div>

        {/* AI Similarity Explanation Badges when in ai-model mode */}
        {relatedMode === 'ai-model' && aiSimilarItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {aiSimilarItems.map((item) => (
              <div
                key={`sim-${item.book.id}`}
                onClick={() => onSelectBook(item.book)}
                className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80 hover:border-indigo-500 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-bold text-indigo-700 truncate">
                    {item.book.title}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-extrabold shrink-0">
                    {item.similarity}% khớp
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-1">{item.reason}</p>
              </div>
            ))}
          </div>
        )}

        {/* Related Books Grid using BookRowGrid */}
        {activeRelatedBooks.length > 0 ? (
          <div className="pt-2">
            <BookRowGrid
              books={activeRelatedBooks}
              onSelectBook={onSelectBook}
              onFilterByAttribute={onFilterByAttribute}
            />
          </div>
        ) : (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-sm text-slate-500">
            Chưa có thêm tác phẩm cùng tiêu chí này trong kho lưu trữ.
          </div>
        )}
      </section>
    </div>
  );
};
