import { useState } from 'react';
import clsx from 'clsx';
import { Apple, ChevronDown, Clock3, Moon, Sunrise, Sun, UtensilsCrossed } from 'lucide-react';

/**
 * @typedef {Object} Meal
 * @property {string} name Meal name.
 * @property {string} time Suggested meal time.
 * @property {string[]} ingredients Ingredient list for the meal.
 * @property {number} calories Meal calories.
 * @property {number} prepTimeMinutes Estimated preparation time in minutes.
 * @property {string} recipe Meal preparation instructions.
 */

/**
 * @typedef {Object} MealCardProps
 * @property {Meal} meal Meal object to display.
 * @property {'breakfast'|'lunch'|'dinner'|'snack'} mealType Meal type key.
 * @property {boolean} [isExpanded=false] Controlled expanded state; when omitted, internal state is used.
 * @property {string} [className] Additional wrapper classes.
 */

const MEAL_CONFIG = {
  breakfast: {
    labelAr: 'الفطور',
    icon: 'Sunrise',
    color: 'sunrise',
    bg: 'from-energy-50 via-white to-brand-50',
    border: 'border-energy-100',
  },
  lunch: {
    labelAr: 'الغداء',
    icon: 'Sun',
    color: 'brand',
    bg: 'from-brand-50 via-white to-mental-50',
    border: 'border-brand-100',
  },
  dinner: {
    labelAr: 'العشاء',
    icon: 'Moon',
    color: 'mental',
    bg: 'from-mental-50 via-white to-slate-50',
    border: 'border-mental-100',
  },
  snack: {
    labelAr: 'وجبة خفيفة',
    icon: 'Apple',
    color: 'accent',
    bg: 'from-slate-50 via-white to-brand-50',
    border: 'border-slate-100',
  },
};

const ICON_MAP = {
  Sunrise,
  Sun,
  Moon,
  Apple,
};

const COLOR_CLASS_MAP = {
  sunrise: 'text-energy-800 border-energy-200',
  brand: 'text-brand-800 border-brand-200',
  mental: 'text-mental-800 border-mental-200',
  accent: 'text-slate-700 border-slate-200',
};

const ICON_BADGE_COLOR_MAP = {
  sunrise: 'text-energy-800 border-energy-200 bg-white/85',
  brand: 'text-brand-800 border-brand-200 bg-white/85',
  mental: 'text-mental-800 border-mental-200 bg-white/85',
  accent: 'text-slate-700 border-slate-200 bg-white/85',
};

/**
 * Displays meal details with expandable recipe content.
 *
 * @param {MealCardProps} props
 * @returns {JSX.Element}
 */
export default function MealCard({ meal, mealType, isExpanded, className }) {
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isControlled = typeof isExpanded === 'boolean';
  const expanded = isControlled ? isExpanded : internalExpanded;

  const config = MEAL_CONFIG[mealType] ?? MEAL_CONFIG.lunch;
  const MealTypeIcon = ICON_MAP[config.icon] ?? UtensilsCrossed;
  const caloriesClass = COLOR_CLASS_MAP[config.color] ?? COLOR_CLASS_MAP.emerald;
  const iconBadgeClass = ICON_BADGE_COLOR_MAP[config.color] ?? ICON_BADGE_COLOR_MAP.emerald;

  const ingredients = Array.isArray(meal?.ingredients) ? meal.ingredients : [];

  const handleToggleExpanded = () => {
    if (!isControlled) {
      setInternalExpanded((prev) => !prev);
    }
  };

  return (
    <div
      data-detail-card="true"
      className={clsx(
        'rounded-2xl border bg-gradient-to-br p-5 transition-all duration-300 shadow-sm',
        config.bg,
        config.border,
        className
      )}
      dir="rtl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={clsx(
              'inline-flex h-10 w-10 items-center justify-center rounded-xl border shrink-0',
              iconBadgeClass
            )}
            aria-hidden="true"
          >
            <MealTypeIcon className="h-5 w-5" />
          </span>

          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-800 truncate">{meal?.name}</h3>
            <p className="text-sm font-medium text-slate-600">{config.labelAr}</p>
            <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              <span>
                {meal?.time} • {meal?.prepTimeMinutes} دقيقة
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 shrink-0">
          <span
            className={clsx(
              'inline-flex items-center rounded-full border bg-white/80 px-3 py-1 text-sm font-bold',
              caloriesClass
            )}
          >
            {meal?.calories} سعرة
          </span>

          <button
            type="button"
            data-detail-toggle="true"
            onClick={handleToggleExpanded}
            disabled={isControlled}
            className={clsx(
              'inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-600 transition-transform duration-300 shadow-sm',
              !isControlled && 'hover:bg-white hover:text-mental-700'
            )}
            aria-label={expanded ? 'إخفاء طريقة التحضير' : 'إظهار طريقة التحضير'}
          >
            <ChevronDown
              className={clsx('h-4.5 w-4.5 transition-transform duration-300', expanded && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {ingredients.map((ingredient) => (
          <span
            key={ingredient}
            className="bg-white/75 text-slate-600 text-xs px-2.5 py-1 rounded-full border border-white/80 shadow-sm"
          >
            {ingredient}
          </span>
        ))}
      </div>

      <div
        data-detail-panel="true"
        hidden={!expanded}
        className="mt-4 pt-4 border-t border-white/50 animate-fade-in"
      >
          <h4 className="text-sm font-bold text-slate-800 mb-1.5">طريقة التحضير</h4>
          <p className="text-sm text-slate-600 leading-relaxed">{meal?.recipe}</p>
      </div>
    </div>
  );
}
