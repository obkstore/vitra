import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Download, Home, Printer, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { usePlan } from '../../context/PlanContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { useStepper } from '../../context/StepperContext';
import { buildResultsHtml } from './exportHtml';

const GOAL_LABELS = {
  lose_weight: 'إنقاص الوزن',
  gain_weight: 'زيادة الوزن والعضلات',
  improve_mood: 'تحسين المزاج والطاقة',
  maintain: 'المحافظة على الوزن',
};

/**
 * @param {unknown[]} entries
 * @returns {string[]}
 */
function extractMealNames(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry;
      }

      if (entry && typeof entry === 'object') {
        const meal = /** @type {Record<string, unknown>} */ (entry);
        return typeof meal.name === 'string' ? meal.name : null;
      }

      return null;
    })
    .filter((name) => Boolean(name));
}

/**
 * Results page export actions: print, copy textual plan summary, and reset/start a new plan.
 * Reads all data directly from app contexts. The downloadable HTML document
 * itself is built by ./exportHtml (pure, unit-tested).
 *
 * @returns {JSX.Element}
 */
export default function ExportActions() {
  const navigate = useNavigate();
  const { generatedPlan, nutritionPlan, exercisePlan, balanceIndex: storedBalanceIndex, resetPlan } = usePlan();
  const { userProfile, resetProfile } = useUserProfile();
  const { resetStepper } = useStepper();

  const generatedAtLabel = useMemo(() => {
    const dateValue = generatedPlan?.generatedAt;

    if (!dateValue) {
      return 'غير متاح';
    }

    const parsedDate = new Date(dateValue);
    return Number.isNaN(parsedDate.getTime())
      ? 'غير متاح'
      : parsedDate.toLocaleDateString('ar-SA');
  }, [generatedPlan?.generatedAt]);

  const summaryText = useMemo(() => {
    const goalLabel = GOAL_LABELS[userProfile.goal] ?? userProfile.goal;

    const dailyCalories = Number(nutritionPlan?.dailyCalories ?? 0);
    const proteinGrams = Number(nutritionPlan?.proteinGrams ?? 0);
    const carbsGrams = Number(nutritionPlan?.carbsGrams ?? 0);
    const fatGrams = Number(nutritionPlan?.fatGrams ?? 0);

    const firstDayMealsRaw =
      Array.isArray(nutritionPlan?.weeklyPlan) && nutritionPlan.weeklyPlan.length > 0
        ? nutritionPlan.weeklyPlan[0]?.meals
        : nutritionPlan?.meals;

    const firstDayMeals = extractMealNames(firstDayMealsRaw).join('، ');

    const firstWorkout =
      Array.isArray(exercisePlan?.weeklyWorkouts) && exercisePlan.weeklyWorkouts.length > 0
        ? exercisePlan.weeklyWorkouts[0]
        : null;

    const firstWorkoutHeader = firstWorkout
      ? `${firstWorkout.day} — ${firstWorkout.type}`
      : 'غير متاح';

    const firstWorkoutExercises = Array.isArray(firstWorkout?.exercises)
      ? firstWorkout.exercises
        .map((exercise) => {
          if (!exercise || typeof exercise !== 'object') {
            return null;
          }

          const item = /** @type {Record<string, unknown>} */ (exercise);
          return typeof item.name === 'string' ? item.name : null;
        })
        .filter((name) => Boolean(name))
        .slice(0, 4)
        .join('، ')
      : '';

    return [
      'خطة VITRA',
      '',
      `الهدف الصحي: ${goalLabel}`,
      `السعرات اليومية: ${dailyCalories} سعرة`,
      `المغذيات الكبرى: بروتين ${proteinGrams}غ | كربوهيدرات ${carbsGrams}غ | دهون ${fatGrams}غ`,
      `وجبات اليوم الأول: ${firstDayMeals || 'غير متاح'}`,
      `أول تمرين: ${firstWorkoutHeader}`,
      `تفاصيل التمرين: ${firstWorkoutExercises || 'غير متاح'}`,
    ].join('\n');
  }, [exercisePlan, nutritionPlan, userProfile.goal]);

  const handlePrint = () => {
    window.print();
  };

  const handleSaveResultPage = () => {
    const html = buildResultsHtml({
      nutritionPlan,
      exercisePlan,
      balanceIndex: storedBalanceIndex,
      generatedPlan,
      userProfile,
    });
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vitra-result-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast.success('✅ تم حفظ صفحة النتائج المنسقة.');
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success('✅ تم نسخ الخطة!');
    } catch {
      toast.error('تعذر نسخ الخطة. حاول مرة أخرى.');
    }
  };

  const handleStartNewPlan = () => {
    const isConfirmed = window.confirm('هل أنت متأكد؟ ستفقد خطتك الحالية');
    if (!isConfirmed) {
      return;
    }

    resetPlan();
    resetProfile();
    resetStepper();
    navigate('/onboarding');
  };

  return (
    <Card variant="flat" className="export-actions-root border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-brand-50/60" dir="rtl">
      <style>{`
        @media print {
          .export-actions-buttons {
            display: none !important;
          }

          body,
          .export-actions-root {
            background: #ffffff !important;
          }

          .export-actions-root,
          .export-actions-root * {
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="space-y-4">
        <p className="text-xs text-slate-500 text-center leading-relaxed">
          تاريخ التوليد: {generatedAtLabel}
        </p>

        <div className="export-actions-buttons flex flex-wrap gap-3 justify-center">
          <Button variant="ghost" leftIcon={<Home className="h-4 w-4" />} onClick={() => navigate('/')}>
            العودة للرئيسية
          </Button>

          <Button variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
            طباعة الخطة
          </Button>

          <Button variant="primary" leftIcon={<Download className="h-4 w-4" />} onClick={handleSaveResultPage}>
            حفظ صفحة النتائج كاملة
          </Button>

          <Button variant="ghost" leftIcon={<Copy className="h-4 w-4" />} onClick={handleCopySummary}>
            نسخ الخطة نصياً
          </Button>

          <Button
            variant="ghost"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleStartNewPlan}
          >
            خطة جديدة
          </Button>
        </div>
      </div>
    </Card>
  );
}
