import { useCallback, useEffect, useState } from 'react';
import clsx from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, House, ShieldCheck } from 'lucide-react';
import usePlan from '../../context/PlanContext';
import { useAuth } from '../../context/AuthContext';
import { useUserProfile } from '../../context/UserProfileContext';
import { useStepper } from '../../context/StepperContext';
import Button from '../ui/Button';
import brandLogo from '../../../logo.png';
import useThemeMode from '../../hooks/useThemeMode';

/**
 * Top navigation header for the HealthPlan platform.
 *
 * @returns {JSX.Element}
 */
export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasGenerated, resetPlan } = usePlan();
  const { isAuthenticated, isAdmin, username, logout } = useAuth();
  const { resetProfile } = useUserProfile();
  const { resetStepper } = useStepper();
  const [isScrolled, setIsScrolled] = useState(false);
  const { isDark, toggleTheme } = useThemeMode();

  const isLandingPage = location.pathname === '/';
  const isResultsPage = location.pathname === '/results';

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/auth', { replace: true });
  }, [logout, navigate]);

  const handleNewPlan = useCallback(() => {
    const confirmed = window.confirm(
      'هل أنت متأكد؟\nسيتم مسح خطتك الحالية وبياناتك والبدء من جديد.'
    );
    if (!confirmed) return;
    resetPlan();
    resetProfile();
    resetStepper();
    navigate('/onboarding');
  }, [resetPlan, resetProfile, resetStepper, navigate]);

  return (
    <header
      className={clsx(
        'fixed left-0 right-0 top-0 z-50 px-3 pt-3 transition-shadow duration-200',
        isLandingPage
          ? 'text-slate-100'
          : isDark
            ? 'text-slate-100'
            : 'text-slate-900',
        isScrolled && 'shadow-sm'
      )}
    >
      <div
        className={clsx(
          'mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 rounded-[1.5rem] border px-4 backdrop-blur-xl transition-colors duration-300',
          isLandingPage
            ? 'border-white/10 bg-[#0D1117]/88 shadow-[0_16px_45px_rgba(0,0,0,0.25)]'
            : isDark
              ? 'border-white/10 bg-[#0D1117]/90 shadow-[0_16px_45px_rgba(0,0,0,0.18)]'
              : 'border-slate-200/80 bg-white/90 shadow-[0_16px_45px_rgba(15,23,42,0.08)]'
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={clsx(
            'inline-flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm overflow-hidden shrink-0 border',
            isLandingPage || isDark ? 'border-white/10 bg-white/95' : 'border-slate-200 bg-white'
          )}>
            <img src={brandLogo} alt="VITRA" className="h-9 w-9 object-contain" />
          </span>

          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="gradient-text text-lg font-bold">VITRA</span>
              <span className={clsx('rounded-full px-2 py-0.5 text-xs font-bold', isLandingPage || isDark ? 'bg-white/10 text-white' : 'bg-mental-50 text-mental-700')}>AI</span>
            </div>
            <p className={clsx('hidden sm:block text-xs', isLandingPage || isDark ? 'text-slate-300' : 'text-slate-500')}>خبرة، علم، تحليل، وذكاء اصطناعي</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={clsx('hidden text-xs sm:inline-flex rounded-full px-3 py-1 font-semibold', isLandingPage || isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600')}>
            {isLandingPage ? 'رحلة صحية متكاملة' : 'النتائج'}
          </span>

          <span className={clsx('text-xs sm:hidden', isLandingPage || isDark ? 'text-slate-300' : 'text-slate-500')}>VITRA AI</span>

          {isResultsPage ? (
            <Button
              variant={isDark ? 'secondary' : 'ghost'}
              size="sm"
              leftIcon={<House className="h-4 w-4" />}
              onClick={() => navigate('/')}
            >
              الرئيسية
            </Button>
          ) : null}

          {isResultsPage ? (
            <button
              type="button"
              onClick={toggleTheme}
              className={clsx(
                'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors duration-300',
                isDark
                  ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              )}
              aria-label={isDark ? 'تبديل إلى الوضع الفاتح' : 'تبديل إلى الوضع الداكن'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{isDark ? 'فاتح' : 'داكن'}</span>
            </button>
          ) : null}

          {isAuthenticated ? (
            <>
              <span className={clsx('hidden text-xs sm:inline-flex rounded-full px-3 py-1 font-semibold max-w-32 truncate', isLandingPage || isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600')}>
                {username}
              </span>
              {isAdmin ? (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<ShieldCheck className="h-4 w-4" />}
                  onClick={() => navigate('/admin')}
                >
                  لوحة المشرف
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                تسجيل الخروج
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" onClick={() => navigate('/auth')}>
              ابدأ الآن
            </Button>
          )}

          {isResultsPage && hasGenerated ? (
            <Button variant="ghost" size="sm" onClick={handleNewPlan}>
              خطة جديدة
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
