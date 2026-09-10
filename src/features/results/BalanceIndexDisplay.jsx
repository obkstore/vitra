import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Brain, Zap } from 'lucide-react';
import { usePlan } from '../../context/PlanContext';
import { useUserProfile } from '../../context/UserProfileContext';
import Card from '../../components/ui/Card';
import { calculateBalanceIndex } from '../../utils/balanceIndex';

const DEFAULT_BALANCE_INDEX = {
  score: 0,
  nutritionScore: 0,
  mentalScore: 0,
  activityScore: 0,
  levelAr: 'غير متاح',
  color: '#94a3b8',
  insights: [],
  recommendations: [],
};

const SUB_SCORE_CONFIG = [
  {
    key: 'mentalScore',
    label: 'النتيجة النفسية',
    fillClass: 'bg-purple-500',
  },
  {
    key: 'activityScore',
    label: 'النتيجة البدنية',
    fillClass: 'bg-emerald-500',
  },
  {
    key: 'nutritionScore',
    label: 'الجاهزية الغذائية',
    fillClass: 'bg-amber-500',
  },
];

const SIZE_CONFIG = {
  sm: { diameter: 116, stroke: 10 },
  md: { diameter: 146, stroke: 12 },
  lg: { diameter: 186, stroke: 14 },
};

/**
 * @param {number} value
 * @returns {number}
 */
function clampScore(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numeric)));
}

/**
 * @param {number} score
 * @returns {string}
 */
function getGaugeColor(score) {
  if (score >= 75) {
    return '#10b981';
  }

  if (score >= 55) {
    return '#f59e0b';
  }

  return '#ef4444';
}

/**
 * Circular gauge used to visualize the global balance score.
 *
 * @param {{ score: number, size?: 'sm'|'md'|'lg', animated?: boolean }} props
 * @returns {JSX.Element}
 */
function ScoreGauge({ score, size = 'md', animated = true }) {
  const normalizedScore = clampScore(score);
  const [animatedScore, setAnimatedScore] = useState(animated ? 0 : normalizedScore);

  const dimensions = SIZE_CONFIG[size] ?? SIZE_CONFIG.md;
  const radius = (dimensions.diameter - dimensions.stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setAnimatedScore(normalizedScore);
    });

    return () => cancelAnimationFrame(frameId);
  }, [animated, normalizedScore]);

  const dashOffset = circumference - (animatedScore / 100) * circumference;
  const gaugeColor = getGaugeColor(normalizedScore);

  return (
    <div className="relative inline-flex items-center justify-center" aria-label={`مؤشر التوازن ${normalizedScore} من 100`}>
      <svg
        width={dimensions.diameter}
        height={dimensions.diameter}
        viewBox={`0 0 ${dimensions.diameter} ${dimensions.diameter}`}
        className="-rotate-90"
      >
        <circle
          cx={dimensions.diameter / 2}
          cy={dimensions.diameter / 2}
          r={radius}
          fill="none"
          stroke="rgba(148, 163, 184, 0.25)"
          strokeWidth={dimensions.stroke}
        />
        <circle
          cx={dimensions.diameter / 2}
          cy={dimensions.diameter / 2}
          r={radius}
          fill="none"
          stroke={gaugeColor}
          strokeWidth={dimensions.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 850ms ease-out' }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-4xl font-bold text-slate-800 leading-none">{normalizedScore}</p>
        <p className="text-xs text-slate-500 mt-1">من 100</p>
      </div>
    </div>
  );
}

/**
 * Displays the health Balance Index with score visualization, insights, and instant recommendations.
 * Data is read directly from plan context.
 *
 * @returns {JSX.Element}
 */
export default function BalanceIndexDisplay() {
  const { balanceIndex: storedIndex } = usePlan();
  const { userProfile } = useUserProfile();

  const balanceIndex = useMemo(() => {
    if (storedIndex && typeof storedIndex.score === 'number') return storedIndex;
    return calculateBalanceIndex(userProfile);
  }, [storedIndex, userProfile]);
  const resolvedIndex = balanceIndex ?? DEFAULT_BALANCE_INDEX;

  const score = clampScore(resolvedIndex.score);
  const mentalScore = clampScore(resolvedIndex.mentalScore);
  const activityScore = clampScore(resolvedIndex.activityScore);
  const nutritionScore = clampScore(resolvedIndex.nutritionScore);

  const insights = Array.isArray(resolvedIndex.insights) && resolvedIndex.insights.length > 0
    ? resolvedIndex.insights
    : ['لا توجد ملاحظات كافية حالياً. أكمل بياناتك لتحليل أعمق.'];

  const recommendations = Array.isArray(resolvedIndex.recommendations) && resolvedIndex.recommendations.length > 0
    ? resolvedIndex.recommendations
    : ['ابدأ بخطوة بسيطة اليوم: وجبة متوازنة + 20 دقيقة حركة خفيفة.'];

  const levelColor = resolvedIndex.color ?? '#94a3b8';
  const levelLabel = resolvedIndex.levelAr ?? 'غير متاح';

  const targetWidths = useMemo(
    () => ({
      mentalScore,
      activityScore,
      nutritionScore,
    }),
    [mentalScore, activityScore, nutritionScore]
  );

  const [animatedWidths, setAnimatedWidths] = useState({
    mentalScore: 0,
    activityScore: 0,
    nutritionScore: 0,
  });

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      setAnimatedWidths(targetWidths);
    });

    return () => cancelAnimationFrame(frameId);
  }, [targetWidths]);

  return (
    <Card variant="default" className="p-6 md:p-8 border border-mental-100 bg-gradient-to-br from-white via-white to-mental-50/40" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-mental-100 text-mental-700 shadow-sm">
            <BarChart3 className="h-5 w-5" />
          </span>

          <div>
            <h3 className="text-xl md:text-2xl font-bold text-slate-800">مؤشر التوازن الصحي</h3>
            <p className="text-sm text-slate-500 mt-1">ربط علمي بين غذائك وجسدك وعقلك</p>
          </div>
        </div>

        <span
          className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-semibold"
          style={{
            color: levelColor,
            borderColor: levelColor,
            backgroundColor: `${levelColor}1A`,
          }}
        >
          {levelLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-7">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-center lg:justify-start">
            <ScoreGauge size="lg" animated score={score} />
          </div>

          <div className="space-y-4">
            {SUB_SCORE_CONFIG.map((item) => {
              const rawScore = targetWidths[item.key];
              const width = animatedWidths[item.key];

              return (
                <div key={item.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold text-slate-700">{item.label}</p>
                    <p className="font-bold text-slate-800">{rawScore}/100</p>
                  </div>

                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`${item.fillClass} h-full rounded-full transition-all duration-700`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-mental-100 bg-mental-50/60 p-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Brain className="h-4.5 w-4.5 text-mental-600" />
              <h4 className="font-bold">ما يقوله مؤشرك</h4>
            </div>

            <div className="mt-3 space-y-3">
              {insights.map((insight, index) => (
                <div key={`${index}-${insight}`} className="flex items-start gap-2.5">
                  <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
                  <p className="text-sm text-slate-600 leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-white p-4 mt-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-800">
              <Zap className="h-4.5 w-4.5 text-amber-500" />
              <h4 className="font-bold">توصيات فورية</h4>
            </div>

            <div className="mt-3 space-y-3">
              {recommendations.map((recommendation, index) => (
                <div key={`${index}-${recommendation}`} className="flex items-start gap-2.5">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 shrink-0">
                    {index + 1}
                  </span>
                  <p className="text-sm text-slate-600 leading-relaxed">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
