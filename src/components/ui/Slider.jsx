import { useId } from 'react';
import clsx from 'clsx';

/**
 * @typedef {Object} SliderOwnProps
 * @property {string} [label] Field label displayed above the slider.
 * @property {number} value Current slider value.
 * @property {number} [min=1] Minimum slider value.
 * @property {number} [max=5] Maximum slider value.
 * @property {number} [step=1] Slider increment step.
 * @property {string[]} [labels] Optional labels shown under each slider step.
 * @property {(event: import('react').ChangeEvent<HTMLInputElement>) => void} [onChange] Change handler.
 * @property {'green' | 'purple' | 'amber'} [color='green'] Active color for thumb and filled track.
 * @property {boolean} [showValue=true] Displays a value badge beside the label.
 * @property {string} [className] Additional classes for the wrapper.
 */

/**
 * @typedef {SliderOwnProps & Omit<import('react').InputHTMLAttributes<HTMLInputElement>, 'type' | 'min' | 'max' | 'step' | 'value' | 'onChange' | 'className'>} SliderProps
 */

const colorStyles = {
  green: {
    hex: '#0f766e',
    badge: 'bg-brand-100 text-brand-700',
  },
  purple: {
    hex: '#7c3aed',
    badge: 'bg-mental-100 text-mental-700',
  },
  amber: {
    hex: '#d97706',
    badge: 'bg-energy-100 text-energy-700',
  },
};

/**
 * Styled range slider for mental state metrics on a 1-5 scale.
 *
 * @param {SliderProps} props Slider props and native input attributes.
 * @returns {JSX.Element}
 */
export default function Slider({
  label,
  value,
  min = 1,
  max = 5,
  step = 1,
  labels,
  onChange,
  color = 'green',
  showValue = true,
  className,
  id,
  ...rest
}) {
  const reactId = useId().replace(/:/g, '');
  const scopeClass = `slider-scope-${reactId}`;
  const inputId = id ?? `slider-${reactId}`;

  const minValue = Number(min);
  const maxValue = Number(max);
  const stepValue = Number(step) || 1;
  const numericValue = Number(value);
  const clampedValue = Number.isFinite(numericValue)
    ? Math.min(maxValue, Math.max(minValue, numericValue))
    : minValue;

  const percentage = maxValue === minValue
    ? 0
    : ((clampedValue - minValue) / (maxValue - minValue)) * 100;

  const selectedColor = colorStyles[color] ?? colorStyles.green;

  const valueIndex = Math.round((clampedValue - minValue) / stepValue);
  const currentLabel = Array.isArray(labels) && labels.length > 0
    ? labels[valueIndex] ?? clampedValue
    : clampedValue;

  return (
    <div className={clsx(scopeClass, 'w-full', className)} style={{ '--slider-thumb-color': selectedColor.hex }}>
      <style>{`
        .${scopeClass} .slider-range {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 0.5rem;
          border-radius: 9999px;
          background-color: #e2e8f0;
          outline: none;
          transition: all 200ms ease;
        }

        .${scopeClass} .slider-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 9999px;
          cursor: pointer;
          border: 2px solid #ffffff;
          background-color: var(--slider-thumb-color);
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
        }

        .${scopeClass} .slider-range::-moz-range-thumb {
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 9999px;
          cursor: pointer;
          border: 2px solid #ffffff;
          background-color: var(--slider-thumb-color);
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
        }

        .${scopeClass} .slider-range::-moz-range-track {
          height: 0.5rem;
          border-radius: 9999px;
          background: transparent;
        }
      `}</style>

      <div className="flex justify-between mb-2">
        <label htmlFor={inputId} className="text-sm font-semibold text-slate-700">
          {label}
        </label>

        {showValue && (
          <span className={clsx('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', selectedColor.badge)}>
            {currentLabel}
          </span>
        )}
      </div>

      <input
        id={inputId}
        type="range"
        min={minValue}
        max={maxValue}
        step={stepValue}
        value={clampedValue}
        onChange={onChange}
        className="slider-range w-full cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${selectedColor.hex} 0%, ${selectedColor.hex} ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
        }}
        {...rest}
      />

      {Array.isArray(labels) && labels.length > 0 ? (
        <div className="flex justify-between mt-1">
          {labels.map((item, index) => (
            <span key={`${item}-${index}`} className="text-xs text-slate-400">
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
