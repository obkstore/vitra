import { useEffect } from 'react';
import clsx from 'clsx';
import { Activity, AlertTriangle, Heart, PlusCircle } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUserProfile } from '../../../context/UserProfileContext';

const healthStatusSchema = z.object({
  healthConditions: z
    .array(z.enum(['none', 'diabetes', 'hypertension', 'heart_disease', 'hypotension', 'hypothyroidism', 'hyperthyroidism', 'ibs', 'other']))
    .min(1, 'اختر حالة واحدة على الأقل'),
});

const HEALTH_OPTIONS = [
  {
    value: 'none',
    label: 'لا توجد حالات مزمنة',
    icon: Heart,
  },
  {
    value: 'diabetes',
    label: 'السكري',
    icon: Activity,
  },
  {
    value: 'hypertension',
    label: 'ضغط الدم المرتفع',
    icon: Heart,
  },
  {
    value: 'heart_disease',
    label: 'أمراض القلب والأوعية',
    icon: Heart,
  },
  {
    value: 'hypotension',
    label: 'انخفاض ضغط الدم',
    icon: Heart,
  },
  {
    value: 'hypothyroidism',
    label: 'قصور الغدة الدرقية',
    icon: Activity,
  },
  {
    value: 'hyperthyroidism',
    label: 'فرط نشاط الغدة الدرقية',
    icon: Activity,
  },
  {
    value: 'ibs',
    label: 'القولون العصبي',
    icon: Activity,
  },
  {
    value: 'other',
    label: 'حالة أخرى',
    icon: PlusCircle,
  },
];

/**
 * @typedef {z.infer<typeof healthStatusSchema>} HealthStatusFormValues
 */

/**
 * Step 2 form for selecting chronic health conditions.
 * Uses React Hook Form + Zod with multi-select card interactions.
 *
 * @returns {JSX.Element}
 */
export default function Step2HealthStatus() {
  const { userProfile, toggleArrayItem, updateField } = useUserProfile();

  const {
    control,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(healthStatusSchema),
    mode: 'onChange',
    defaultValues: {
      healthConditions: userProfile.healthConditions ?? [],
    },
  });

  /** @type {HealthStatusFormValues} */
  const formValues = useWatch({ control });
  const selectedConditions = Array.isArray(formValues?.healthConditions)
    ? formValues.healthConditions
    : [];

  useEffect(() => {
    setValue('healthConditions', userProfile.healthConditions ?? [], {
      shouldValidate: true,
    });
  }, [setValue, userProfile.healthConditions]);

  const handleToggleCondition = (value) => {
    const current = Array.isArray(selectedConditions) ? selectedConditions : [];

    if (value === 'none') {
      const next = current.includes('none') ? [] : ['none'];
      setValue('healthConditions', next, {
        shouldDirty: true,
        shouldValidate: true,
      });
      updateField({ healthConditions: next.length ? ['none'] : [] });
      return;
    }

    const withoutNone = current.filter((item) => item !== 'none');
    const next = withoutNone.includes(value)
      ? withoutNone.filter((item) => item !== value)
      : [...withoutNone, value];

    setValue('healthConditions', next, {
      shouldDirty: true,
      shouldValidate: true,
    });

    if (current.includes('none')) {
      updateField({ healthConditions: [] });
    }

    toggleArrayItem('healthConditions', value);
  };

  return (
    <div dir="rtl" className="animate-slide-up space-y-5 text-right">
      <div>
        <h3 className="text-base font-semibold text-slate-800 mb-1">الحالة الصحية</h3>
        <p className="text-sm text-slate-500">اختر الحالات الصحية التي تنطبق عليك (يمكن اختيار أكثر من خيار).</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {HEALTH_OPTIONS.map(({ value, icon: Icon }) => {
          const isSelected = selectedConditions.includes(value);

          return (
            <button
              key={value}
              type="button"
              onClick={() => handleToggleCondition(value)}
              className={clsx(
                'cursor-pointer border-2 rounded-xl p-4 transition-all text-right',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <p className="text-sm font-semibold text-slate-800">{HEALTH_OPTIONS.find((option) => option.value === value)?.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {errors.healthConditions?.message ? (
        <p className="text-xs text-red-500">{String(errors.healthConditions.message)}</p>
      ) : null}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 text-amber-800">
        <AlertTriangle className="h-4.5 w-4.5 mt-0.5 shrink-0" />
        <p className="text-sm">
          هذه المعلومات تُستخدم فقط لتخصيص خطتك الغذائية. لا تُشارك مع أي طرف ثالث.
        </p>
      </div>
    </div>
  );
}
