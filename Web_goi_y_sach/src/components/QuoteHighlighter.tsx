import React, { useState, useEffect, useRef } from 'react';

interface QuoteHighlighterProps {
  children: React.ReactNode;
  quoteIndex?: number;
  className?: string;
}

export const QuoteHighlighter: React.FC<QuoteHighlighterProps> = ({
  children,
  quoteIndex = 0,
  className = '',
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const isInstant = quoteIndex >= 3;

  useEffect(() => {
    // Check for reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsHighlighted(true);
      return;
    }

    if (isInstant) {
      setIsHighlighted(true);
      return;
    }

    const el = spanRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsHighlighted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Apply staggering delay for the first 3 quotes (0ms, 800ms, 1600ms)
            const staggerDelay = quoteIndex * 800;
            if (staggerDelay > 0) {
              const timer = setTimeout(() => {
                setIsHighlighted(true);
              }, staggerDelay);
              observer.unobserve(entry.target);
              return () => clearTimeout(timer);
            } else {
              setIsHighlighted(true);
              observer.unobserve(entry.target);
            }
          }
        });
      },
      {
        threshold: 0.5,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [quoteIndex, isInstant]);

  return (
    <span
      ref={spanRef}
      className={`literary-highlighter ${isInstant ? 'instant-highlight' : ''} ${
        isHighlighted ? 'is-highlighted' : ''
      } ${className}`}
    >
      {children}
    </span>
  );
};
