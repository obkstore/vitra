import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, UtensilsCrossed } from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import Card from '../../components/ui/Card';
import MealCard from '../../components/display/MealCard';

const DAY_NAMES_AR = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const EMPTY_ITEMS = [];
const MEAL_TYPE_LABELS = {
  breakfast: 'الفطور',
  lunch: 'الغداء',
  dinner: 'العشاء',
  snack: 'وجبة خفيفة',
};

/**
 * @param {string} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase();
}

/**
 * @param {string} mealType
 * @param {string} dayLabel
 * @returns {Meal}
 */
function createPlaceholderMeal(mealType, dayLabel) {
  return {
    mealType,
    name: `${MEAL_TYPE_LABELS[mealType] ?? 'وجبة'} ${dayLabel}`,
    time: '--:--',
    ingredients: [],
    calories: 0,
    prepTimeMinutes: 0,
    recipe: 'لا تتوفر طريقة تحضير لهذه الوجبة حالياً.',
  };
}

/**
 * @typedef {import('../../types/index').Meal} Meal
 */

/**
 * @param {unknown} value
 * @param {string} fallbackName
 * @returns {Meal}
 */
function normalizeMeal(value, fallbackName) {
  const fallbackMealType = MEAL_TYPES.find((type) => fallbackName.includes(MEAL_TYPE_LABELS[type]));

  if (typeof value === 'string') {
    return {
      mealType: fallbackMealType,
      name: value,
      time: '--:--',
      ingredients: [],
      calories: 0,
      prepTimeMinutes: 0,
      recipe: 'لا تتوفر طريقة تحضير لهذه الوجبة حالياً.',
    };
  }

  if (value && typeof value === 'object') {
    const meal = /** @type {Record<string, unknown>} */ (value);
    const mealType = typeof meal.mealType === 'string' && MEAL_TYPES.includes(meal.mealType)
      ? meal.mealType
      : fallbackMealType;

    return {
      mealType,
      name: typeof meal.name === 'string' && meal.name.trim() ? meal.name : fallbackName,
      time: typeof meal.time === 'string' ? meal.time : '--:--',
      ingredients: Array.isArray(meal.ingredients) ? meal.ingredients.map((item) => String(item)) : [],
      calories: Number.isFinite(Number(meal.calories)) ? Number(meal.calories) : 0,
      prepTimeMinutes: Number.isFinite(Number(meal.prepTimeMinutes)) ? Number(meal.prepTimeMinutes) : 0,
      recipe: typeof meal.recipe === 'string' && meal.recipe.trim()
        ? meal.recipe
        : 'لا تتوفر طريقة تحضير لهذه الوجبة حالياً.',
    };
  }

  return {
    mealType: fallbackMealType,
    name: fallbackName,
    time: '--:--',
    ingredients: [],
    calories: 0,
    prepTimeMinutes: 0,
    recipe: 'لا تتوفر طريقة تحضير لهذه الوجبة حالياً.',
  };
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function readKeyedMeals(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * @param {unknown[]} baseMeals
 * @returns {{ byType: Record<string, Meal>, byName: Map<string, Meal> }}
 */
function buildBaseMealCatalog(baseMeals) {
  const byType = {};
  const byName = new Map();

  baseMeals.forEach((entry, index) => {
    const mealType = MEAL_TYPES[index] ?? 'snack';
    const fallbackName = `${MEAL_TYPE_LABELS[mealType] ?? 'وجبة'} أساسية`;
    const normalized = normalizeMeal(entry, fallbackName);
    const normalizedWithType = {
      ...normalized,
      mealType: normalized.mealType ?? mealType,
    };

    if (!byType[normalizedWithType.mealType]) {
      byType[normalizedWithType.mealType] = normalizedWithType;
    }

    const normalizedName = normalizeText(normalizedWithType.name);
    if (normalizedName) {
      byName.set(normalizedName, normalizedWithType);
    }
  });

  return { byType, byName };
}

/**
 * @param {unknown} rawMeal
 * @param {string} mealType
 * @param {string} dayLabel
 * @param {{ byType: Record<string, Meal>, byName: Map<string, Meal> }} catalog
 * @returns {Meal}
 */
function resolveMeal(rawMeal, mealType, dayLabel, catalog) {
  const fallbackName = `${MEAL_TYPE_LABELS[mealType] ?? 'وجبة'} ${dayLabel}`;

  if (typeof rawMeal === 'string') {
    const byName = catalog.byName.get(normalizeText(rawMeal));
    if (byName) {
      return {
        ...byName,
        name: rawMeal,
        mealType,
      };
    }

    const byType = catalog.byType[mealType];
    if (byType) {
      return {
        ...byType,
        name: rawMeal,
        mealType,
      };
    }

    return normalizeMeal(rawMeal, fallbackName);
  }

  if (rawMeal && typeof rawMeal === 'object') {
    const normalized = normalizeMeal(rawMeal, fallbackName);
    return {
      ...normalized,
      mealType: normalized.mealType ?? mealType,
    };
  }

  const byType = catalog.byType[mealType];
  if (byType) {
    return {
      ...byType,
      mealType,
    };
  }

  return createPlaceholderMeal(mealType, dayLabel);
}

/**
 * @param {unknown} dayPlan
 * @param {string} dayLabel
 * @param {{ byType: Record<string, Meal>, byName: Map<string, Meal> }} catalog
 * @returns {Meal[]}
 */
function resolveDayMeals(dayPlan, dayLabel, catalog) {
  const dayObject = readKeyedMeals(dayPlan);
  const mealsValue = dayObject.meals;
  const mealsArray = Array.isArray(mealsValue) ? mealsValue : EMPTY_ITEMS;
  const keyedMeals = readKeyedMeals(mealsValue);

  return MEAL_TYPES.map((mealType, index) => {
    const fromArray = mealsArray[index];
    const fromKeyedMeals = keyedMeals[mealType];
    const fromDirectDay = dayObject[mealType];

    const rawMeal = fromArray ?? fromKeyedMeals ?? fromDirectDay;
    return resolveMeal(rawMeal, mealType, dayLabel, catalog);
  });
}

/**
 * @param {unknown} dayPlan
 * @param {string} dayLabel
 * @param {Meal[]} meals
 * @returns {number}
 */
function resolveDayCalories(dayPlan, dayLabel, meals) {
  const dayObject = readKeyedMeals(dayPlan);
  const dayTotal = Number(dayObject.totalCalories ?? NaN);

  if (Number.isFinite(dayTotal)) {
    return dayTotal;
  }

  const fromMeals = meals.reduce((sum, meal) => sum + Number(meal.calories ?? 0), 0);
  if (fromMeals > 0) {
    return fromMeals;
  }

  return dayLabel ? 0 : 0;
}

/**
 * @param {unknown[]} weeklyPlan
 * @param {string} dayLabel
 * @param {number} fallbackIndex
 * @returns {unknown}
 */
function findDayPlan(weeklyPlan, dayLabel, fallbackIndex) {
  const normalizedTarget = normalizeText(dayLabel);

  const byName = weeklyPlan.find((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return false;
    }

    const day = /** @type {Record<string, unknown>} */ (entry).day;
    return typeof day === 'string' && normalizeText(day) === normalizedTarget;
  });

  return byName ?? weeklyPlan[fallbackIndex] ?? null;
}

/**
 * Weekly meal plan section with day tabs and daily/weekly views.
 * Reads nutrition plan directly from plan context.
 *
 * @returns {JSX.Element}
 */
export default function MealPlanSection() {
  const { nutritionPlan } = usePlan();
  const [selectedDay, setSelectedDay] = useState(0);
  const [activeView, setActiveView] = useState('daily');
  const [expandedWeekDay, setExpandedWeekDay] = useState(0);

  const weeklyPlan = Array.isArray(nutritionPlan?.weeklyPlan)
    ? nutritionPlan.weeklyPlan
    : EMPTY_ITEMS;
  const baseMeals = Array.isArray(nutritionPlan?.meals)
    ? nutritionPlan.meals
    : EMPTY_ITEMS;

  const weeklyDetails = useMemo(() => {
    const catalog = buildBaseMealCatalog(baseMeals);

    return DAY_NAMES_AR.map((dayLabel, dayIndex) => {
      const rawDayPlan = findDayPlan(weeklyPlan, dayLabel, dayIndex);
      const meals = resolveDayMeals(rawDayPlan, dayLabel, catalog);
      const totalCalories = resolveDayCalories(rawDayPlan, dayLabel, meals);

      return {
        dayLabel,
        meals,
        totalCalories,
      };
    });
  }, [baseMeals, weeklyPlan]);

  const selectedDayData = weeklyDetails[selectedDay] ?? weeklyDetails[0];
  const selectedDayMeals = selectedDayData?.meals ?? EMPTY_ITEMS;
  const selectedDayTotalCalories = selectedDayData?.totalCalories ?? 0;
  const selectedDayLabel = selectedDayData?.dayLabel ?? DAY_NAMES_AR[0] ?? 'اليوم';
  const selectedDayMealCount = selectedDayMeals.filter((meal) => Boolean(meal?.name)).length;
  const selectedDayAverageCalories = selectedDayMealCount > 0
    ? Math.round(selectedDayTotalCalories / selectedDayMealCount)
    : 0;

  return (
    <Card variant="default" className="p-6 md:p-8" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <UtensilsCrossed className="h-5 w-5" />
          </span>
          <h3 className="text-xl md:text-2xl font-bold leading-relaxed text-slate-800">الخطة الغذائية الأسبوعية</h3>
        </div>

        <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveView('daily')}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
              activeView === 'daily'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            يومي
          </button>

          <button
            type="button"
            onClick={() => setActiveView('weekly')}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors',
              activeView === 'weekly'
                ? 'bg-emerald-500 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            )}
          >
            أسبوعي
          </button>
        </div>
      </div>

      {activeView === 'daily' ? (
        <div className="mt-6">
          <div className="overflow-x-auto scrollbar-hide flex gap-2 pb-2">
            {DAY_NAMES_AR.map((dayLabel, dayIndex) => (
              <button
                key={dayLabel}
                type="button"
                onClick={() => setSelectedDay(dayIndex)}
                className={clsx(
                  'shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors border',
                  selectedDay === dayIndex
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                )}
              >
                {dayLabel}
              </button>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-800">تفاصيل {selectedDayLabel}</p>
                <p className="mt-1 text-sm text-emerald-700">
                  إجمالي السعرات {selectedDayTotalCalories} • {selectedDayMealCount} وجبات • متوسط {selectedDayAverageCalories} سعرة لكل وجبة
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                  {selectedDayTotalCalories} سعرة
                </span>
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">
                  {selectedDayMealCount} وجبات
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedDayMeals.map((meal, index) => (
                <span
                  key={`${selectedDayLabel}-${meal.mealType ?? MEAL_TYPES[index]}`}
                  className="rounded-full border border-emerald-200 bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {MEAL_TYPE_LABELS[meal.mealType] ?? 'وجبة'}: {meal.name}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {selectedDayMeals.map((meal, index) => (
              <MealCard
                key={`${selectedDayLabel}-${meal.mealType ?? MEAL_TYPES[index]}`}
                meal={meal}
                mealType={meal.mealType ?? MEAL_TYPES[index]}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {weeklyDetails.map((day, dayIndex) => (
            <div
              key={day.dayLabel}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            >
              <button
                type="button"
                onClick={() => setExpandedWeekDay((prev) => (prev === dayIndex ? -1 : dayIndex))}
                className="w-full flex items-center justify-between gap-3 text-right"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <p className="font-semibold text-slate-700">{day.dayLabel}</p>
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-3 py-1 text-xs font-bold">
                    {day.totalCalories} سعرة
                  </span>
                </div>

                <ChevronDown
                  className={clsx(
                    'h-4.5 w-4.5 text-slate-500 transition-transform duration-300',
                    expandedWeekDay === dayIndex && 'rotate-180'
                  )}
                />
              </button>

              {expandedWeekDay === dayIndex ? (
                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-700">ملخص {day.dayLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {day.meals.map((meal, mealIndex) => (
                        <span
                          key={`${day.dayLabel}-summary-${meal.mealType ?? MEAL_TYPES[mealIndex]}`}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600"
                        >
                          {MEAL_TYPE_LABELS[meal.mealType] ?? 'وجبة'} • {meal.calories || 0} سعرة
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {day.meals.map((meal, mealIndex) => (
                      <MealCard
                        key={`${day.dayLabel}-${meal.mealType ?? MEAL_TYPES[mealIndex]}`}
                        meal={meal}
                        mealType={meal.mealType ?? MEAL_TYPES[mealIndex]}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {day.meals.map((meal, mealIndex) => (
                    <span
                      key={`${day.dayLabel}-compact-${meal.mealType ?? MEAL_TYPES[mealIndex]}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {MEAL_TYPE_LABELS[meal.mealType] ?? 'وجبة'}: {meal.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
