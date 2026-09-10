import { useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Flame, Leaf, Plus, Sprout, UtensilsCrossed, X } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { useUserProfile } from '../../../context/UserProfileContext';
import { CONSTANTS } from '../../../types/index';

const DIET_TYPE_UI = {
  omnivore: {
    label: 'كل شيء',
    description: 'لا قيود — أتناول كل أنواع الطعام',
    icon: UtensilsCrossed,
  },
  vegetarian: {
    label: 'نباتي',
    description: 'لا لحوم — أقبل البيض ومنتجات الألبان',
    icon: Leaf,
  },
  vegan: {
    label: 'نباتي صارم',
    description: 'لا منتجات حيوانية بالكامل',
    icon: Sprout,
  },
  keto: {
    label: 'كيتو',
    description: 'نسبة كربوهيدرات منخفضة جداً',
    icon: Flame,
  },
};

/**
 * @typedef {Object} ChipsInputProps
 * @property {string} label
 * @property {string} placeholder
 * @property {string[]} values
 * @property {(nextValues: string[]) => void} onChange
 * @property {string} [note]
 */

/**
 * Inline chips input used for free-text food preference lists.
 *
 * @param {ChipsInputProps} props
 * @returns {JSX.Element}
 */
function ChipsInput({ label, placeholder, values, onChange, note }) {
  const [draft, setDraft] = useState('');

  const handleAddChip = useCallback(() => {
    const nextValue = draft.trim().replace(/\s+/g, ' ');
    if (!nextValue) {
      return;
    }

    const hasDuplicate = values.some(
      (item) => item.trim().toLowerCase() === nextValue.toLowerCase()
    );

    if (!hasDuplicate) {
      onChange([...values, nextValue]);
    }

    setDraft('');
  }, [draft, onChange, values]);

  const handleRemoveChip = useCallback(
    (value) => {
      onChange(values.filter((item) => item !== value));
    },
    [onChange, values]
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700">{label}</p>

      <div className="flex items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleAddChip} leftIcon={<Plus className="h-4 w-4" />}>
          أضف
        </Button>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAddChip();
            }
          }}
          placeholder={placeholder}
        />
      </div>

      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800"
            >
              <button
                type="button"
                onClick={() => handleRemoveChip(item)}
                className="inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-emerald-200"
                aria-label={`إزالة ${item}`}
              >
                <X className="h-3 w-3" />
              </button>
              <span>{item}</span>
            </span>
          ))}
        </div>
      ) : null}

      {note ? <p className="text-xs text-slate-500">{note}</p> : null}
    </div>
  );
}

/**
 * Step 5 for collecting diet type and food preference chip lists.
 *
 * @returns {JSX.Element}
 */
export default function Step5FoodPreferences() {
  const { userProfile, updateFoodPreferences } = useUserProfile();

  const foodPreferences = userProfile.foodPreferences ?? {
    dietType: 'omnivore',
    forbiddenFoods: [],
    allergies: [],
    favoriteFoods: [],
  };

  const dietType = foodPreferences.dietType ?? 'omnivore';
  const forbiddenFoods = Array.isArray(foodPreferences.forbiddenFoods)
    ? foodPreferences.forbiddenFoods
    : [];
  const allergies = Array.isArray(foodPreferences.allergies) ? foodPreferences.allergies : [];
  const favoriteFoods = Array.isArray(foodPreferences.favoriteFoods)
    ? foodPreferences.favoriteFoods
    : [];

  const dietOptions = useMemo(
    () =>
      CONSTANTS.DIET_TYPES.map((option) => {
        const ui = DIET_TYPE_UI[option.value];

        return {
          value: option.value,
          ...ui,
        };
      }).filter((option) => Boolean(option.label)),
    []
  );

  const handleDietTypeSelect = useCallback(
    (value) => {
      updateFoodPreferences({ dietType: value });
    },
    [updateFoodPreferences]
  );

  return (
    <div dir="rtl" className="animate-slide-up space-y-6 text-right">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-800">التفضيلات الغذائية</h3>
        <p className="text-sm text-slate-500">اختر نمطك الغذائي ثم أضف تفضيلاتك لتخصيص الوجبات بدقة.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {dietOptions.map(({ value, description, icon: Icon }) => {
          const isSelected = dietType === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => handleDietTypeSelect(value)}
              className={clsx(
                'text-right cursor-pointer border-2 rounded-xl p-4 transition-all',
                isSelected
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                  <Icon className="h-4.5 w-4.5" />
                </span>

                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800">{DIET_TYPE_UI[value]?.label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <ChipsInput
        label="الأطعمة الممنوعة"
        placeholder="مثال: لحم الخنزير، الكحول..."
        values={forbiddenFoods}
        onChange={(nextValues) => updateFoodPreferences({ forbiddenFoods: nextValues })}
        note="لن نقترح أي وجبة تحتوي على هذه المكونات"
      />

      <ChipsInput
        label="الحساسيات الغذائية"
        placeholder="مثال: المكسرات، الغلوتين..."
        values={allergies}
        onChange={(nextValues) => updateFoodPreferences({ allergies: nextValues })}
      />

      <ChipsInput
        label="أطعمة تحبّها"
        placeholder="مثال: الأرز، الدجاج، الخضار..."
        values={favoriteFoods}
        onChange={(nextValues) => updateFoodPreferences({ favoriteFoods: nextValues })}
      />
    </div>
  );
}
