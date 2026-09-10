import clsx from 'clsx';

/**
 * @typedef {Object} Exercise
 * @property {string} name Exercise name.
 * @property {number} sets Number of sets.
 * @property {string} reps Repetition prescription.
 * @property {number} restSeconds Rest time between sets in seconds.
 * @property {string} description Exercise instructions.
 * @property {'beginner'|'intermediate'|'advanced'} difficulty Difficulty level.
 */

/**
 * @typedef {Object} ExerciseCardProps
 * @property {Exercise} exercise Exercise object to display.
 * @property {number} index Display order index.
 * @property {string} [className] Additional wrapper classes.
 */

const DIFFICULTY_CONFIG = {
  beginner: {
    labelAr: 'مبتدئ',
    color: 'text-emerald-600',
    bg: 'bg-emerald-100',
    dots: 1,
  },
  intermediate: {
    labelAr: 'متوسط',
    color: 'text-amber-600',
    bg: 'bg-amber-100',
    dots: 2,
  },
  advanced: {
    labelAr: 'متقدم',
    color: 'text-red-600',
    bg: 'bg-red-100',
    dots: 3,
  },
};

/**
 * Displays a single exercise with difficulty, stats, and description.
 *
 * @param {ExerciseCardProps} props
 * @returns {JSX.Element}
 */
export default function ExerciseCard({ exercise, index, className }) {
  const difficulty = DIFFICULTY_CONFIG[exercise?.difficulty] ?? DIFFICULTY_CONFIG.beginner;
  const displayIndex = Number.isFinite(index) ? index : 1;

  return (
    <div
      dir="rtl"
      className={clsx(
        'bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all duration-200',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm flex items-center justify-center flex-shrink-0">
            {displayIndex}
          </span>
          <h4 className="font-bold text-slate-800 truncate">{exercise?.name}</h4>
        </div>

        <span
          className={clsx(
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
            difficulty.bg,
            difficulty.color
          )}
        >
          <span>{difficulty.labelAr}</span>
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((dotIndex) => (
              <span
                key={dotIndex}
                className={clsx(
                  'h-1.5 w-1.5 rounded-full',
                  dotIndex < difficulty.dots ? 'bg-current' : 'bg-slate-300'
                )}
              />
            ))}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <p className="font-bold text-slate-800 text-sm">{exercise?.sets}</p>
          <p className="text-xs text-slate-500 mt-0.5">📦 مجموعة</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <p className="font-bold text-slate-800 text-sm">{exercise?.reps}</p>
          <p className="text-xs text-slate-500 mt-0.5">🔁 تكرار</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <p className="font-bold text-slate-800 text-sm">{exercise?.restSeconds}ث</p>
          <p className="text-xs text-slate-500 mt-0.5">⏸ راحة</p>
        </div>
      </div>

      <p className="text-sm text-slate-500 mt-2 leading-relaxed">{exercise?.description}</p>
    </div>
  );
}
