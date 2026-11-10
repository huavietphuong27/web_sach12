import React, { useState, useEffect, useRef } from 'react';
import { Book } from '../types/book';
import { BookCard } from './BookCard';

interface BookRowGridProps {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onFilterByAttribute?: (type: 'author' | 'publisher' | 'year', value: string | number) => void;
  compact?: boolean;
}

interface RowItemProps {
  rowBooks: Book[];
  cols: number;
  onSelectBook: (book: Book) => void;
  onFilterByAttribute?: (type: 'author' | 'publisher' | 'year', value: string | number) => void;
  compact?: boolean;
}

const RowItem: React.FC<RowItemProps> = ({
  rowBooks,
  cols,
  onSelectBook,
  onFilterByAttribute,
  compact,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    // Check if IntersectionObserver is available
    if (typeof IntersectionObserver === 'undefined') {
      setIsRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            setIsRevealed(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Determine grid class according to column count
  const gridClass =
    cols === 1
      ? 'grid grid-cols-1 gap-6'
      : cols === 2
      ? 'grid grid-cols-2 gap-6'
      : 'grid grid-cols-4 gap-6';

  return (
    <div ref={rowRef} className={`w-full ${gridClass}`}>
      {rowBooks.map((book, colIndex) => {
        const delay = Math.min(colIndex * 100, 400);
        return (
          <BookCard
            key={book.id}
            book={book}
            onSelect={onSelectBook}
            onFilterByAttribute={onFilterByAttribute}
            compact={compact}
            isRevealed={isRevealed}
            revealDelay={delay}
          />
        );
      })}
    </div>
  );
};

export const BookRowGrid: React.FC<BookRowGridProps> = ({
  books,
  onSelectBook,
  onFilterByAttribute,
  compact = false,
}) => {
  const [cols, setCols] = useState<number>(() => {
    if (typeof window === 'undefined') return 4;
    const w = window.innerWidth;
    if (w < 640) return 1;
    if (w < 1024) return 2;
    return 4;
  });

  useEffect(() => {
    // Add motion-ready class to enable scroll animations safely
    document.documentElement.classList.add('motion-ready');

    const handleResize = () => {
      const w = window.innerWidth;
      let newCols = 4;
      if (w < 640) newCols = 1;
      else if (w < 1024) newCols = 2;
      else newCols = 4;

      setCols((prev) => (prev !== newCols ? newCols : prev));
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Chunk books into rows according to current column count
  const rows: Book[][] = [];
  for (let i = 0; i < books.length; i += cols) {
    rows.push(books.slice(i, i + cols));
  }

  return (
    <div className="space-y-6 w-full">
      {rows.map((rowBooks, rowIndex) => (
        <RowItem
          key={`row-${rowIndex}-${cols}-${rowBooks[0]?.id || ''}`}
          rowBooks={rowBooks}
          cols={cols}
          onSelectBook={onSelectBook}
          onFilterByAttribute={onFilterByAttribute}
          compact={compact}
        />
      ))}
    </div>
  );
};
