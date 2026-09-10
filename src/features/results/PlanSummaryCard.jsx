import { Sparkles, Shield, Smile, TrendingDown, TrendingUp } from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { calculateBMI } from '../../utils/nutritionCalculator';

/**
 * @typedef {'lose_weight'|'gain_weight'|'improve_mood'|'maintain'} GoalValue
 */

const GOAL_CONFIG = {
  lose_weight: {
    labelAr: 'هدفك: إنقاص الوزن',
    icon: TrendingDown,
  },
  gain_weight: {
    labelAr: 'هدفك: زيادة الوزن والعضلات',
    icon: TrendingUp,
  },
  improve_mood: {
    labelAr: 'هدفك: تحسين المزاج والطاقة',
    icon: Smile,
  },
  maintain: {
    labelAr: 'هدفك: المحافظة على الوزن',
    icon: Shield,
  },
};

/**
 * Top hero card that summarizes generated plan metrics and nutrition distribution.
 * Reads all required data directly from Plan and UserProfile contexts.
 *
 * @returns {JSX.Element}
 */
export default function PlanSummaryCard() {
  const { generatedPlan, nutritionPlan } = usePlan();
  const { userProfile } = useUserProfile();

  const dailyCalories = Number(nutritionPlan?.dailyCalories ?? 0);
  const proteinGrams = Number(nutritionPlan?.proteinGrams ?? 0);
  const carbsGrams = Number(nutritionPlan?.carbsGrams ?? 0);
  const fatGrams = Number(nutritionPlan?.fatGrams ?? 0);
  const hydration = Number(nutritionPlan?.hydrationLiters ?? 0);
  const weeks = Number(generatedPlan?.planDurationWeeks ?? 4);

  const bmi = calculateBMI(userProfile.weight, userProfile.height);

  const proteinPercent = dailyCalories > 0 ? Math.round((proteinGrams * 4 / dailyCalories) * 100) : 0;
  const carbsPercent = dailyCalories > 0 ? Math.round((carbsGrams * 4 / dailyCalories) * 100) : 0;
  const fatPercent = dailyCalories > 0 ? Math.round((fatGrams * 9 / dailyCalories) * 100) : 0;

  /** @type {GoalValue} */
  const goal = userProfile.goal;
  const goalConfig = GOAL_CONFIG[goal] ?? GOAL_CONFIG.maintain;
  const GoalIcon = goalConfig.icon;

  const macroBars = [
    {
      key: 'protein',
      label: 'البروتين',
      grams: proteinGrams,
      percent: proteinPercent,
      fillClass: 'bg-purple-400',
      pillClass: 'bg-purple-100 text-purple-700',
    },
    {
      key: 'carbs',
      label: 'الكربوهيدرات',
      grams: carbsGrams,
      percent: carbsPercent,
      fillClass: 'bg-amber-400',
      pillClass: 'bg-amber-100 text-amber-700',
    },
    {
      key: 'fat',
      label: 'الدهون',
      grams: fatGrams,
      percent: fatPercent,
      fillClass: 'bg-rose-400',
      pillClass: 'bg-rose-100 text-rose-700',
    },
  ];

  return (
    <div
      dir="rtl"
      className="bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%),linear-gradient(135deg,#7c3aed_0%,#0f766e_52%,#14b8a6_100%)] rounded-3xl p-8 text-white shadow-glow"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/90">
            <Sparkles className="h-3.5 w-3.5" />
            VITRA
          </div>
          <h2 className="mt-3 text-2xl md:text-3xl font-bold leading-relaxed text-white">خطتك الصحية المخصصة</h2>
          <p className="text-white/75 mt-1 max-w-2xl leading-relaxed">مولّدة بالذكاء الاصطناعي بناءً على بياناتك مع توزيع واضح للطاقة، البروتين، والنشاط.</p>
        </div>

        <Sparkles className="h-12 w-12 text-white/45 shrink-0" aria-hidden="true" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <div className="rounded-2xl border border-white/10 bg-white/12 p-4 backdrop-blur-sm">
          <p className="text-white/70 text-sm">🔥 السعرات</p>
          <p className="font-bold text-2xl mt-1">{dailyCalories}</p>
          <p className="text-white/70 text-sm mt-1">سعرة/يوم</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/12 p-4 backdrop-blur-sm">
          <p className="text-white/70 text-sm">💪 البروتين</p>
          <p className="font-bold text-2xl mt-1">{proteinGrams}غ</p>
          <p className="text-white/70 text-sm mt-1">يومياً</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/12 p-4 backdrop-blur-sm">
          <p className="text-white/70 text-sm">💧 الماء</p>
          <p className="font-bold text-2xl mt-1">{hydration}ل</p>
          <p className="text-white/70 text-sm mt-1">يومياً</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/12 p-4 backdrop-blur-sm">
          <p className="text-white/70 text-sm">📅 المدة</p>
          <p className="font-bold text-2xl mt-1">{weeks}</p>
          <p className="text-white/70 text-sm mt-1">أسابيع</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm text-white/90 mb-3">توزيع العناصر الغذائية</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {macroBars.map((macro) => (
            <div key={macro.key} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{macro.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/80">{macro.grams}غ</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${macro.pillClass}`}>
                    {macro.percent}%
                  </span>
                </div>
              </div>

              <div className="h-2 rounded-full bg-white/20 overflow-hidden ring-1 ring-white/10">
                <div
                  className={`h-full rounded-full ${macro.fillClass}`}
                  style={{ width: `${Math.max(0, Math.min(100, macro.percent))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-sm font-semibold border border-white/10">
          <GoalIcon className="h-4 w-4" />
          <span>{goalConfig.labelAr}</span>
        </div>

        <div className="inline-flex items-center gap-2">
          <span className="text-sm text-white/80">مؤشر كتلة الجسم:</span>
          <span
            className="inline-flex items-center rounded-full border bg-white/95 px-3 py-1 text-sm font-bold"
            style={{ color: bmi.color, borderColor: bmi.color }}
          >
            {bmi.value} — {bmi.categoryAr}
          </span>
        </div>
      </div>
    </div>
  );
}
