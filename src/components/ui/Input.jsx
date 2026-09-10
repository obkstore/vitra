import { forwardRef } from 'react';
import clsx from 'clsx';

/**
 * @typedef {Object} InputOwnProps
 * @property {string} [label] Input label text (Arabic supported).
 * @property {string} [error] Validation error message.
 * @property {string} [hint] Helper text shown below the input when there is no error.
 * @property {import('react').ReactNode} [leftIcon] Optional icon displayed before the input text.
 * @property {import('react').ReactNode} [rightIcon] Optional icon displayed after the input text.
 * @property {'sm' | 'md' | 'lg'} [size='md'] Visual size of the input.
 * @property {string} [className] Additional Tailwind classes.
 */

/**
 * @typedef {InputOwnProps & Omit<import('react').InputHTMLAttributes<HTMLInputElement>, 'size'>} InputProps
 */

const baseClasses =
  'w-full bg-white border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-mental-500 focus:border-mental-500 placeholder:text-slate-400';

const stateClasses = {
  normal: 'border-slate-200 hover:border-slate-300',
  error: 'border-rose-400 focus:ring-rose-500 focus:border-rose-500',
};

const sizeClasses = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-4 py-3 text-base',
};

/**
 * Reusable input component with label, icons, error state, and helper text.
 * Built with forwardRef for React Hook Form compatibility.
 *
 * @param {InputProps} props Input props and all native input attributes.
 * @param {import('react').ForwardedRef<HTMLInputElement>} ref Forwarded input ref.
 * @returns {JSX.Element}
 */
const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    size = 'md',
    className,
    id,
    name,
    ...rest
  },
  ref
) {
  const inputId = id || name;
  const resolvedSize = sizeClasses[size] ?? sizeClasses.md;
  const hasError = Boolean(error);
  const describedBy = inputId
    ? hasError
      ? `${inputId}-error`
      : hint
        ? `${inputId}-hint`
        : undefined
    : undefined;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none inline-flex items-center"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          name={name}
          className={clsx(
            baseClasses,
            hasError ? stateClasses.error : stateClasses.normal,
            resolvedSize,
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          {...rest}
        />

        {rightIcon && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none inline-flex items-center"
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        )}
      </div>

      {error && (
        <p id={inputId ? `${inputId}-error` : undefined} className="text-rose-500 text-xs mt-1">
          ⚠ {error}
        </p>
      )}

      {hint && !error && (
        <p id={inputId ? `${inputId}-hint` : undefined} className="text-slate-400 text-xs mt-1">
          {hint}
        </p>
      )}
    </div>
  );
});

export default Input;
