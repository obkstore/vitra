import clsx from 'clsx';

/**
 * @typedef {Object} SkeletonOwnProps
 * @property {string} [width='100%'] Placeholder width.
 * @property {string} [height='1rem'] Placeholder height.
 * @property {'sm' | 'md' | 'lg' | 'full'} [rounded='md'] Border radius preset.
 * @property {string} [className] Additional Tailwind classes.
 */

/**
 * @typedef {SkeletonOwnProps & import('react').HTMLAttributes<HTMLDivElement>} SkeletonProps
 */

const roundedClassMap = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/**
 * Generic animated loading placeholder block.
 *
 * @param {SkeletonProps} props Skeleton options.
 * @returns {JSX.Element}
 */
function Skeleton({
  width = '100%',
  height = '1rem',
  rounded = 'md',
  className,
  style,
  ...rest
}) {
  return (
    <div
      className={clsx('animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-brand-100 block', roundedClassMap[rounded] ?? roundedClassMap.md, className)}
      style={{ width, height, ...style }}
      aria-hidden="true"
      {...rest}
    />
  );
}

/**
 * Three-line skeleton text block with a shorter final line.
 *
 * @param {import('react').HTMLAttributes<HTMLDivElement>} props Wrapper props.
 * @returns {JSX.Element}
 */
export function SkeletonText({ className, ...rest }) {
  return (
    <div className={clsx('space-y-2', className)} {...rest}>
      <Skeleton height="0.875rem" />
      <Skeleton height="0.875rem" />
      <Skeleton height="0.875rem" width="60%" />
    </div>
  );
}

/**
 * Card-style skeleton with title bar and content lines.
 *
 * @param {import('react').HTMLAttributes<HTMLDivElement>} props Wrapper props.
 * @returns {JSX.Element}
 */
export function SkeletonCard({ className, ...rest }) {
  return (
    <div className={clsx('rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm', className)} {...rest}>
      <Skeleton width="42%" height="1.25rem" rounded="md" />
      <SkeletonText />
    </div>
  );
}

/**
 * Meal card skeleton placeholder matching the planned MealCard structure.
 *
 * @param {import('react').HTMLAttributes<HTMLDivElement>} props Wrapper props.
 * @returns {JSX.Element}
 */
export function SkeletonMealCard({ className, ...rest }) {
  return (
    <div className={clsx('rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm', className)} {...rest}>
      <div className="flex items-start gap-3">
        <Skeleton width="64px" height="64px" rounded="lg" />
        <div className="flex-1 space-y-2">
          <Skeleton width="58%" height="1rem" />
          <Skeleton width="36%" height="0.875rem" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Skeleton height="2rem" rounded="md" />
        <Skeleton height="2rem" rounded="md" />
        <Skeleton height="2rem" rounded="md" />
      </div>

      <Skeleton width="32%" height="0.875rem" />
    </div>
  );
}

export default Skeleton;
