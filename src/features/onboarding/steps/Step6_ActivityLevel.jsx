import { useMemo } from 'react';
import clsx from 'clsx';
import { Armchair, Bike, Dumbbell, Footprints, Home, Sparkles, Trees } from 'lucide-react';
import { useUserProfile } from '../../../context/UserProfileContext';
import { CONSTANTS } from '../../../types/index';
import formatNutritionSummary from '../../../utils/nutritionCalculator';

const ACTIVITY_UI = {
  sedentary: {
    icon: Armchair,
    label: 'خامل جداً',
    description: 'مكتب طوال اليوم، لا تمارين تقريباً',
  },
  lightly_active: {
    icon: Footprints,
    label: 'نشاط خفيف',
    description: 'تمارين خفيفة 1-3 أيام أسبوعياً',
  },
  moderately_active: {
    icon: Bike,
    label: 'نشاط متوسط',
    description: 'تمارين منتظمة 3-5 أيام',
  },
  very_active: {
    icon: Dumbbell,
    label: 'نشاط عالي جداً',
    description: 'رياضة مكثفة يومياً أو عمل بدني',
  },
};

const EQUIPMENT_OPTIONS = [
  {
    value: 'home',
    label: 'أدوات منزلية (حبل، أثقال خفيفة)',
    icon: Home,
  },
  {
    value: 'gym',
    label: 'صالة رياضية',
    icon: Dumbbell,
  },
  {
    value: 'outdoor',
    label: 'تمارين خارجية (حديقة، ملعب)',
    icon: Trees,
  },
  {
    value: 'none',
    label: 'بدون أي معدات',
    icon: Sparkles,
  },
];

/**
 * Step 6 for selecting activity level and available equipment with live nutrition summary.
 *
 * @returns {JSX.Element}
 */
export default function Step6ActivityLevel() {
  const { userProfile, updateField, toggleArrayItem } = useUserProfile();

  const selectedActivityLevel = userProfile.activityLevel;
  const selectedEquipment = Array.isArray(userProfile.availableEquipment)
    ? userProfile.availableEquipment
    : [];

  const activityOptions = useMemo(
    () =>
      CONSTANTS.ACTIVITY_LEVELS.map((option) => {
        const ui = ACTIVITY_UI[option.value];

        return {
          value: option.value,
          ...ui,
        };
      }).filter((option) => Boolean(option.label)),
    []
  );

  const nutritionSummary = useMemo(() => formatNutritionSummary(userProfile), [userProfile]);

  const handleToggleEquipment = (value) => {
    if (value === 'none' && !selectedEquipment.includes('none')) {
      updateField({ availableEquipment: [] });
      toggleArrayItem('availableEquipment', 'none');
      return;
    }

    if (value !== 'none' && selectedEquipment.includes('none')) {
      toggleArrayItem('availableEquipment', 'none');
    }

    toggleArrayItem('availableEquipment', value);
  };

  return (
    <div dir="rtl" className="animate-slide-up space-y-6 text-right">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-800">مستوى النشاط البدني</h3>
        <p className="text-sm text-slate-500">اختر نمط حركتك اليومي حتى نصمم خطة مناسبة لقدرتك ووقتك.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {activityOptions.map(({ value, description, icon: Icon }) => {
          const isSelected = selectedActivityLevel === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => updateField({ activityLevel: value })}
              className={clsx(
                'text-right cursor-pointer border-2 rounded-2xl p-4 transition-all duration-200',
                isSelected
                  ? 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-emerald-200 hover:bg-slate-50'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">{ACTIVITY_UI[value]?.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">المعدات المتاحة</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map(({ value, icon: Icon }) => {
            const isSelected = selectedEquipment.includes(value);

            return (
              <button
                key={value}
                type="button"
                onClick={() => handleToggleEquipment(value)}
                className={clsx(
                  'cursor-pointer border rounded-xl px-3 py-2 text-sm text-right transition-all flex items-center gap-2',
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{EQUIPMENT_OPTIONS.find((option) => option.value === value)?.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100 p-5 shadow-soft space-y-3">
        <h4 className="text-base font-bold text-emerald-800">ملخص خطتك المتوقعة</h4>

        <p className="text-sm text-slate-700">
          السعرات اليومية المقترحة: <strong>{nutritionSummary.dailyCalories}</strong>
        </p>

        <p className="text-sm text-slate-700">
          البروتين: <strong>{nutritionSummary.macros.proteinGrams}غ</strong> /
          الكربوهيدرات: <strong>{nutritionSummary.macros.carbsGrams}غ</strong> /
          الدهون: <strong>{nutritionSummary.macros.fatGrams}غ</strong>
        </p>

        <p className="text-sm text-slate-700">
          الماء اليومي: <strong>{nutritionSummary.hydration} لتر</strong>
        </p>

        <p className="text-sm text-slate-700">
          الوزن المستهدف: <strong>{nutritionSummary.targetWeight} كغ</strong>
        </p>
      </div>

      <p className="text-sm font-medium text-emerald-700">
        🎯 كل شيء جاهز! اضغط "احصل على خطتك" لتوليد خطتك المخصصة بالذكاء الاصطناعي
      </p>
    </div>
  );
}
