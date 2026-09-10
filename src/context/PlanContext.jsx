import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { useAuth } from "./AuthContext";
import { getUsername } from "../services/authService.js";
import { loadPlanFromServer } from "../services/userPlanService.js";
import { readScoped, removeScoped, writeScoped } from "../utils/userScopedStorage.js";

/** @typedef {import("../types/index.js").GeneratedPlan} GeneratedPlan */

const PLAN_STORAGE_KEY = "healthplan_generated_plan";

/**
 * Reducer state for AI-generated plan lifecycle.
 * @typedef {Object} PlanState
 * @property {(GeneratedPlan | null)} generatedPlan
 * @property {boolean} isLoading
 * @property {(string | null)} error
 * @property {boolean} hasGenerated
 * @property {number} retryCount
 * @property {(string | null)} planOwner Username owning the loaded plan, null for guests.
 */

/**
 * Reducer action shape for plan generation events.
 * @typedef {Object} PlanAction
 * @property {"GENERATION_START"|"GENERATION_SUCCESS"|"GENERATION_ERROR"|"RESET_PLAN"|"CLEAR_ERROR"|"SWITCH_OWNER"} type
 * @property {(GeneratedPlan | string | { plan: (GeneratedPlan | null), owner: (string | null) })} [payload]
 */

/**
 * Context value exposed for plan generation and consumption.
 * @typedef {Object} PlanContextValue
 * @property {(GeneratedPlan | null)} generatedPlan
 * @property {boolean} isLoading
 * @property {(string | null)} error
 * @property {boolean} hasGenerated
 * @property {number} retryCount
 * @property {(string | null)} planOwner Username owning the loaded plan, null for guests.
 * @property {() => void} startGeneration
 * @property {(plan: GeneratedPlan) => void} setGeneratedPlan
 * @property {(message: string) => void} setGenerationError
 * @property {() => void} resetPlan
 * @property {() => void} clearError
 * @property {(GeneratedPlan["nutritionPlan"] | null)} nutritionPlan
 * @property {(GeneratedPlan["exercisePlan"] | null)} exercisePlan
 * @property {(GeneratedPlan["balanceIndex"] | null)} balanceIndex
 */

/**
 * Fresh empty state for an owner (brand-new account / guest with no plan).
 * @param {(string | null)} owner Username or null for guests.
 * @returns {PlanState}
 */
function freshPlanState(owner) {
	return {
		generatedPlan: null,
		isLoading: false,
		error: null,
		hasGenerated: false,
		retryCount: 0,
		planOwner: owner ?? null,
	};
}

/**
 * Loads the persisted slot for an identity. Signed-in users one-time adopt
 * the pre-namespacing global slot; everyone else starts blank.
 * @param {(string | null)} username Authenticated username or null for guests.
 * @returns {PlanState}
 */
function loadPersistedPlan(username) {
	const owner = username ?? null;
	const saved = readScoped(PLAN_STORAGE_KEY, owner);
	if (saved) {
		return {
			generatedPlan: saved,
			isLoading: false,
			error: null,
			hasGenerated: true,
			retryCount: 0,
			planOwner: owner,
		};
	}
	return freshPlanState(owner);
}

/**
 * Handles generated plan state transitions.
 * @param {PlanState} state
 * @param {PlanAction} action
 * @returns {PlanState}
 */
function planReducer(state, action) {
	switch (action.type) {
		case "GENERATION_START": {
			return {
				...state,
				isLoading: true,
				error: null,
			};
		}

		case "GENERATION_SUCCESS": {
			return {
				...state,
				generatedPlan: action.payload,
				isLoading: false,
				hasGenerated: true,
				retryCount: 0,
			};
		}

		case "GENERATION_ERROR": {
			return {
				...state,
				error: action.payload,
				isLoading: false,
				retryCount: state.retryCount + 1,
			};
		}

		case "RESET_PLAN": {
			// Fresh empty state for the SAME owner (fixes the old bug where
			// reset restored the module-level snapshot of whoever owned the
			// slot at first load). Callers also delete the owner's slot.
			return freshPlanState(state.planOwner);
		}

		case "SWITCH_OWNER": {
			const { plan, owner } = action.payload ?? {};
			if (plan) {
				return {
					generatedPlan: plan,
					isLoading: false,
					error: null,
					hasGenerated: true,
					retryCount: 0,
					planOwner: owner ?? null,
				};
			}
			return freshPlanState(owner ?? null);
		}

		case "CLEAR_ERROR": {
			return {
				...state,
				error: null,
			};
		}

		default:
			return state;
	}
}

/** @type {import("react").Context<PlanContextValue | undefined>} */
const PlanContext = createContext(undefined);

/**
 * Provides generated plan state and mutation helpers.
 * Plans are namespaced per user: switching accounts (login / register /
 * logout) swaps the active slot, so no account ever reads another's plan.
 * @param {{ children: import("react").ReactNode }} props
 * @returns {JSX.Element}
 */
export function PlanProvider({ children }) {
	const { username: authUsername } = useAuth();
	const [state, dispatch] = useReducer(planReducer, undefined, () => loadPersistedPlan(getUsername()));
	const ownerRef = useRef(state.planOwner);

	// Mirror the current owner for event handlers (refs must only be
	// touched inside effects and handlers, never during render).
	useEffect(() => {
		ownerRef.current = state.planOwner;
	});

	// Persist under the current owner's slot.
	useEffect(() => {
		if (state.generatedPlan) {
			writeScoped(PLAN_STORAGE_KEY, state.planOwner, state.generatedPlan);
		}
	}, [state.generatedPlan, state.planOwner]);

	// Account switch (login / register / logout): swap to the new identity's
	// slot. A fresh account finds nothing and starts blank — the leak fix.
	useEffect(() => {
		const current = authUsername ?? null;
		if (current !== state.planOwner) {
			const saved = readScoped(PLAN_STORAGE_KEY, current);
			dispatch({ type: "SWITCH_OWNER", payload: { plan: saved, owner: current } });
		}
	}, [authUsername, state.planOwner]);

	// Server fallback: signed-in owner with an empty local slot tries the
	// server copy (cross-device restore). Guests never touch the server.
	useEffect(() => {
		if (!authUsername || state.hasGenerated || state.planOwner !== authUsername) return;
		let cancelled = false;
		loadPlanFromServer()
			.then((plan) => {
				if (!cancelled && plan) {
					dispatch({ type: "GENERATION_SUCCESS", payload: plan });
				}
			})
			.catch(() => {
				// Offline / server down: stay on the empty local state.
			});
		return () => {
			cancelled = true;
		};
	}, [authUsername, state.hasGenerated, state.planOwner]);

	const startGeneration = useCallback(() => {
		dispatch({ type: "GENERATION_START" });
	}, []);

	const setGeneratedPlan = useCallback((plan) => {
		dispatch({ type: "GENERATION_SUCCESS", payload: plan });
	}, []);

	const setGenerationError = useCallback((message) => {
		dispatch({ type: "GENERATION_ERROR", payload: message });
	}, []);

	const resetPlan = useCallback(() => {
		dispatch({ type: "RESET_PLAN" });
		removeScoped(PLAN_STORAGE_KEY, ownerRef.current);
	}, []);

	const clearError = useCallback(() => {
		dispatch({ type: "CLEAR_ERROR" });
	}, []);

	const contextValue = useMemo(() => {
		const generatedPlan = state.generatedPlan;

		return {
			generatedPlan,
			isLoading: state.isLoading,
			error: state.error,
			hasGenerated: state.hasGenerated,
			retryCount: state.retryCount,
			planOwner: state.planOwner,
			startGeneration,
			setGeneratedPlan,
			setGenerationError,
			resetPlan,
			clearError,
			nutritionPlan: generatedPlan?.nutritionPlan ?? null,
			exercisePlan: generatedPlan?.exercisePlan ?? null,
			balanceIndex: generatedPlan?.balanceIndex ?? null,
		};
	}, [state, startGeneration, setGeneratedPlan, setGenerationError, resetPlan, clearError]);

	return <PlanContext.Provider value={contextValue}>{children}</PlanContext.Provider>;
}

/**
 * Accesses plan context and enforces provider usage.
 * @returns {PlanContextValue}
 */
export function usePlan() {
	const context = useContext(PlanContext);

	if (!context) {
		throw new Error("usePlan must be used within a PlanProvider.");
	}

	return context;
}

export default usePlan;
