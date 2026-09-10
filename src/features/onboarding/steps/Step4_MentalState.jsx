import { useMemo } from 'react';
import clsx from 'clsx';
import { Brain, HeartPulse } from 'lucide-react';
import Slider from '../../../components/ui/Slider';
import { useUserProfile } from '../../../context/UserProfileContext';
import calculateBalanceIndex, { calculateMentalScore } from '../../../utils/balanceIndex';
import { CONSTANTS } from '../../../types/index';

/**
 * Returns display metadata for the mental score card.
 *
 * @param {number} score
 * @returns {{ barClass: string, insight: string }}
 */
function getMentalScoreMeta(score) {
  if (score >= 80) {
    return {
      barClass: 'bg-emerald-500',
      insight: 'توازن نفسي ممتاز حالياً. حافظ على هذا الإيقاع الصحي.',
    };
  }

  if (score >= 60) {
    return {
      barClass: 'bg-teal-500',
      insight: 'مؤشرك النفسي جيد، ويمكن تحسينه أكثر عبر نوم منتظم وتقليل التوتر.',
    };
  }

  if (score >= 40) {
    return {
      barClass: 'bg-amber-500',
      insight: 'توجد مؤشرات إجهاد متوسطة. خطوة بسيطة يومياً ستصنع فرقاً كبيراً.',
    };
  }

  return {
    barClass: 'bg-red-500',
    insight: 'مؤشرك النفسي منخفض حالياً. سنركّز على خطة ألطف تدعم تعافيك تدريجياً.',
  };
}

/**
 * Step 4 mental-state assessment using three sliders and a live mental score preview.
 *
 * @returns {JSX.Element}
 */
export default function Step4MentalState() {
  const { userProfile, updateMentalState } = useUserProfile();

  const stressLevel = Number(userProfile.mentalState?.stressLevel ?? 3);
  const sleepQuality = Number(userProfile.mentalState?.sleepQuality ?? 3);
  const energyLevel = Number(userProfile.mentalState?.energyLevel ?? 3);

  const mentalScore = useMemo(() => {
    const balance = calculateBalanceIndex(userProfile);
    return balance.mentalScore;
  }, [userProfile]);

  const mentalScoreFromMetric = useMemo(
    () => calculateMentalScore(userProfile.mentalState ?? {}),
    [userProfile.mentalState]
  );

  const mentalMeta = getMentalScoreMeta(mentalScoreFromMetric);

  return (
    <div dir="rtl" className="animate-slide-up space-y-6 text-right">
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
        <p className="text-sm leading-relaxed text-emerald-800">
          نعلم أن هذه أسئلة شخصية — إجاباتك تساعدنا على ربط خطتك الغذائية بحالتك النفسية للحصول على أفضل النتائج
        </p>
      </div>

      <div className="space-y-5">
        <Slider
          label="مستوى التوتر"
          color="purple"
          value={stressLevel}
          labels={CONSTANTS.STRESS_LABELS}
          onChange={(event) => updateMentalState({ stressLevel: Number(event.target.value) })}
        />

        <Slider
          label="جودة النوم"
          color="green"
          value={sleepQuality}
          labels={CONSTANTS.SLEEP_LABELS}
          onChange={(event) => updateMentalState({ sleepQuality: Number(event.target.value) })}
        />

        <Slider
          label="مستوى الطاقة اليومية"
          color="amber"
          value={energyLevel}
          labels={CONSTANTS.ENERGY_LABELS}
          onChange={(event) => updateMentalState({ energyLevel: Number(event.target.value) })}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Brain className="h-4.5 w-4.5 text-emerald-600" />
            <p className="text-sm font-semibold">مؤشرك النفسي الحالي: {mentalScore}/100</p>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            <HeartPulse className="h-3.5 w-3.5" />
            مباشر
          </span>
        </div>

        <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className={clsx('h-full transition-all duration-500', mentalMeta.barClass)}
            style={{ width: `${mentalScore}%` }}
          />
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">{mentalMeta.insight}</p>
      </div>
    </div>
  );
}
