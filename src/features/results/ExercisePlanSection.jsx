import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Dumbbell } from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import Card from '../../components/ui/Card';
import ExerciseCard from '../../components/display/ExerciseCard';

const DEFAULT_EXERCISE_PLAN = {
  weeklyWorkouts: [],
  dailyStepsGoal: 0,
};

/**
 * @typedef {import('../../types/index').Exercise} Exercise
 */

/**
 * @typedef {Object} Workout
 * @property {string} day
 * @property {string} type
 * @property {Exercise[]} exercises
 * @property {number} durationMinutes
 * @property {number} caloriesBurned
 */

/**
 * Resolves workout type label and badge color classes.
 *
 * @param {string} rawType
 * @returns {{ label: string, className: string }}
 */
function resolveWorkoutTypeMeta(rawType) {
  const type = String(rawType ?? '').trim();
  const normalized = type.toLowerCase();

  if (normalized.includes('قوة') || normalized.includes('strength')) {
    return { label: 'قوة', className: 'bg-mental-100 text-mental-700 border-mental-200' };
  }

  if (normalized.includes('كارديو') || normalized.includes('cardio')) {
    return { label: 'كارديو', className: 'bg-energy-100 text-energy-700 border-energy-200' };
  }

  if (
    normalized.includes('مرونة')
    || normalized.includes('mobility')
    || normalized.includes('flex')
    || normalized.includes('stretch')
  ) {
    return { label: 'مرونة', className: 'bg-brand-100 text-brand-700 border-brand-200' };
  }

  if (normalized.includes('وظيفي') || normalized.includes('functional')) {
    return { label: 'وظيفي', className: 'bg-slate-100 text-slate-700 border-slate-200' };
  }

  if (normalized.includes('مشي') || normalized.includes('walk')) {
    return { label: 'مشي', className: 'bg-brand-100 text-brand-700 border-brand-200' };
  }

  return {
    label: type || 'تمرين',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  };
}

/**
 * @param {unknown} value
 * @returns {Workout[]}
 */
function normalizeWorkouts(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return {
        day: `اليوم ${index + 1}`,
        type: 'تمرين',
        exercises: [],
        durationMinutes: 0,
        caloriesBurned: 0,
      };
    }

    const workout = /** @type {Record<string, unknown>} */ (entry);

    return {
      day: typeof workout.day === 'string' ? workout.day : `اليوم ${index + 1}`,
      type: typeof workout.type === 'string' ? workout.type : 'تمرين',
      exercises: Array.isArray(workout.exercises) ? /** @type {Exercise[]} */ (workout.exercises) : [],
      durationMinutes: Number.isFinite(Number(workout.durationMinutes)) ? Number(workout.durationMinutes) : 0,
      caloriesBurned: Number.isFinite(Number(workout.caloriesBurned)) ? Number(workout.caloriesBurned) : 0,
    };
  });
}

/**
 * Weekly exercise plan section with day tabs and detailed workout preview.
 * Reads exercise plan directly from plan context.
 *
 * @returns {JSX.Element}
 */
export default function ExercisePlanSection() {
  const { exercisePlan } = usePlan();
  const [selectedWorkout, setSelectedWorkout] = useState(0);

  const resolvedPlan = exercisePlan ?? DEFAULT_EXERCISE_PLAN;
  const weeklyWorkouts = useMemo(
    () => normalizeWorkouts(resolvedPlan.weeklyWorkouts),
    [resolvedPlan.weeklyWorkouts]
  );

  const activeWorkoutIndex = selectedWorkout >= weeklyWorkouts.length ? 0 : selectedWorkout;
  const selectedWorkoutData = weeklyWorkouts[activeWorkoutIndex] ?? null;
  const selectedWorkoutTypeMeta = resolveWorkoutTypeMeta(selectedWorkoutData?.type ?? '');

  const weeklyStats = useMemo(() => {
    const count = weeklyWorkouts.length;

    const totalDuration = weeklyWorkouts.reduce(
      (sum, workout) => sum + Number(workout.durationMinutes ?? 0),
      0
    );

    const totalCalories = weeklyWorkouts.reduce(
      (sum, workout) => sum + Number(workout.caloriesBurned ?? 0),
      0
    );

    const avgDuration = count > 0 ? Math.round(totalDuration / count) : 0;

    return {
      workoutDays: count,
      avgDuration,
      totalCalories,
      dailyStepsGoal: Number(resolvedPlan.dailyStepsGoal ?? 0),
    };
  }, [weeklyWorkouts, resolvedPlan.dailyStepsGoal]);

  return (
    <Card variant="default" className="p-6 md:p-8 border border-brand-100 bg-gradient-to-br from-white via-white to-brand-50/40" dir="rtl">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 shadow-sm">
          <Dumbbell className="h-5 w-5" />
        </span>
        <h3 className="text-xl md:text-2xl font-bold leading-relaxed text-slate-800">خطة النشاط البدني</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
        <div className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
          🗓 {weeklyStats.workoutDays} أيام تمرين أسبوعياً
        </div>
        <div className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
          ⏱ متوسط {weeklyStats.avgDuration} دقيقة/جلسة
        </div>
        <div className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
          🔥 {weeklyStats.totalCalories} سعرة/أسبوع
        </div>
        <div className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
          👟 {weeklyStats.dailyStepsGoal} خطوة يومياً
        </div>
      </div>

      {weeklyWorkouts.length > 0 ? (
        <>
          <div className="overflow-x-auto scrollbar-hide flex gap-2 pb-2 mt-6">
            {weeklyWorkouts.map((workout, index) => {
              const typeMeta = resolveWorkoutTypeMeta(workout.type);

              return (
                <button
                  key={`${workout.day}-${index}`}
                  type="button"
                  onClick={() => setSelectedWorkout(index)}
                  className={clsx(
                    'shrink-0 rounded-full px-4 py-2 text-sm font-semibold border transition-colors',
                    activeWorkoutIndex === index
                      ? 'bg-gradient-to-r from-mental-600 to-brand-600 text-white border-transparent shadow-md'
                      : 'bg-white text-slate-700 border-brand-100 hover:border-brand-300'
                  )}
                >
                  {workout.day} — {typeMeta.label}
                </button>
              );
            })}
          </div>

          {selectedWorkoutData ? (
            <div className="mt-5 rounded-2xl border border-brand-100 bg-gradient-to-br from-white via-white to-brand-50/40 p-4 md:p-5 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-slate-800">{selectedWorkoutData.day}</h4>
                  <span
                    className={clsx(
                      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
                      selectedWorkoutTypeMeta.className
                    )}
                  >
                    {selectedWorkoutTypeMeta.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
                    ⏱ {selectedWorkoutData.durationMinutes} دقيقة
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700">
                    🔥 {selectedWorkoutData.caloriesBurned} سعرة
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-energy-100 bg-energy-50 px-4 py-3 text-sm text-energy-800">
                ابدأ بـ 5 دقائق إحماء خفيف قبل التمرين
              </div>

              <div className="mt-4 space-y-3">
                {selectedWorkoutData.exercises.length > 0 ? (
                  selectedWorkoutData.exercises.map((exercise, index) => (
                    <ExerciseCard key={`${activeWorkoutIndex}-${index}`} exercise={exercise} index={index + 1} />
                  ))
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
                    لا توجد تمارين مفصلة لهذا اليوم حالياً.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                اختم بـ 5 دقائق تمدد وإطالة
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          لا توجد جلسات تمرين متاحة حالياً.
        </div>
      )}

      {weeklyWorkouts.length < 7 ? (
        <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-brand-800">
          أيام الراحة مهمة للتعافي — لا تتخطّ يوم الراحة حتى لو كنت تشعر بالنشاط
        </div>
      ) : null}
    </Card>
  );
}
