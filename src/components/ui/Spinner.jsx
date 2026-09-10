import clsx from 'clsx';

/**
 * @typedef {Object} SpinnerProps
 * @property {'sm' | 'md' | 'lg' | 'xl'} [size='md'] Spinner size preset.
 * @property {'green' | 'white' | 'slate'} [color='green'] Spinner color preset.
 * @property {string} [className] Additional Tailwind classes.
 */

const sizeMap = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

const colorClassMap = {
  green: 'text-emerald-500',
  white: 'text-white',
  slate: 'text-slate-400',
};

/**
 * Circular loading spinner using currentColor and SVG arc animation.
 *
 * @param {SpinnerProps} props Spinner options.
 * @returns {JSX.Element}
 */
export default function Spinner({ size = 'md', color = 'green', className }) {
  const pixelSize = sizeMap[size] ?? sizeMap.md;
  const colorClass = colorClassMap[color] ?? colorClassMap.green;

  return (
    <svg
      width={pixelSize}
      height={pixelSize}
      viewBox="0 0 24 24"
      fill="none"
      className={clsx('animate-spin', colorClass, className)}
      role="status"
      aria-label="Loading"
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
  );
}

/**
 * Full viewport loading overlay for page-level suspense states.
 *
 * @returns {JSX.Element}
 */
export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" color="green" />
        <p className="text-sm font-medium text-slate-700">جاري التحميل...</p>
      </div>
    </div>
  );
}
