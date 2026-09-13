import axios from "axios";
import apiClient from "./apiClient.js";

/**
 * Client for the per-user server plan store (/api/plans).
 * Owner is always token-derived server-side — the client never sends a
 * username. Local-first policy: localStorage stays the primary store;
 * these calls only sync to / restore from the server copy.
 */

/**
 * Saves the caller's latest plan (upsert by token identity).
 * @param {unknown} plan Generated plan object.
 * @returns {Promise<void>}
 */
export async function savePlanToServer(plan) {
  try {
    const response = await apiClient.post("/plans", { plan });
    if (response.data?.ok !== true) {
      throw new Error(response.data?.error ?? "تعذر حفظ الخطة على الخادم.");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      if (statusCode === 401) {
        throw new Error("انتهت الجلسة. سجّل الدخول مجدداً.");
      }
      const serverError = error.response?.data?.error;
      throw new Error(
        typeof serverError === "string" && serverError
          ? serverError
          : "تعذر حفظ الخطة على الخادم.",
      );
    }
    throw error instanceof Error ? error : new Error("تعذر حفظ الخطة على الخادم.");
  }
}

/**
 * Loads the caller's latest server plan.
 * @returns {Promise<any|null>} Plan, or null when none saved yet (HTTP 404).
 */
export async function loadPlanFromServer() {
  try {
    const response = await apiClient.get("/plans/mine");
    if (response.data?.ok !== true || !response.data?.plan) {
      return null;
    }
    return response.data.plan;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}
