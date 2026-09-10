import clsx from 'clsx';
import { CheckCircle2, Shield, Smile, TrendingDown, TrendingUp } from 'lucide-react';
import { useUserProfile } from '../../../context/UserProfileContext';
import { CONSTANTS } from '../../../types/index';

const GOAL_UI = {
  lose_weight: {
    icon: TrendingDown,
    label: 'إنقاص الوزن',
    description: 'أريد تقليل وزني بطريقة صحية ومستدامة',
  },
  gain_weight: {
    icon: TrendingUp,
    label: 'زيادة الوزن والعضلات',
    description: 'أريد بناء كتلة عضلية وزيادة وزني',
  },
  improve_mood: {
    icon: Smile,
    label: 'تحسين المزاج والطاقة',
    description: 'أعاني من تعب نفسي أو قلة طاقة وأريد التحسّن',
  },
  maintain: {
    icon: Shield,
    label: 'المحافظة على الوزن',
    description: 'وزني مناسب وأريد نمطاً صحياً مستداماً',
  },
};

/**
 * Step 3 goal picker using large radio-style cards.
 *
 * @returns {JSX.Element}
 */
export default function Step3Goals() {
  const { userProfile, updateField } = useUserProfile();

  const goals = CONSTANTS.GOALS
    .map((goal) => {
      const details = GOAL_UI[goal.value];

      if (!details) {
        return null;
      }

      return {
        value: goal.value,
        ...details,
      };
    })
    .filter(Boolean);

  return (
    <div dir="rtl" className="animate-slide-up space-y-4 text-right">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-800">ما هو هدفك الأساسي؟</h3>
        <p className="text-sm text-slate-500">اختر الهدف الذي تريد أن نبني خطتك حوله.</p>
      </div>

      <div className="space-y-3" role="radiogroup" aria-label="الهدف الصحي">
        {goals.map(({ value, icon: Icon }) => {
          const isSelected = userProfile.goal === value;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => updateField({ goal: value })}
              className={clsx(
                'w-full cursor-pointer border-2 rounded-2xl p-5 transition-all duration-200 text-right',
                isSelected
                  ? 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={clsx(
                      'inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white text-transparent'
                    )}
                    aria-hidden="true"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </span>

                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-[13.5rem] sm:max-w-[17rem]">
                    {GOAL_UI[value]?.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-base font-bold text-slate-800">{GOAL_UI[value]?.label}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
