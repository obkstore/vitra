import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
	useState,
} from "react";

/**
 * Step metadata used to drive the onboarding wizard UI.
 * @type {Array<{
 * 	id: number,
 * 	key: string,
 * 	titleAr: string,
 * 	icon: string,
 * 	fields: string[]
 * }>}
 */
export const ONBOARDING_STEPS = [
	{
		id: 1,
		key: "personal",
		titleAr: "المعلومات الشخصية",
		icon: "User",
		fields: ["age", "gender", "weight", "height"],
	},
	{
		id: 2,
		key: "health",
		titleAr: "الحالة الصحية",
		icon: "Heart",
		fields: ["healthConditions"],
	},
	{
		id: 3,
		key: "goals",
		titleAr: "أهدافك الصحية",
		icon: "Target",
		fields: ["goal"],
	},
	{
		id: 4,
		key: "mental",
		titleAr: "حالتك النفسية",
		icon: "Brain",
		fields: ["mentalState"],
	},
	{
		id: 5,
		key: "food",
		titleAr: "التفضيلات الغذائية",
		icon: "UtensilsCrossed",
		fields: ["foodPreferences"],
	},
	{
		id: 6,
		key: "activity",
		titleAr: "النشاط البدني",
		icon: "Dumbbell",
		fields: ["activityLevel", "availableEquipment"],
	},
];

const TOTAL_STEPS = ONBOARDING_STEPS.length;
const INITIAL_STEP = 1;

/**
 * Reducer for completed steps.
 * @param {Set<number>} state
 * @param {{ type: "MARK_COMPLETE"|"RESET", payload?: number }} action
 * @returns {Set<number>}
 */
function completedStepsReducer(state, action) {
	switch (action.type) {
		case "MARK_COMPLETE": {
			if (typeof action.payload !== "number") {
				return state;
			}

			const next = new Set(state);
			next.add(action.payload);
			return next;
		}

		case "RESET": {
			return new Set();
		}

		default:
			return state;
	}
}

/**
 * Reducer for per-step validation or submission errors.
 * @param {Record<number, string>} state
 * @param {{ type: "SET_ERROR"|"CLEAR_ERROR"|"RESET", payload?: { stepId: number, message?: string } }} action
 * @returns {Record<number, string>}
 */
function stepErrorsReducer(state, action) {
	switch (action.type) {
		case "SET_ERROR": {
			const stepId = action.payload?.stepId;
			const message = action.payload?.message;

			if (typeof stepId !== "number" || typeof message !== "string") {
				return state;
			}

			return {
				...state,
				[stepId]: message,
			};
		}

		case "CLEAR_ERROR": {
			const stepId = action.payload?.stepId;
			if (typeof stepId !== "number") {
				return state;
			}

			const { [stepId]: _removed, ...remainingErrors } = state;
			return remainingErrors;
		}

		case "RESET": {
			return {};
		}

		default:
			return state;
	}
}

/** @type {import("react").Context<any>} */
const StepperContext = createContext(undefined);

/**
 * Provides onboarding stepper state and navigation helpers.
 * @param {{ children: import("react").ReactNode }} props
 * @returns {JSX.Element}
 */
export function StepperProvider({ children }) {
	const [currentStep, setCurrentStep] = useState(INITIAL_STEP);
	const [completedSteps, dispatchCompletedSteps] = useReducer(
		completedStepsReducer,
		new Set(),
	);
	const [stepErrors, dispatchStepErrors] = useReducer(stepErrorsReducer, {});

	const goToNext = useCallback(() => {
		setCurrentStep((prev) => (prev < TOTAL_STEPS ? prev + 1 : prev));
	}, []);

	const goToPrev = useCallback(() => {
		setCurrentStep((prev) => (prev > INITIAL_STEP ? prev - 1 : prev));
	}, []);

	const goToStep = useCallback(
		(stepId) => {
			if (typeof stepId !== "number") {
				return;
			}

			if (stepId < INITIAL_STEP || stepId > TOTAL_STEPS) {
				return;
			}

			const isAdjacent = Math.abs(stepId - currentStep) === 1;
			if (completedSteps.has(stepId) || isAdjacent || stepId === currentStep) {
				setCurrentStep(stepId);
			}
		},
		[currentStep, completedSteps],
	);

	const markStepComplete = useCallback((stepId) => {
		dispatchCompletedSteps({ type: "MARK_COMPLETE", payload: stepId });
	}, []);

	const setStepError = useCallback((stepId, message) => {
		dispatchStepErrors({
			type: "SET_ERROR",
			payload: { stepId, message },
		});
	}, []);

	const clearStepError = useCallback((stepId) => {
		dispatchStepErrors({
			type: "CLEAR_ERROR",
			payload: { stepId },
		});
	}, []);

	const resetStepper = useCallback(() => {
		setCurrentStep(INITIAL_STEP);
		dispatchCompletedSteps({ type: "RESET" });
		dispatchStepErrors({ type: "RESET" });
	}, []);

	const contextValue = useMemo(() => {
		const currentStepData =
			ONBOARDING_STEPS.find((step) => step.id === currentStep) ?? ONBOARDING_STEPS[0];

		return {
			currentStep,
			totalSteps: TOTAL_STEPS,
			ONBOARDING_STEPS,
			currentStepData,
			completedSteps,
			stepErrors,
			isFirstStep: currentStep === INITIAL_STEP,
			isLastStep: currentStep === TOTAL_STEPS,
			progressPercent: (currentStep / TOTAL_STEPS) * 100,
			goToNext,
			goToPrev,
			goToStep,
			markStepComplete,
			setStepError,
			clearStepError,
			resetStepper,
		};
	}, [
		currentStep,
		completedSteps,
		stepErrors,
		goToNext,
		goToPrev,
		goToStep,
		markStepComplete,
		setStepError,
		clearStepError,
		resetStepper,
	]);

	return <StepperContext.Provider value={contextValue}>{children}</StepperContext.Provider>;
}

/**
 * Accesses stepper context and enforces provider usage.
 * @returns {any}
 */
export function useStepper() {
	const context = useContext(StepperContext);

	if (!context) {
		throw new Error("useStepper must be used within a StepperProvider.");
	}

	return context;
}
