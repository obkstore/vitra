import clsx from 'clsx';

/**
 * @typedef {Object} CardOwnProps
 * @property {'default' | 'hover' | 'flat' | 'gradient'} [variant='default'] Card style variant.
 * @property {'sm' | 'md' | 'lg' | 'none'} [padding='md'] Internal padding size.
 * @property {string} [className] Additional Tailwind classes.
 * @property {import('react').ReactNode} [children] Card content.
 * @property {(event: import('react').MouseEvent<HTMLDivElement>) => void} [onClick] Click handler.
 */

/**
 * @typedef {CardOwnProps & import('react').HTMLAttributes<HTMLDivElement>} CardProps
 */

const variantClasses = {
  default: 'bg-white rounded-2xl shadow-soft border border-slate-100',
  hover:
    'bg-white rounded-2xl shadow-soft border border-slate-100 hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer',
  flat: 'bg-slate-50 rounded-2xl border border-slate-200',
  gradient: 'bg-gradient-to-br from-mental-50 via-white to-brand-50 rounded-2xl border border-mental-100',
};

const paddingClasses = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  none: 'p-0',
};

/**
 * Flexible card container with style variants and optional click handling.
 *
 * @param {CardProps} props Card props and native div attributes.
 * @returns {JSX.Element}
 */
function Card({
  variant = 'default',
  padding = 'md',
  className,
  children,
  onClick,
  ...rest
}) {
  return (
    <div
      className={clsx(
        variantClasses[variant] ?? variantClasses.default,
        paddingClasses[padding] ?? paddingClasses.md,
        className
      )}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * @param {import('react').HTMLAttributes<HTMLDivElement>} props
 * @returns {JSX.Element}
 */
function CardHeader({ className, children, ...rest }) {
  return (
    <div
      className={clsx(
        'mb-4 pb-4 border-b border-slate-100 flex items-center justify-between',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * @param {import('react').HTMLAttributes<HTMLHeadingElement>} props
 * @returns {JSX.Element}
 */
function CardTitle({ className, children, ...rest }) {
  return (
    <h3 className={clsx('text-lg font-bold text-slate-800', className)} {...rest}>
      {children}
    </h3>
  );
}

/**
 * @param {import('react').HTMLAttributes<HTMLDivElement>} props
 * @returns {JSX.Element}
 */
function CardBody({ className, children, ...rest }) {
  return (
    <div className={clsx('text-slate-600', className)} {...rest}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Body = CardBody;

export default Card;
