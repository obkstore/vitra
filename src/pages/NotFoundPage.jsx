import { useNavigate } from 'react-router-dom';
import Button from '../components/ui/Button';

/**
 * Friendly Arabic 404 page with quick navigation actions.
 *
 * @returns {JSX.Element}
 */
export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl text-center animate-fade-in space-y-6">
        <p className="text-8xl md:text-9xl font-black leading-none gradient-text">404</p>

        <div className="space-y-2">
          <h1 className="text-2xl md:text-4xl font-bold leading-relaxed text-slate-900">عذراً، الصفحة غير موجودة</h1>
          <p className="text-slate-500 text-base md:text-lg leading-relaxed">
            يبدو أنك ضللت الطريق! لكن لا تقلق — صحتك تنتظرك هنا
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={() => navigate('/')}>
            العودة للرئيسية
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/onboarding')}>
            ابدأ خطتك الصحية
          </Button>
        </div>
      </div>
    </div>
  );
}
