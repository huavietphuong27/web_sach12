import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'outline' | 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  outline:
    'border border-border-strong bg-surface text-ink hover:bg-button-hover',
  primary:
    'bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm',
  secondary:
    'bg-surface-subtle text-ink hover:bg-button-hover border border-border',
  ghost:
    'bg-transparent text-ink-secondary hover:text-ink hover:bg-button-hover',
  danger:
    'bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 hover:text-rose-700 dark:text-rose-400',
  icon:
    'border border-border-strong bg-surface text-ink-secondary hover:text-ink hover:bg-button-hover',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'min-h-10 px-4 py-2 text-sm rounded-xl gap-2',
  lg: 'min-h-11 px-5 py-2.5 text-sm rounded-xl gap-2',
  icon: 'h-10 w-10 min-h-10 min-w-10 p-0 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'outline',
      size,
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      children,
      disabled,
      onClick,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const resolvedSize: ButtonSize = size ?? (variant === 'icon' ? 'icon' : 'md');
    const isBlocked = Boolean(disabled || isLoading);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isBlocked) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type={type}
        aria-disabled={isBlocked || undefined}
        aria-busy={isLoading || undefined}
        onClick={handleClick}
        className={[
          'relative inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none',
          'max-w-full leading-tight [overflow-wrap:anywhere]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          isBlocked ? 'opacity-60 cursor-not-allowed' : '',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[resolvedSize],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        <span
          className={[
            'inline-flex items-center justify-center gap-2',
            isLoading ? 'invisible' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {leftIcon}
          {children}
          {rightIcon}
        </span>

        {isLoading && (
          <span
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
