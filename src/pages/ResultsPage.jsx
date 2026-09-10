import { CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import usePlan from '../context/PlanContext';
import PageWrapper from '../components/layout/PageWrapper';
import Button from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import PlanSummaryCard from '../features/results/PlanSummaryCard';
import BalanceIndexDisplay from '../features/results/BalanceIndexDisplay';
import MealPlanSection from '../features/results/MealPlanSection';
import ExercisePlanSection from '../features/results/ExercisePlanSection';
import ExportActions from '../features/results/ExportActions';
import useThemeMode from '../hooks/useThemeMode';

/**
 * Final results page that assembles all generated plan sections.
 *
 * @returns {JSX.Element}
 */
export default function ResultsPage() {
  const { isLoading } = usePlan();
  const navigate = useNavigate();
  const { themeMode } = useThemeMode();
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsRevealed(true), 90);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <PageWrapper maxWidth="xl" withHeader theme={themeMode}>
        <div dir="rtl" className="space-y-8 py-6 animate-fade-in">
          <SkeletonCard />
          <SkeletonCard />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper maxWidth="xl" withHeader theme={themeMode}>
      <div id="result-content" dir="rtl" className="space-y-10 py-8 animate-fade-in">
        <div
          className={clsx(
            'relative overflow-hidden rounded-3xl border px-6 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] transition-all duration-700',
            themeMode === 'dark'
              ? 'border-white/10 bg-[linear-gradient(180deg,rgba(13,17,23,0.98),rgba(27,77,62,0.9))] text-white'
              : 'border-white/90 bg-[radial-gradient(circle_at_top,_rgba(232,147,92,0.14),_transparent_36%),linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-900'
          )}
        >
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#E8935C] to-transparent animate-vitra-sweep" />
          <div className="absolute -left-6 top-0 h-28 w-28 rounded-full bg-[#E8935C]/20 blur-3xl" />
          <div className="absolute bottom-0 right-10 h-24 w-24 rounded-full bg-[#1B4D3E]/10 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center transition-all duration-700" style={{ opacity: isRevealed ? 1 : 0, transform: isRevealed ? 'translateY(0)' : 'translateY(14px)' }}>
            <div className={clsx('mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl border shadow-sm', themeMode === 'dark' ? 'border-white/10 bg-white/10 text-white' : 'border-white bg-white text-[#1B4D3E]')}>
              <CheckCircle className="h-7 w-7" />
            </div>

            <p className={clsx('mt-4 text-sm font-semibold tracking-[0.25em]', themeMode === 'dark' ? 'text-[#8DD9B0]' : 'text-[#1B4D3E]')}>
              VITRA
            </p>

            <p className={clsx('mt-3 text-3xl md:text-5xl font-black', themeMode === 'dark' ? 'text-white' : 'text-slate-900')}>
              خطتك جاهزة!
            </p>

            <p className={clsx('mx-auto mt-4 max-w-2xl text-base md:text-lg leading-relaxed', themeMode === 'dark' ? 'text-white/85' : 'text-slate-700')}>
              تم توليد خطتك المخصصة بناءً على بياناتك الشخصية حصراً، لا تشاركها مع شخص آخر نظراً لاختلاف العديد من التفاصيل بين كل فرد والآخر رغم تشابه الحالات.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <span className={clsx('inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold', themeMode === 'dark' ? 'bg-white/10 text-white' : 'bg-[#1B4D3E]/10 text-[#1B4D3E]')}>
                <Sparkles className="h-4 w-4" />
                توليد آمن ومتوافق مع بياناتك
              </span>

              <Button variant="secondary" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/')}>
                العودة للرئيسية
              </Button>
            </div>
          </div>
        </div>

        <div className={clsx('transition-all duration-700', isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')} style={{ transitionDelay: '120ms' }}>
          <PlanSummaryCard />
        </div>

        <div className={clsx('transition-all duration-700', isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')} style={{ transitionDelay: '180ms' }}>
          <BalanceIndexDisplay />
        </div>

        <div className={clsx('grid grid-cols-1 lg:grid-cols-2 gap-8 transition-all duration-700', isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')} style={{ transitionDelay: '240ms' }}>
          <MealPlanSection />
          <ExercisePlanSection />
        </div>

        <div className={clsx('transition-all duration-700', isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')} style={{ transitionDelay: '300ms' }}>
          <ExportActions />
        </div>

        <p id="result-disclaimer" className={clsx('text-center text-xs pb-4 leading-relaxed', themeMode === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
          ⚠️ هذه الخطة للأغراض التعليمية والإرشادية فقط.
          استشر طبيبك أو أخصائي تغذية قبل تطبيق أي تغييرات جوهرية.
        </p>
      </div>
    </PageWrapper>
  );
}
