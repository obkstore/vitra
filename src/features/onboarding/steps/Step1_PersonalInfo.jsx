import { useCallback, useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { User, Venus } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Input from '../../../components/ui/Input';
import { useUserProfile } from '../../../context/UserProfileContext';
import { calculateBMI } from '../../../utils/nutritionCalculator';

const personalInfoSchema = z.object({
  age: z.number().min(10, 'العمر يجب أن يكون بين 10 و100').max(100, 'العمر يجب أن يكون بين 10 و100'),
  gender: z.enum(['male', 'female']),
  weight: z.number().min(20, 'الوزن يجب أن يكون بين 20 و300').max(300, 'الوزن يجب أن يكون بين 20 و300'),
  height: z.number().min(100, 'الطول يجب أن يكون بين 100 و250').max(250, 'الطول يجب أن يكون بين 100 و250'),
});

/**
 * @typedef {z.infer<typeof personalInfoSchema>} PersonalInfoFormValues
 */

/**
 * Step 1 form for personal profile values (age, gender, weight, height).
 * Uses React Hook Form + Zod and syncs values to UserProfileContext.
 *
 * @returns {JSX.Element}
 */
export default function Step1PersonalInfo() {
  const { userProfile, updateField } = useUserProfile();

  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(personalInfoSchema),
    mode: 'onChange',
    defaultValues: {
      age: userProfile.age,
      gender: userProfile.gender,
      weight: userProfile.weight,
      height: userProfile.height,
    },
  });

  /** @type {PersonalInfoFormValues} */
  const formValues = useWatch({ control });
  const age = Number(formValues?.age ?? userProfile.age);
  const gender = formValues?.gender ?? userProfile.gender;
  const weight = Number(formValues?.weight ?? userProfile.weight);
  const height = Number(formValues?.height ?? userProfile.height);

  const handleGenderSelect = useCallback(
    (selectedGender) => {
      setValue('gender', selectedGender, { shouldDirty: true, shouldValidate: true });
      updateField({ gender: selectedGender });
    },
    [setValue, updateField]
  );

  useEffect(() => {
    updateField({
      age: Number.isFinite(age) ? age : userProfile.age,
      gender: gender ?? userProfile.gender,
      weight: Number.isFinite(weight) ? weight : userProfile.weight,
      height: Number.isFinite(height) ? height : userProfile.height,
    });
  }, [
    age,
    gender,
    weight,
    height,
    updateField,
    userProfile.age,
    userProfile.gender,
    userProfile.weight,
    userProfile.height,
  ]);

  const bmiSummary = useMemo(() => {
    if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) {
      return null;
    }

    return calculateBMI(weight, height);
  }, [weight, height]);

  return (
    <div dir="rtl" className="animate-slide-up space-y-5 text-right">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">الجنس</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleGenderSelect('male')}
            className={clsx(
              'cursor-pointer border-2 rounded-xl p-4 transition-all text-center',
              gender === 'male'
                ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <User className="mx-auto mb-2 h-5 w-5 text-slate-700" />
            <span className="text-sm font-semibold text-slate-800">ذكر</span>
          </button>

          <button
            type="button"
            onClick={() => handleGenderSelect('female')}
            className={clsx(
              'cursor-pointer border-2 rounded-xl p-4 transition-all text-center',
              gender === 'female'
                ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <Venus className="mx-auto mb-2 h-5 w-5 text-slate-700" />
            <span className="text-sm font-semibold text-slate-800">أنثى</span>
          </button>
        </div>
      </div>

      <Input
        label="العمر (سنة)"
        type="number"
        min={10}
        max={100}
        hint="بين 10 و 100 سنة"
        error={errors.age?.message ? String(errors.age.message) : undefined}
        {...register('age', { valueAsNumber: true })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="الوزن (كغ)"
          type="number"
          min={20}
          max={300}
          error={errors.weight?.message ? String(errors.weight.message) : undefined}
          {...register('weight', { valueAsNumber: true })}
        />

        <Input
          label="الطول (سم)"
          type="number"
          min={100}
          max={250}
          error={errors.height?.message ? String(errors.height.message) : undefined}
          {...register('height', { valueAsNumber: true })}
        />
      </div>

      {bmiSummary ? (
        <div
          className="rounded-xl border border-slate-200 border-l-4 bg-white p-4"
          style={{ borderLeftColor: bmiSummary.color }}
        >
          <p className="text-sm font-semibold text-slate-800">
            مؤشر كتلة الجسم: {bmiSummary.value} — {bmiSummary.categoryAr}
          </p>
        </div>
      ) : null}
    </div>
  );
}
