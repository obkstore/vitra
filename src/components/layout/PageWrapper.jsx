import clsx from 'clsx';
import Header from './Header';

/**
 * @typedef {Object} PageWrapperProps
 * @property {import('react').ReactNode} children Page content.
 * @property {string} [className] Additional classes for the main container.
 * @property {'sm' | 'md' | 'lg' | 'xl' | 'full'} [maxWidth='lg'] Maximum page width preset.
 * @property {boolean} [withHeader=true] Whether to render the top header.
 * @property {boolean} [centered=false] Centers content vertically.
 */

const maxWidthMap = {
  sm: 'max-w-lg',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-full',
};

/**
 * Wraps pages with consistent spacing, optional header, and fade-in animation.
 *
 * @param {PageWrapperProps} props
 * @returns {JSX.Element}
 */
export default function PageWrapper({
  children,
  className,
  maxWidth = 'lg',
  withHeader = true,
  centered = false,
  theme = 'light',
}) {
  const maxWidthClass = maxWidthMap[maxWidth] ?? maxWidthMap.lg;

  const wrapperClasses =
    theme === 'dark'
      ? 'bg-[radial-gradient(circle_at_top,_rgba(27,77,62,0.26),_transparent_30%),radial-gradient(circle_at_80%_20%,_rgba(232,147,92,0.14),_transparent_25%),linear-gradient(180deg,_#0D1117_0%,_#0D1117_100%)] text-slate-100'
      : 'bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.08),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] text-slate-900';

  return (
    <div className={clsx('min-h-screen transition-colors duration-300', wrapperClasses)} data-theme={theme}>
      {withHeader && <Header />}

      <main
        className={clsx(
          maxWidthClass,
          'mx-auto px-4 pb-12',
          withHeader && 'pt-20',
          className
        )}
      >
        <div
          className={clsx(
            'animate-fade-in',
            centered && (withHeader ? 'min-h-[calc(100vh-8rem)] flex items-center' : 'min-h-screen flex items-center')
          )}
        >
          {centered ? <div className="w-full">{children}</div> : children}
        </div>
      </main>
    </div>
  );
}
