import { createContext, useCallback, useContext, useEffect, useReducer, useRef } from "react";
import { useAuth } from "./AuthContext";
import { getUsername } from "../services/authService.js";
import { readScoped, removeScoped, writeScoped } from "../utils/userScopedStorage.js";

/** @typedef {import("../types/index.js").UserProfile} UserProfile */

/**
 * Context value contract exposed to onboarding components.
 * @typedef {Object} UserProfileContextValue
 * @property {UserProfile} userProfile Current onboarding form state.
 * @property {(partialData: Partial<UserProfile>) => void} updateField Updates top-level profile fields.
 * @property {(partialData: Partial<UserProfile["mentalState"]>) => void} updateMentalState Updates mental state sub-fields.
 * @property {(partialData: Partial<UserProfile["foodPreferences"]>) => void} updateFoodPreferences Updates food preference sub-fields.
 * @property {(field: string, value: string) => void} toggleArrayItem Adds or removes a value from an array field.
 * @property {() => void} resetProfile Resets onboarding state to defaults.
 * @property {boolean} isProfileComplete Whether minimum required profile fields are completed.
 */

/**
 * Reducer action format for profile state transitions.
 * @typedef {Object} UserProfileAction
 * @property {"UPDATE_FIELD"|"UPDATE_MENTAL_STATE"|"UPDATE_FOOD_PREFERENCES"|"TOGGLE_ARRAY_ITEM"|"RESET"|"LOAD"} type Action type.
 * @property {any} [payload] Action payload.
 */

/**
 * Safe defaults for the onboarding form.
 * @type {UserProfile}
 */
export const initialUserProfile = {
	age: 25,
	gender: "male",
	weight: 70,
	height: 170,
	healthConditions: [],
	goal: "maintain",
	mentalState: {
		stressLevel: 3,
		sleepQuality: 3,
		energyLevel: 3,
	},
	foodPreferences: {
		favoriteFoods: [],
		forbiddenFoods: [],
		allergies: [],
		dietType: "omnivore",
	},
	activityLevel: "lightly_active",
	availableEquipment: [],
};

const PROFILE_STORAGE_KEY = "healthplan_user_profile";

const loadPersistedProfile = (username) => {
	// Signed-in users one-time adopt the pre-namespacing global slot;
	// everyone else starts from defaults. Guests keep the legacy key.
	const saved = readScoped(PROFILE_STORAGE_KEY, username ?? null);
	if (saved) {
		return saved;
	}

	return initialUserProfile;
};

/**
 * Handles all profile state updates for the onboarding flow.
 * @param {UserProfile} state Current user profile state.
 * @param {UserProfileAction} action Reducer action.
 * @returns {UserProfile} Next state.
 */
function userProfileReducer(state, action) {
	switch (action.type) {
		case "UPDATE_FIELD": {
			return {
				...state,
				...action.payload,
			};
		}

		case "UPDATE_MENTAL_STATE": {
			return {
				...state,
				mentalState: {
					...state.mentalState,
					...action.payload,
				},
			};
		}

		case "UPDATE_FOOD_PREFERENCES": {
			return {
				...state,
				foodPreferences: {
					...state.foodPreferences,
					...action.payload,
				},
			};
		}

		case "TOGGLE_ARRAY_ITEM": {
			const { field, value } = action.payload || {};
			if (!field || typeof value !== "string") return state;

			// منطق العمل: يدعم التبديل في الحقول المصفوفية المباشرة أو المتداخلة بصيغة parent.child.
			if (field.includes(".")) {
				const [parentKey, childKey] = field.split(".");
				const parentValue = state[parentKey];
				const targetArray = parentValue?.[childKey];

				if (!Array.isArray(targetArray)) return state;

				const nextArray = targetArray.includes(value)
					? targetArray.filter((item) => item !== value)
					: [...targetArray, value];

				return {
					...state,
					[parentKey]: {
						...parentValue,
						[childKey]: nextArray,
					},
				};
			}

			const currentArray = state[field];
			if (!Array.isArray(currentArray)) return state;

			return {
				...state,
				[field]: currentArray.includes(value)
					? currentArray.filter((item) => item !== value)
					: [...currentArray, value],
			};
		}

		case "RESET": {
			return initialUserProfile;
		}

		case "LOAD": {
			return action.payload ?? initialUserProfile;
		}

		default:
			return state;
	}
}

/** @type {import("react").Context<UserProfileContextValue | undefined>} */
const UserProfileContext = createContext(undefined);

/**
 * Provides user profile state and actions to all onboarding steps.
 * @param {{ children: import("react").ReactNode }} props Provider props.
 * @returns {JSX.Element} Context provider wrapper.
 */
export function UserProfileProvider({ children }) {
	const { username: authUsername } = useAuth();
	const initialOwner = authUsername ?? getUsername() ?? null;
	const ownerRef = useRef(initialOwner);
	const justSwitchedRef = useRef(false);
	const [userProfile, dispatch] = useReducer(
		userProfileReducer,
		undefined,
		() => loadPersistedProfile(initialOwner),
	);

	// Account switch (login / register / logout) FIRST: swap to the new
	// identity's slot so no account ever reads another's profile data.
	useEffect(() => {
		const current = authUsername ?? null;
		if (current !== ownerRef.current) {
			ownerRef.current = current;
			justSwitchedRef.current = true;
			dispatch({ type: "LOAD", payload: loadPersistedProfile(current) });
		}
	}, [authUsername]);

	// Persist under the current owner's slot SECOND. Skips the render right
	// after a switch so the previous owner's data is never written into the
	// new owner's slot.
	useEffect(() => {
		if (justSwitchedRef.current) {
			justSwitchedRef.current = false;
			return;
		}
		writeScoped(PROFILE_STORAGE_KEY, ownerRef.current, userProfile);
	}, [userProfile]);

	/**
	 * Updates one or more top-level profile fields.
	 * @param {Partial<UserProfile>} partialData Partial top-level profile data.
	 * @returns {void}
	 */
	const updateField = useCallback((partialData) => {
		dispatch({ type: "UPDATE_FIELD", payload: partialData });
	}, []);

	/**
	 * Updates one or more fields inside mentalState.
	 * @param {Partial<UserProfile["mentalState"]>} partialData Partial mental state data.
	 * @returns {void}
	 */
	const updateMentalState = useCallback((partialData) => {
		dispatch({ type: "UPDATE_MENTAL_STATE", payload: partialData });
	}, []);

	/**
	 * Updates one or more fields inside foodPreferences.
	 * @param {Partial<UserProfile["foodPreferences"]>} partialData Partial food preferences data.
	 * @returns {void}
	 */
	const updateFoodPreferences = useCallback((partialData) => {
		dispatch({ type: "UPDATE_FOOD_PREFERENCES", payload: partialData });
	}, []);

	/**
	 * Toggles a string value in an array field.
	 * @param {string} field Array field name (supports nested path like "foodPreferences.favoriteFoods").
	 * @param {string} value Item value to add or remove.
	 * @returns {void}
	 */
	const toggleArrayItem = useCallback((field, value) => {
		dispatch({ type: "TOGGLE_ARRAY_ITEM", payload: { field, value } });
	}, []);

	/**
	 * Restores profile defaults.
	 * @returns {void}
	 */
	const resetProfile = useCallback(() => {
		dispatch({ type: "RESET" });
		removeScoped(PROFILE_STORAGE_KEY, ownerRef.current);
	}, []);

	// منطق الأعمال: اكتمال الملف الشخصي يتطلب القيم الأساسية قبل توليد الخطة.
	const isProfileComplete = Boolean(
		userProfile.age && userProfile.weight && userProfile.height && userProfile.goal,
	);

	/** @type {UserProfileContextValue} */
	const contextValue = {
		userProfile,
		updateField,
		updateMentalState,
		updateFoodPreferences,
		toggleArrayItem,
		resetProfile,
		isProfileComplete,
	};

	return (
		<UserProfileContext.Provider value={contextValue}>
			{children}
		</UserProfileContext.Provider>
	);
}

/**
 * Reads profile context and enforces provider usage.
 * @returns {UserProfileContextValue} User profile context value.
 */
export function useUserProfile() {
	const context = useContext(UserProfileContext);

	if (!context) {
		throw new Error("useUserProfile must be used within a UserProfileProvider.");
	}

	return context;
}

