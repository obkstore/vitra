import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Brain,
  ChartColumnIncreasing,
  CheckCircle2,
  Cross,
  Cpu,
  Dumbbell,
  Headphones,
  HeartPulse,
  Layers3,
  MapPinned,
  MonitorSmartphone,
  Sparkles,
  TrendingUp,
  Users,
  User,
  UtensilsCrossed,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Header from '../components/layout/Header';
import brandLogo from '../../logo.png';

const problemStats = [
  {
    icon: Users,
    value: 1,
    suffix: 'من كل 5',
    label: 'سوريين يعانون اضطراباً نفسياً يحتاج دعماً',
  },
  {
    icon: TrendingUp,
    value: 1,
    suffix: 'الأولى عالمياً',
    label: 'سوريا تتصدّر دول العالم في معدلات الاكتئاب',
  },
  {
    icon: UtensilsCrossed,
    value: 82,
    suffix: '%',
    label: 'من الأسر السورية دون أمن غذائي كافٍ',
  },
  {
    icon: Cross,
    value: 73,
    suffix: 'طبيباً فقط',
    label: 'طبيب نفسي واحد لأكثر من 26 مليون نسمة في سوريا',
  },
];

const solutionCards = [
  {
    icon: Dumbbell,
    title: 'مدرب رياضي',
    body: 'برنامج منفصل بلا متابعة علمية',
  },
  {
    icon: UtensilsCrossed,
    title: 'أخصائي تغذية',
    body: 'خطة عامة لا ترتبط بحالتك النفسية',
  },
  {
    icon: Brain,
    title: 'طبيب نفسي',
    body: 'جلسة منفصلة، بتكلفة مستقلة',
  },
];

const vitraFeatures = [
  {
    icon: Headphones,
    title: 'دعم مستمر لا موعد وينتهي',
  },
  {
    icon: MapPinned,
    title: 'متاح لكل سوري، بكل مكان',
  },
  {
    icon: Cpu,
    title: 'علم بيانات لا تخمين',
  },
  {
    icon: Layers3,
    title: 'نظام واحد بدل ثلاثة',
  },
];

const vitraSteps = [
  {
    icon: User,
    title: 'أدخل بياناتك',
    body: 'العمر، الوزن، عدد مرات التمرين، حالتك النفسية، وهدفك',
  },
  {
    icon: Cpu,
    title: 'التحليل الذكي',
    body: 'الخوارزمية الهجينة تدرس حالتك الجسدية والنفسية معاً',
  },
  {
    icon: Layers3,
    title: 'خطة متكاملة',
    body: 'غذاء + دعم نفسي + برنامج رياضي مصممة لك تحديداً',
  },
  {
    icon: ChartColumnIncreasing,
    title: 'متابعة ومؤشر وعي',
    body: 'تتبّع مستمر يقيس تحسّنك الفعلي مع الوقت',
  },
];

const comparisonRows = [
  {
    left: 'تعدّ السعرات فقط، وتتجاهل الجانب النفسي',
    right: 'نظام ثلاثي متكامل: نفسي + غذائي + رياضي',
  },
  {
    left: 'حلول عامة لا تراعي خصوصية كل حالة',
    right: 'توصيات مبنية على الذكاء الاصطناعي وعلم البيانات',
  },
  {
    left: 'بلا متابعة حقيقية أو مؤشر تحسّن',
    right: 'مؤشر وعي يقيس تحسّنك الفعلي',
  },
  {
    left: 'غير مصممة لواقع المنطقة أو المستخدم المحلي',
    right: 'مصمم خصيصاً لواقع المستخدم السوري',
  },
];

const audienceCards = [
  {
    icon: HeartPulse,
    title: 'الباحثون عن توازن صحي',
    body: 'أفراد مهتمون بالصحة بعمر 18-55 سنة',
  },
  {
    icon: Dumbbell,
    title: 'الرياضيون وهواة اللياقة',
    body: 'يبحثون عن أداء أفضل ومتابعة علمية',
  },
  {
    icon: ShieldCheck,
    title: 'أصحاب الحالات الخاصة',
    body: 'تقلبات نفسية أو أمراض مزمنة تحتاج دعماً مستمراً',
  },
];

const proofTabs = [
  { key: 'plan', label: 'خطتك الصحية المخصصة' },
  { key: 'balance', label: 'مؤشر التوازن الصحي' },
  { key: 'activity', label: 'خطة النشاط البدني' },
  { key: 'nutrition', label: 'الخطة الغذائية الأسبوعية' },
];

const weeklyDays = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

const teamCards = [
  { icon: UtensilsCrossed, title: 'أخصائي تغذية', body: 'يصمم المحتوى الغذائي' },
  { icon: Cpu, title: 'عالم بيانات', body: 'يبني الخوارزمية الذكية' },
  { icon: Dumbbell, title: 'مدرب رياضي', body: 'يضع البرامج الرياضية' },
  { icon: Stethoscope, title: 'صيدلي', body: 'يضمن الدقة والسلامة الطبية للمحتوى' },
  { icon: MonitorSmartphone, title: 'فريق تقني', body: 'يضمن أمان المنصة وتطويرها المستمر' },
];

function useInView() {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.45 }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}

function CounterStatCard({ icon: Icon, value, suffix, label }) {
  const { ref, isVisible } = useInView();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      return undefined;
    }

    let frameId = 0;
    let startTime = 0;
    const duration = 1100;

    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(value * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, [isVisible, value]);

  return (
    <article
      ref={ref}
      className="rounded-[1.75rem] border border-white/70 bg-[#EEF2F0] p-6 text-[#0D1117] shadow-[0_18px_45px_rgba(13,17,23,0.12)]"
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1B4D3E] text-white shadow-md">
        <Icon className="h-5 w-5" />
      </div>

      <div className="mt-5">
        <div className="flex items-end gap-2">
          <span className="text-4xl font-black tracking-tight text-[#0D1117]">{count}</span>
          <span className="pb-1 text-lg font-bold text-[#1B4D3E]">{suffix}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{label}</p>
      </div>
    </article>
  );
}

function SeparatorX() {
  return (
    <div className="flex items-center justify-center py-3 lg:px-2">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#E8935C] text-white shadow-md">
        <X className="h-5 w-5" />
      </span>
    </div>
  );
}

function BrandCard({ icon: Icon, title, body, dark = false }) {
  return (
    <article
      className={dark
        ? 'rounded-[1.75rem] border border-white/10 bg-[#1B4D3E] p-6 text-white shadow-[0_18px_45px_rgba(13,17,23,0.2)]'
        : 'rounded-[1.75rem] border border-white/70 bg-[#EEF2F0] p-6 text-[#0D1117] shadow-[0_18px_45px_rgba(13,17,23,0.12)]'}
    >
      <div className={dark
        ? 'inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white shadow-sm'
        : 'inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#1B4D3E] text-white shadow-sm'}
      >
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      {body ? <p className={dark ? 'mt-2 text-sm leading-relaxed text-white/80' : 'mt-2 text-sm leading-relaxed text-slate-600'}>{body}</p> : null}
    </article>
  );
}

function StepCard({ icon: Icon, number, title, body, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group rounded-[1.75rem] border p-5 text-right transition-all duration-300',
        active
          ? 'border-[#E8935C] bg-[#1B4D3E] text-white shadow-[0_18px_45px_rgba(13,17,23,0.2)]'
          : 'border-white/10 bg-white/5 text-slate-100 hover:border-white/20 hover:bg-white/10',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={[
            'inline-flex h-11 w-11 items-center justify-center rounded-full border text-sm font-black',
            active ? 'border-[#E8935C] bg-[#E8935C] text-white' : 'border-white/15 bg-white/10 text-white',
          ].join(' ')}>
            {number}
          </div>
          <h3 className="mt-4 text-lg font-bold">{title}</h3>
        </div>

        <div className={[
          'inline-flex h-11 w-11 items-center justify-center rounded-full border',
          active ? 'border-white/15 bg-white/10 text-white' : 'border-white/10 bg-white/5 text-white/90',
        ].join(' ')}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <p className={['mt-3 text-sm leading-relaxed', active ? 'text-white/85' : 'text-slate-300'].join(' ')}>{body}</p>
    </button>
  );
}

function TeamCard({ icon: Icon, title, body }) {
  return (
    <article className="rounded-[1.5rem] border border-white/70 bg-[#EEF2F0] p-5 text-[#0D1117] shadow-[0_18px_45px_rgba(13,17,23,0.12)]">
      <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1B4D3E] text-white shadow-sm">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
    </article>
  );
}

function MockMetric({ label, value, sublabel }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-white">
      <p className="text-xs text-white/65">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
      <p className="text-xs text-white/75">{sublabel}</p>
    </div>
  );
}

function ProgressSegmentBar({ segments }) {
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10">
      {segments.map((segment) => (
        <div
          key={segment.label}
          className={segment.className}
          style={{ width: `${segment.value}%` }}
          title={`${segment.label} ${segment.value}%`}
        />
      ))}
    </div>
  );
}

function GaugeMock({ value, label }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="150" height="150" viewBox="0 0 150 150" className="-rotate-90">
        <defs>
          <linearGradient id="vitraGauge" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#e8935c" />
            <stop offset="100%" stopColor="#1b4d3e" />
          </linearGradient>
        </defs>
        <circle cx="75" cy="75" r={radius} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="14" />
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke="url(#vitraGauge)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-4xl font-black text-white">{value}</span>
        <span className="mt-1 text-xs text-white/70">من 100</span>
        <span className="mt-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">{label}</span>
      </div>
    </div>
  );
}

function MockMealCard({ mealType, name, time, calories, minutes, tags }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4 text-white shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-white/60">{time}</p>
          <h4 className="mt-1 text-base font-bold">{mealType} • {name}</h4>
        </div>

        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{calories} سعرة</div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-white/70">
        <BarChart3 className="h-3.5 w-3.5" />
        <span>{minutes} دقيقة</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span key={tag} className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] text-white/85">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function MockTabsPreview({ activeTab, setActiveTab }) {
  const tabKey = proofTabs[activeTab]?.key ?? 'plan';

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(27,77,62,0.24),rgba(13,17,23,0.95))] p-4 md:p-6 text-white shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap gap-2 rounded-[1.5rem] border border-white/10 bg-white/5 p-2">
        {proofTabs.map((tab, index) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(index)}
            className={[
              'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              activeTab === index ? 'bg-[#E8935C] text-white' : 'text-white/70 hover:bg-white/10',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-[#0D1117]/55 p-5 md:p-6">
        {tabKey === 'plan' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <MockMetric label="المدة" value="4 أسابيع" sublabel="متكاملة" />
              <MockMetric label="الماء" value="2.8 لتر" sublabel="يومياً" />
              <MockMetric label="البروتين" value="187غ" sublabel="يومياً" />
              <MockMetric label="السعرات" value="1466" sublabel="سعرة/يوم" />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">توزيع العناصر الغذائية</span>
                <span className="text-white/60">بروتين 51% / كربوهيدرات 24% / دهون 25%</span>
              </div>
              <div className="mt-3">
                <ProgressSegmentBar
                  segments={[
                    { label: 'بروتين', value: 51, className: 'bg-[#1B4D3E]' },
                    { label: 'كربوهيدرات', value: 24, className: 'bg-[#E8935C]' },
                    { label: 'دهون', value: 25, className: 'bg-[#8DD9B0]' },
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 text-center text-sm font-black">
                31.22
                <span className="block text-[11px] font-semibold text-white/70">سمنة</span>
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">الهدف: إنقاص الوزن</span>
            </div>
          </div>
        ) : null}

        {tabKey === 'balance' ? (
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <GaugeMock value={52} label="منخفض" />
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: 'النتيجة النفسية', value: 53, className: 'bg-[#1B4D3E]' },
                  { label: 'النتيجة البدنية', value: 45, className: 'bg-[#E8935C]' },
                  { label: 'الجاهزية الغذائية', value: 60, className: 'bg-[#8DD9B0]' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{item.label}</span>
                      <span className="text-white/70">{item.value}/100</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div className={item.className} style={{ width: `${item.value}%`, height: '100%' }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <h4 className="font-bold">ما يقوله مؤشرك</h4>
                  <ul className="mt-3 space-y-2 text-sm text-white/75">
                    <li>• مستوى التوتر قابل للتحسن مع تنظيم النوم والحركة.</li>
                    <li>• الخطة الحالية تحتاج تثبيتاً أكثر كي ترتفع الاستمرارية.</li>
                  </ul>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/8 p-4">
                  <h4 className="font-bold">توصيات فورية</h4>
                  <div className="mt-3 space-y-2 text-sm text-white/80">
                    <div className="rounded-xl bg-white/5 px-3 py-2">1. ابدأ بمشي خفيف 20 دقيقة بعد الغداء.</div>
                    <div className="rounded-xl bg-white/5 px-3 py-2">2. ثبّت وجبة بروتين واضحة في الفطور.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tabKey === 'activity' ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {weeklyDays.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  className={[
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    index === 2 ? 'bg-[#E8935C] text-white' : 'bg-white/5 text-white/70 hover:bg-white/10',
                  ].join(' ')}
                >
                  {day}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <MockMetric label="الخطوات" value="8000" sublabel="يومياً" />
              <MockMetric label="الحرق الأسبوعي" value="875" sublabel="سعرة" />
              <MockMetric label="الجلسة" value="35 دقيقة" sublabel="بمتوسط" />
            </div>

            <div className="space-y-3">
              {[
                {
                  name: 'سكوات وزن الجسم',
                  level: 'مبتدئ',
                  duration: '10-12 دقيقة',
                  prescription: '3 مجموعات × 12 تكرار',
                  tip: 'حافظ على الظهر مستقيمًا والركبتين بمحاذاة القدمين.',
                },
                {
                  name: 'مشي سريع',
                  level: 'مبتدئ',
                  duration: '15 دقيقة',
                  prescription: 'جلسة واحدة',
                  tip: 'نَفَس منتظم وخطوات ثابتة دون استعجال.',
                },
              ].map((exercise) => (
                <div key={exercise.name} className="rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold">{exercise.name}</h4>
                      <p className="mt-1 text-sm text-white/65">{exercise.tip}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{exercise.level}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/75">
                    <span className="rounded-full bg-white/8 px-3 py-1">{exercise.duration}</span>
                    <span className="rounded-full bg-white/8 px-3 py-1">{exercise.prescription}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {tabKey === 'nutrition' ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                <button className="rounded-full bg-[#E8935C] px-4 py-2 text-sm font-semibold text-white">يومي</button>
                <button className="rounded-full px-4 py-2 text-sm font-semibold text-white/70">أسبوعي</button>
              </div>

              <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">إجمالي اليوم: 1466 سعرة</div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MockMealCard mealType="فطور" name="شوفان مع لبن" time="08:00" calories={420} minutes={12} tags={['شوفان', 'لبن', 'قرفة']} />
              <MockMealCard mealType="غداء" name="صدر دجاج مشوي" time="13:00" calories={530} minutes={25} tags={['دجاج', 'سلطة', 'أرز بني']} />
              <MockMealCard mealType="عشاء" name="سمك وخضار" time="19:30" calories={340} minutes={18} tags={['سمك', 'خضار', 'زيت زيتون']} />
              <MockMealCard mealType="سناك" name="مكسرات وفاكهة" time="16:00" calories={176} minutes={5} tags={['لوز', 'تفاح', 'شيا']} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Marketing landing page for VITRA.
 *
 * @returns {JSX.Element}
 */
export default function LandingPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [activeProofTab, setActiveProofTab] = useState(0);

  return (
    <div dir="rtl" className="min-h-screen bg-[#0D1117] text-slate-100">
      <Header />

      <main className="pt-20">
        <section className="min-h-[calc(100vh-5rem)] flex items-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(27,77,62,0.34),_transparent_32%),radial-gradient(circle_at_80%_18%,_rgba(232,147,92,0.18),_transparent_24%),linear-gradient(180deg,_#0D1117_0%,_#0D1117_100%)]">
          <div className="mx-auto w-full max-w-7xl px-4 py-20 md:px-8 lg:py-24">
            <div className="flex flex-col-reverse gap-14 lg:flex-row-reverse lg:items-center lg:gap-16">
              <div className="relative mx-auto w-full max-w-xl lg:max-w-none lg:flex-1">
                <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-[radial-gradient(circle_at_top,_rgba(232,147,92,0.18),_transparent_36%),linear-gradient(180deg,rgba(27,77,62,0.2),rgba(13,17,23,0.95))] blur-3xl" />
                <div className="rounded-[2.5rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl animate-fade-in transition-transform duration-700 hover:scale-[1.01]">
                  <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(27,77,62,0.22),rgba(13,17,23,0.95))] p-8">
                    <img
                      src={brandLogo}
                      alt="VITRA"
                      className="mx-auto h-[22rem] w-[22rem] max-w-full object-contain drop-shadow-[0_22px_35px_rgba(0,0,0,0.45)]"
                    />
                  </div>
                </div>
              </div>

              <div className="w-full lg:flex-1 lg:pl-4 text-right">
                <div className="inline-flex items-center gap-3 rounded-full border border-[#1B4D3E] bg-[#1B4D3E]/20 px-4 py-2 text-sm font-semibold text-[#8DD9B0]">
                  <Sparkles className="h-4 w-4" />
                  كان في السادسة والعشرين ... منضبط ... يبدو بأتم صحة.
                </div>

                <div className="mt-6 space-y-5 max-w-2xl">
                  <p className="text-base md:text-lg leading-relaxed text-slate-300">
                    وفي صباح عادي ... انهار جسده وعقله معاً، دون سابق إنذار.
                  </p>

                  <p className="text-base md:text-lg italic leading-relaxed text-slate-400">
                    لم يكن مريضاً بشكل واضح ... كان فقط ... مُهملاً.
                  </p>

                  <div>
                    <div className="inline-flex items-center gap-3 rounded-full border border-[#E8935C]/30 bg-[#E8935C]/10 px-4 py-2 text-[#F2B18A] shadow-sm">
                      <img src={brandLogo} alt="VITRA" className="h-6 w-6 object-contain" />
                      <span className="text-xs font-semibold tracking-[0.25em]">VITRA</span>
                    </div>

                    <h1 className="mt-5 text-5xl md:text-7xl font-black tracking-tight text-[#E8935C]">
                      VITRA
                    </h1>

                    <p className="mt-4 max-w-2xl text-xl md:text-2xl font-semibold leading-snug text-[#EEF2F0]">
                      نظام ذكي متكامل للصحة النفسية، والتغذية، والرياضة
                    </p>

                    <p className="mt-4 text-lg font-semibold text-[#8DD9B0]">
                      التزامك... سلامك...
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4">
                    <Button
                      variant="primary"
                      size="lg"
                      rightIcon={<ArrowLeft className="h-4 w-4" />}
                      onClick={() => navigate('/auth')}
                    >
                      ابدأ رحلتك الآن
                    </Button>

                    <button
                      type="button"
                      onClick={() => document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })}
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition-colors duration-300 hover:bg-white/10"
                    >
                      اكتشف المشكلة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="problem" className="bg-[#EEF2F0] py-24 md:py-28 text-[#0D1117]">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#1B4D3E]">لنبدأ بحقيقة</p>
              <h2 className="mt-3 text-3xl md:text-5xl font-black leading-tight text-[#0D1117]">
                مين فينا ما حسّ بيوم إنّو تعبان ... وما لقى مين يفهمه؟
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-slate-700">
                المشكلة أكبر مما نتخيل، والأرقام بتحكي:
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {problemStats.map((item) => (
                <CounterStatCard
                  key={item.label}
                  icon={item.icon}
                  value={item.value}
                  suffix={item.suffix}
                  label={item.label}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-24 md:py-28 text-[#0D1117]">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#E8935C]">لكن...</p>
              <h2 className="mt-3 text-3xl md:text-5xl font-black leading-tight text-[#0D1117]">
                الحل موجود ... لكنه مبعثر، بطيء، ومكلف
              </h2>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
              <BrandCard icon={solutionCards[0].icon} title={solutionCards[0].title} body={solutionCards[0].body} />
              <div className="hidden lg:flex items-center justify-center"><SeparatorX /></div>
              <BrandCard icon={solutionCards[1].icon} title={solutionCards[1].title} body={solutionCards[1].body} />
              <div className="hidden lg:flex items-center justify-center"><SeparatorX /></div>
              <BrandCard icon={solutionCards[2].icon} title={solutionCards[2].title} body={solutionCards[2].body} />
            </div>

            <div className="mt-8 rounded-[1.75rem] bg-[#1B4D3E] px-6 py-5 text-white shadow-[0_18px_45px_rgba(13,17,23,0.16)]">
              <p className="text-lg font-bold">النتيجة: وقت ضائع، مال مهدور، والتزام لا يكتمل</p>
            </div>
          </div>
        </section>

        <section className="bg-[#EEF2F0] py-24 md:py-28 text-[#0D1117]">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black leading-tight text-[#0D1117]">
                ماذا لو اجتمعت الحلول الثلاثة ... في مكان واحد؟
              </h2>

              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/80 bg-white px-5 py-3 shadow-sm">
                <img src={brandLogo} alt="VITRA" className="h-8 w-8 object-contain" />
                <span className="text-xs font-bold tracking-[0.3em] text-[#1B4D3E]">VITRA</span>
              </div>

              <p className="mt-8 text-xl md:text-2xl font-black leading-snug text-[#1B4D3E]">
                أول نظام سوري ذكي يدمج الصحة النفسية، والتغذية، والرياضة، في تجربة واحدة متكاملة
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {vitraFeatures.map((feature) => (
                <BrandCard key={feature.title} icon={feature.icon} title={feature.title} dark />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#0D1117] py-24 md:py-28 text-slate-100">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-5xl font-black leading-tight text-white">
                كيف يعمل VITRA؟
              </h2>
            </div>

            <div className="relative mt-12">
              <div className="hidden lg:block absolute top-10 inset-x-8 h-px bg-white/10" />

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                {vitraSteps.map((step, index) => (
                  <StepCard
                    key={step.title}
                    icon={step.icon}
                    number={index + 1}
                    title={step.title}
                    body={step.body}
                    active={activeStep === index}
                    onClick={() => setActiveStep(index)}
                  />
                ))}
              </div>

              <div className="mt-8 text-center text-sm text-slate-400">
                مرر أو انقر بين الخطوات لتتبع الرحلة من البداية حتى المؤشر
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#EEF2F0] py-24 md:py-28 text-[#0D1117]">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#1B4D3E]">لسنا تطبيق تغذية آخر</p>
              <h2 className="mt-3 text-3xl md:text-5xl font-black leading-tight text-[#0D1117]">
                نحن نربط بين ما تأكله، وما تشعر به، وكيف تتحرك
              </h2>
            </div>

            <div className="mt-10 overflow-hidden rounded-[2rem] border border-[#D8DFDB] bg-white shadow-[0_18px_45px_rgba(13,17,23,0.08)]">
              <div className="grid grid-cols-[1.15fr_1fr_1fr] border-b border-[#D8DFDB] bg-[#1B4D3E] text-white">
                <div className="px-5 py-4 text-sm font-bold">المعيار</div>
                <div className="px-5 py-4 text-sm font-bold">البدائل التقليدية</div>
                <div className="px-5 py-4 text-sm font-bold">VITRA</div>
              </div>

              {comparisonRows.map((row, index) => (
                <div key={row.left} className={["grid grid-cols-[1.15fr_1fr_1fr]", index !== comparisonRows.length - 1 ? 'border-b border-[#E5EAE7]' : ''].join(' ')}>
                  <div className="flex items-center border-l border-[#E5EAE7] px-5 py-5 text-sm font-semibold leading-relaxed text-[#0D1117]">
                    {index + 1}. {['التخصيص', 'الذكاء', 'المتابعة', 'الملاءمة'][index]}
                  </div>
                  <div className="flex items-center border-l border-[#E5EAE7] px-5 py-5 text-sm leading-relaxed text-slate-600">
                    {row.left}
                  </div>
                  <div className="flex items-center px-5 py-5 text-sm leading-relaxed text-[#1B4D3E]">
                    <CheckCircle2 className="ml-3 h-5 w-5 flex-none text-[#1B4D3E]" />
                    <span>{row.right}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#0D1117] py-24 md:py-28 text-slate-100">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#8DD9B0]">من نخدم؟</p>
              <h2 className="mt-3 text-3xl md:text-5xl font-black leading-tight text-white">
                VITRA مناسب لمن يريد خطة مفهومة، واضحة، ومتوازنة
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
              {audienceCards.map((card) => (
                <BrandCard key={card.title} icon={card.icon} title={card.title} body={card.body} dark />
              ))}
            </div>

            <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 px-6 py-5 text-center text-sm text-slate-300 shadow-[0_18px_45px_rgba(0,0,0,0.14)]">
              مجتمعنا في سوريا يمتد عبر أكثر من 24 عاماً من الخبرة المتراكمة، ويخدم جمهوراً يصل إلى 26.4 مليون إنسان يبحثون عن دعم أوضح وأقرب.
            </div>
          </div>
        </section>

        <section className="bg-[#EEF2F0] py-24 md:py-28 text-[#0D1117]">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold text-[#1B4D3E]">جرّب VITRA بنفسك</p>
                <h2 className="mt-3 text-3xl md:text-5xl font-black leading-tight text-[#0D1117]">
                  هكذا تبدو خطتك الصحية قبل أن تبدأ الرحلة
                </h2>
              </div>

              <div className="flex gap-2 rounded-full border border-[#D8DFDB] bg-white p-1 shadow-sm">
                {proofTabs.map((tab, index) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveProofTab(index)}
                    className={[
                      'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                      activeProofTab === index ? 'bg-[#1B4D3E] text-white' : 'text-slate-600 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <MockTabsPreview activeTab={activeProofTab} setActiveTab={setActiveProofTab} />
            </div>
          </div>
        </section>

        <section className="bg-[#0D1117] py-24 md:py-28 text-slate-100">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-[#E8935C]">خبراء حقيقيون خلف كل توصية</p>
              <h2 className="mt-3 text-3xl md:text-5xl font-black leading-tight text-white">
                فريق متعدد التخصصات يراجع ما يخرج من النظام
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {teamCards.map((card) => (
                <TeamCard key={card.title} icon={card.icon} title={card.title} body={card.body} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#EEF2F0] py-24 md:py-28 text-[#0D1117]">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <p className="text-sm font-semibold text-[#1B4D3E]">VITRA</p>
              <h2 className="mt-3 text-3xl md:text-5xl font-black leading-tight text-[#0D1117]">
                التزامك ... سلامك...
              </h2>
            </div>

            <div className="mt-10 overflow-hidden rounded-[2.25rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(232,147,92,0.18),_transparent_32%),linear-gradient(180deg,rgba(13,17,23,0.98),rgba(13,17,23,0.92))] px-6 py-10 text-white shadow-[0_25px_70px_rgba(0,0,0,0.3)] md:px-8">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80">
                    <img src={brandLogo} alt="VITRA" className="h-5 w-5 object-contain" />
                    ابدأ مع VITRA اليوم
                  </div>

                  <h3 className="mt-5 text-3xl md:text-5xl font-black leading-tight text-white">
                    خطة واحدة... متابعة واحدة... وقرار أوضح كل يوم
                  </h3>

                  <p className="mt-4 text-lg leading-relaxed text-slate-300">
                    اجمع بين الدعم النفسي، والغذاء، والحركة، داخل تجربة عربية سهلة تقرّبك من الهدف دون تشتيت.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                  <Button
                    variant="primary"
                    size="lg"
                    rightIcon={<ArrowLeft className="h-4 w-4" />}
                    onClick={() => navigate('/onboarding')}
                  >
                    ابدأ رحلتك الآن
                  </Button>

                  <button
                    type="button"
                    onClick={() => document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100 transition-colors duration-300 hover:bg-white/10"
                  >
                    شاهد الفكرة من البداية
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 md:bottom-6">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-[#0D1117]/92 px-4 py-3 shadow-[0_18px_45px_rgba(0,0,0,0.32)] backdrop-blur-md">
          <span className="relative flex h-10 w-10 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-[#E8935C]/30 animate-ping" />
            <img src={brandLogo} alt="VITRA" className="relative h-8 w-8 object-contain" />
          </span>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-white">ابدأ الآن مع VITRA</p>
            <p className="text-xs text-slate-400">خطة متكاملة للصحة النفسية والتغذية والرياضة</p>
          </div>
          <Button variant="primary" size="md" onClick={() => navigate('/auth')}>
            ابدأ
          </Button>
        </div>
      </div>
    </div>
  );
}
