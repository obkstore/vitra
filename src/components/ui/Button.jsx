import clsx from 'clsx';
import { useCallback } from 'react';

/**
 * @typedef {Object} ButtonOwnProps
 * @property {'primary' | 'secondary' | 'ghost' | 'danger'} [variant='primary'] Visual style variant.
 * @property {'sm' | 'md' | 'lg'} [size='md'] Button size preset.
 * @property {boolean} [isLoading=false] Shows a spinner, disables the button, and displays loading text.
 * @property {import('react').ReactNode} [leftIcon] Optional icon shown before button text.
 * @property {import('react').ReactNode} [rightIcon] Optional icon shown after button text.
 * @property {boolean} [fullWidth=false] Makes the button take the full available width.
 * @property {boolean} [disabled=false] Disables the button interaction.
 * @property {string} [className] Additional Tailwind classes.
 * @property {import('react').ReactNode} [children] Button content.
 */

/**
 * @typedef {ButtonOwnProps & import('react').ButtonHTMLAttributes<HTMLButtonElement>} ButtonProps
 */

const baseClasses =
  'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

const variantClasses = {
  primary:
    'bg-gradient-to-r from-energy-500 via-orange-400 to-orange-500 hover:from-orange-500 hover:via-orange-500 hover:to-orange-600 text-white shadow-md hover:shadow-lg',
  secondary: 'border-2 border-brand-700 text-brand-800 hover:bg-brand-50 bg-transparent',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-5 py-2.5 text-sm rounded-xl',
  lg: 'px-7 py-3.5 text-base rounded-xl',
};

/**
 * Fully flexible and accessible button component for the health platform.
 *
 * @param {ButtonProps} props Button configuration and native button props.
 * @returns {JSX.Element}
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled = false,
  className,
  children,
  type = 'button',
  onClick,
  ...rest
}) {
  const isDisabled = disabled || isLoading;
  const playClick = useCallback(() => {
    if (isDisabled || typeof window === "undefined" || !window.AudioContext) return;
    const audioContext = new window.AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 520;
    gain.gain.setValueAtTime(0.035, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.06);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.06);
    oscillator.addEventListener("ended", () => audioContext.close(), { once: true });
  }, [isDisabled]);

  return (
    <button
      type={type}
      className={clsx(
        baseClasses,
        variantClasses[variant] ?? variantClasses.primary,
        sizeClasses[size] ?? sizeClasses.md,
        fullWidth && 'w-full',
        className
      )}
      disabled={isDisabled}
      onClick={(event) => {
        playClick();
        onClick?.(event);
      }}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path
            d="M22 12a10 10 0 0 0-10-10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            className="opacity-90"
          />
        </svg>
      ) : (
        leftIcon && (
          <span className="inline-flex items-center" aria-hidden="true">
            {leftIcon}
          </span>
        )
      )}

      <span>{isLoading ? 'جاري التحميل...' : children}</span>

      {!isLoading && rightIcon ? (
        <span className="inline-flex items-center" aria-hidden="true">
          {rightIcon}
        </span>
      ) : null}
    </button>
  );
}
