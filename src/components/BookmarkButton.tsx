import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';

const BUMP_DURATION_MS = 300;

export interface BookmarkButtonProps {
  isActive: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Nút bookmark dạng controlled: trạng thái do component cha truyền vào
 * (thường lấy từ useFavorites). Làm vậy để mọi nút cùng một sách luôn đồng bộ.
 */
export function BookmarkButton({
  isActive,
  onToggle,
  className = '',
}: BookmarkButtonProps) {
  const [isBumping, setIsBumping] = useState(false);

  useEffect(() => {
    if (!isBumping) {
      return;
    }

    const timer = window.setTimeout(() => setIsBumping(false), BUMP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isBumping]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBumping(true);
    onToggle();
  };

  const label = isActive ? 'Bỏ khỏi sách yêu thích' : 'Thêm vào sách yêu thích';

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isActive}
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-9 w-9 items-center justify-center rounded-full border cursor-pointer',
        'transition-all duration-200 ease-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400',
        isActive
          ? 'border-pink-500 bg-pink-50 text-pink-600 shadow-xs'
          : 'border-slate-200 bg-white/90 text-slate-400 hover:border-pink-400 hover:text-pink-500 hover:bg-white',
        isBumping ? 'scale-125' : 'scale-100',
        className,
      ].join(' ')}
    >
      <Bookmark className={`h-4 w-4 transition-colors ${isActive ? 'fill-current' : ''}`} />
    </button>
  );
}

export default BookmarkButton;
