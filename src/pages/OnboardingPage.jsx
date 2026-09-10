import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  Dumbbell,
  Heart,
  Sparkles,
  Target,
  User,
  UtensilsCrossed,
} from 'lucide-react';
import { useStepper, ONBOARDING_STEPS } from '../context/StepperContext';
import { useUserProfile } from '../context/UserProfileContext';
import { usePlan } from '../context/PlanContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import PageWrapper from '../components/layout/PageWrapper';
import planService from '../services/aiService';
import { savePlanToServer } from '../services/userPlanService';
import formatNutritionSummary from '../utils/nutritionCalculator';
import calculateBalanceIndex from '../utils/balanceIndex';
import toast from 'react-hot-toast';
import brandLogo from '../../logo.png';

const Step1 = lazy(() => import('../features/onboarding/steps/Step1_PersonalInfo'));
const Step2 = lazy(() => import('../features/onboarding/steps/Step2_HealthStatus'));
const Step3 = lazy(() => import('../features/onboarding/steps/Step3_Goals'));
const Step4 = lazy(() => import('../features/onboarding/steps/Step4_MentalState'));
const Step5 = lazy(() => import('../features/onboarding/steps/Step5_FoodPreferences'));
const Step6 = lazy(() => import('../features/onboarding/steps/Step6_ActivityLevel'));

const STEP_COMPONENTS = {
  1: Step1,
  2: Step2,
  3: Step3,
  4: Step4,
  5: Step5,
  6: Step6,
};

const STEP_ICON_MAP = {
  User,
  Heart,
  Target,
  Brain,
  UtensilsCrossed,
  Dumbbell,
};

/**
 * Multi-step onboarding orchestrator that coordinates profile input and AI plan generation.
 *
 * @returns {JSX.Element}
 */
export default function OnboardingPage() {
  const navigate = useNavigate();
  const {
    currentStep,
    currentStepData,
    stepErrors,
    isFirstStep,
    isLastStep,
    progressPercent,
    goToNext,
    goToPrev,
    markStepComplete,
    setStepError,
    clearStepError,
    resetStepper,
  } = useStepper();
  const { userProfile } = useUserProfile();
  const { isAuthenticated } = useAuth();
  const {
    isLoading,
    error,
    startGeneration,
    setGeneratedPlan,
    setGenerationError,
    clearError,
  } = usePlan();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // إعادة الـ stepper للبداية عند كل دخول لصفحة الـ Onboarding
  useEffect(() => {
    resetStepper();
  }, [resetStepper]);

  const CurrentStepComponent = STEP_COMPONENTS[currentStep] ?? Step1;
  const StepIcon = STEP_ICON_MAP[currentStepData?.icon] ?? Sparkles;
  const totalSteps = ONBOARDING_STEPS.length;
  const currentStepError = stepErrors?.[currentStep] ?? null;

  const validateCurrentStep = useCallback(() => {
    if (currentStep === 1) {
      const age = Number(userProfile.age);
      const weight = Number(userProfile.weight);
      const height = Number(userProfile.height);
      const validGender = userProfile.gender === 'male' || userProfile.gender === 'female';

      if (!validGender) {
        return 'الرجاء اختيار الجنس بشكل صحيح.';
      }

      if (!Number.isFinite(age) || age < 10 || age > 100) {
        return 'العمر يجب أن يكون بين 10 و100 سنة.';
      }

      if (!Number.isFinite(weight) || weight < 20 || weight > 300) {
        return 'الوزن يجب أن يكون بين 20 و300 كغ.';
      }

      if (!Number.isFinite(height) || height < 100 || height > 250) {
        return 'الطول يجب أن يكون بين 100 و250 سم.';
      }

      return null;
    }

    if (currentStep === 2) {
      const conditions = Array.isArray(userProfile.healthConditions)
        ? userProfile.healthConditions
        : [];

      if (conditions.length === 0) {
        return 'اختر حالة صحية واحدة على الأقل.';
      }

      if (conditions.includes('none') && conditions.length > 1) {
        return 'عند اختيار "لا توجد حالات مزمنة" لا يمكن اختيار حالات أخرى معها.';
      }

      return null;
    }

    if (currentStep === 3) {
      const validGoals = ['lose_weight', 'gain_weight', 'improve_mood', 'maintain'];
      if (!validGoals.includes(userProfile.goal)) {
        return 'الرجاء اختيار هدف صحي صحيح.';
      }

      return null;
    }

    if (currentStep === 4) {
      const stressLevel = Number(userProfile.mentalState?.stressLevel);
      const sleepQuality = Number(userProfile.mentalState?.sleepQuality);
      const energyLevel = Number(userProfile.mentalState?.energyLevel);
      const values = [stressLevel, sleepQuality, energyLevel];
      const hasOutOfRange = values.some((value) => !Number.isFinite(value) || value < 1 || value > 5);

      if (hasOutOfRange) {
        return 'قيم الحالة النفسية يجب أن تكون بين 1 و5.';
      }

      return null;
    }

    if (currentStep === 5) {
      const validDietTypes = ['omnivore', 'vegetarian', 'vegan', 'keto'];
      const dietType = userProfile.foodPreferences?.dietType;

      if (!validDietTypes.includes(dietType)) {
        return 'الرجاء اختيار نوع النظام الغذائي.';
      }

      return null;
    }

    if (currentStep === 6) {
      const validActivityLevels = ['sedentary', 'lightly_active', 'moderately_active', 'very_active'];
      const availableEquipment = Array.isArray(userProfile.availableEquipment)
        ? userProfile.availableEquipment
        : [];

      if (!validActivityLevels.includes(userProfile.activityLevel)) {
        return 'الرجاء اختيار مستوى النشاط البدني.';
      }

      if (availableEquipment.length === 0) {
        return 'الرجاء اختيار المعدات المتاحة (أو بدون أي معدات).';
      }

      return null;
    }

    return null;
  }, [currentStep, userProfile]);

  const handleGeneratePlan = useCallback(async () => {
    if (isLoading || isSubmitting) {
      return;
    }

    clearError();
    setIsSubmitting(true);
    startGeneration();

    try {
      const nutritionSummary = formatNutritionSummary(userProfile);
      const computedBalanceIndex = calculateBalanceIndex(userProfile);
      const result = await planService.generate(userProfile, nutritionSummary);

      const normalizedPlan = {
        ...result,
        userProfile: result?.userProfile ?? userProfile,
        balanceIndex: result?.balanceIndex ?? computedBalanceIndex,
        generatedAt: result?.generatedAt ?? new Date().toISOString(),
        planDurationWeeks: result?.planDurationWeeks ?? 4,
      };

      setGeneratedPlan(normalizedPlan);
      // Local-first: the plan is already in this account's namespaced slot.
      // Best-effort server backup for signed-in users (cross-device restore);
      // guests have no userId and skip silently. Never blocks navigation.
      if (isAuthenticated) {
        savePlanToServer(normalizedPlan).catch(() => {});
      }
      toast.success('✅ تم توليد خطتك بنجاح!');
      navigate('/results');
    } catch (generationError) {
      const message = generationError instanceof Error
        ? generationError.message
        : 'حدث خطأ غير متوقع أثناء توليد الخطة';

      setGenerationError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isLoading,
    isSubmitting,
    clearError,
    startGeneration,
    userProfile,
    setGeneratedPlan,
    navigate,
    setGenerationError,
    isAuthenticated,
  ]);

  const handleNext = useCallback(() => {
    const validationError = validateCurrentStep();

    if (validationError) {
      setStepError(currentStep, validationError);
      toast.error(validationError);
      return;
    }

    clearStepError(currentStep);

    if (isLastStep) {
      handleGeneratePlan();
      return;
    }

    markStepComplete(currentStep);
    goToNext();
  }, [
    validateCurrentStep,
    setStepError,
    currentStep,
    clearStepError,
    isLastStep,
    handleGeneratePlan,
    markStepComplete,
    goToNext,
  ]);

  return (
    <PageWrapper maxWidth="md" withHeader={false}>
      <div dir="rtl" className="min-h-screen flex items-center bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.08),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] py-8 px-4">
        <div className="w-full">
          <div className="grid grid-cols-3 items-center mb-5 gap-3">
            <div className="justify-self-start">
              {!isFirstStep ? (
                <Button variant="ghost" size="sm" onClick={goToPrev} disabled={isLoading || isSubmitting}>
                  رجوع
                </Button>
              ) : null}
            </div>

            <div className="justify-self-center inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-1 shadow-sm backdrop-blur">
              <img src={brandLogo} alt="VITRA" className="h-5 w-5 object-contain" />
              <span className="text-base font-bold gradient-text">VITRA</span>
            </div>

            <div className="justify-self-end text-sm font-semibold text-slate-500">
              {currentStep} / {totalSteps}
            </div>
          </div>

          <div className="w-full rounded-full bg-slate-200 h-1.5 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-mental-600 via-brand-600 to-brand-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="mt-8 mb-6 text-center">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-gradient-to-br from-mental-100 to-brand-100 text-mental-700 inline-flex items-center justify-center shadow-sm">
              <StepIcon className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold leading-relaxed text-slate-800">{currentStepData?.titleAr}</h2>
          </div>

          <Card variant="default" className="shadow-soft border border-brand-100 bg-white/95">
            <Suspense
              fallback={(
                <div className="py-10 text-center text-slate-500">جاري تحميل الخطوة...</div>
              )}
            >
              <CurrentStepComponent />
            </Suspense>
          </Card>

          {currentStepError ? (
            <Card variant="flat" className="mt-6 border border-energy-100 bg-energy-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-energy-800">{currentStepError}</p>
                <Button variant="ghost" size="sm" onClick={() => clearStepError(currentStep)}>
                  حسناً
                </Button>
              </div>
            </Card>
          ) : null}

          {error ? (
            <Card variant="flat" className="mt-6 border border-rose-200 bg-rose-50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-rose-700">{error}</p>
                <Button variant="danger" size="sm" onClick={clearError}>
                  حاول مجدداً
                </Button>
              </div>
            </Card>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3">
            {!isFirstStep ? (
              <Button
                variant="secondary"
                onClick={goToPrev}
                disabled={isLoading || isSubmitting}
              >
                السابق
              </Button>
            ) : (
              <span />
            )}

            <div className={isLastStep ? 'flex-1' : ''}>
              <Button
                variant="primary"
                onClick={handleNext}
                isLoading={isLoading}
                disabled={isLoading || isSubmitting}
                fullWidth={isLastStep}
              >
                {isLastStep ? (isLoading ? 'جاري التوليد...' : 'احصل على خطتك 🎯') : 'التالي'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
