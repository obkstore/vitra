import axios from "axios";
import { getToken } from "./authService.js";
import { BASE_URL } from "./apiConfig.js";

/**
 * Centralized Axios instance for all VITRA API calls.
 *
 * Injects `Authorization: Bearer <token>` from the stored session into
 * every outgoing request. Intentionally has NO response interceptor:
 * 401s from /api/generate-plan mean a server-key problem, not an expired
 * user session, so auto-logout here would cause accidental logouts.
 */
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
