import axios from "axios";

/**
 * Centralized auth service for VITRA.
 *
 * Owns all communication with POST /api/auth/login and
 * POST /api/auth/register plus all localStorage session keys.
 * No other file should read/write the token keys directly.
 */

export const TOKEN_KEY = "vitra_token";
export const USERNAME_KEY = "vitra_username";
export const ASSIGNED_PAGE_KEY = "vitra_assigned_page";

const LOGIN_URL = "/api/auth/login";
const REGISTER_URL = "/api/auth/register";

const FALLBACK_LOGIN_MESSAGE = "تعذر تسجيل الدخول. تحقق من البيانات وحاول مجدداً.";
const FALLBACK_REGISTER_MESSAGE = "تعذر إنشاء الحساب. تحقق من البيانات وحاول مجدداً.";
const NETWORK_MESSAGE = "تعذر الاتصال بالخادم. تحقق من اتصالك وحاول مجدداً.";
const SERVER_MESSAGE = "خطأ في الخادم. حاول لاحقاً.";

/**
 * Safe localStorage read (works in private mode / non-browser envs).
 * @param {string} key Storage key.
 * @returns {string|null} Stored value or null.
 */
function safeGet(key) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safe localStorage write.
 * @param {string} key Storage key.
 * @param {string} value Value to store.
 * @returns {void}
 */
function safeSet(key, value) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch {
    // Quota / private-mode failure: session simply won't persist.
  }
}

/**
 * Safe localStorage removal.
 * @param {string} key Storage key.
 * @returns {void}
 */
function safeRemove(key) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch {
    // Ignore removal failures.
  }
}

/**
 * Reads the stored JWT.
 * @returns {string|null} JWT or null when logged out.
 */
export function getToken() {
  return safeGet(TOKEN_KEY);
}

/**
 * Reads the stored username.
 * @returns {string|null} Username or null.
 */
export function getUsername() {
  return safeGet(USERNAME_KEY);
}

/**
 * Reads the stored assignedPage (user's own diet-plan route).
 * @returns {string|null} Assigned page or null.
 */
export function getAssignedPage() {
  return safeGet(ASSIGNED_PAGE_KEY);
}

/**
 * Persists a login/register session. Only truthy values are stored.
 * @param {{ token?: unknown, username?: unknown, assignedPage?: unknown }} session Session payload.
 * @returns {void}
 */
export function saveSession(session) {
  const { token, username, assignedPage } = session ?? {};
  if (typeof token === "string" && token) safeSet(TOKEN_KEY, token);
  if (typeof username === "string" && username) safeSet(USERNAME_KEY, username);
  if (typeof assignedPage === "string" && assignedPage) safeSet(ASSIGNED_PAGE_KEY, assignedPage);
}

/**
 * Clears the whole auth session (logout).
 * @returns {void}
 */
export function clearSession() {
  safeRemove(TOKEN_KEY);
  safeRemove(USERNAME_KEY);
  safeRemove(ASSIGNED_PAGE_KEY);
}

/**
 * Checks whether a JWT is already expired (client-side clock).
 * Signature is NOT verified here — the server remains the authority.
 * @param {unknown} token JWT string.
 * @returns {boolean} True when missing, malformed, or past `exp`.
 */
export function isTokenExpired(token) {
  if (typeof token !== "string" || !token) return true;
  try {
    const [, payload] = token.split(".");
    const { exp } = JSON.parse(atob(payload));
    return typeof exp !== "number" || exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

/**
 * Whether a usable session exists: token present AND unexpired.
 * An expired token is treated as logged out (server would 401 it anyway).
 * @returns {boolean} True when logged in with a fresh token.
 */
export function isAuthenticated() {
  const token = getToken();
  return Boolean(token) && !isTokenExpired(token);
}

/**
 * Builds an Authorization header object from the stored token.
 * @returns {{ Authorization?: string }} Header to spread into requests.
 */
export function authHeaders() {
  const token = getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Alias kept for convenience. @returns {{ Authorization?: string }} */
export function getAuthHeader() {
  return authHeaders();
}

/**
 * Builds an Error enriched with HTTP status metadata.
 * @param {string} message User-facing Arabic message.
 * @param {number} [statusCode] HTTP status when available.
 * @param {unknown} [raw] Raw server payload for debugging.
 * @returns {Error & { statusCode?: number, raw?: unknown }}
 */
function createAuthError(message, statusCode, raw) {
  const error = /** @type {Error & { statusCode?: number, raw?: unknown }} */ (new Error(message));
  if (typeof statusCode === "number") error.statusCode = statusCode;
  if (raw !== undefined) error.raw = raw;
  return error;
}

/**
 * Maps backend/Mongoose English validation text to clear Arabic.
 * @param {string} serverError Raw `error` string from the API.
 * @param {"login"|"register"} mode Which endpoint was called.
 * @returns {string|null} Arabic message or null when no mapping matches.
 */
function mapValidationMessage(serverError, mode) {
  if (typeof serverError !== "string" || !serverError) return null;
  const text = serverError.toLowerCase();

  if (text.includes("username and password are required")) {
    return "يرجى إدخال اسم المستخدم وكلمة المرور.";
  }
  if (text.includes("username, password and assignedpage are required")) {
    return "يرجى إدخال اسم المستخدم وكلمة المرور وصفحة الخطة.";
  }
  if (text.includes("username already exists")) {
    return "اسم المستخدم موجود مسبقاً. اختر اسماً آخر.";
  }
  if (text.includes("invalid credentials")) {
    return "بيانات الدخول غير صحيحة. تحقق وحاول مجدداً.";
  }
  if (text.includes("username must be at least 3")) {
    return "اسم المستخدم 3 أحرف على الأقل.";
  }
  if (text.includes("password must be at least 6")) {
    return "كلمة المرور 6 أحرف على الأقل.";
  }
  if (text.includes("assignedpage must be a route")) {
    return "صفحة الخطة يجب أن تكون مثل /dashboard/user1.";
  }
  if (text.includes("username is required")) {
    return "اسم المستخدم مطلوب.";
  }
  if (text.includes("password is required")) {
    return "كلمة المرور مطلوبة.";
  }
  if (text.includes("assignedpage is required")) {
    return "صفحة الخطة مطلوبة.";
  }
  void mode;
  return null;
}

/**
 * Normalizes any axios/network failure into a clear Arabic Error.
 * @param {unknown} error Caught error.
 * @param {"login"|"register"} mode Which endpoint was called.
 * @returns {never} Always throws.
 */
function normalizeAuthError(error, mode) {
  const fallback = mode === "register" ? FALLBACK_REGISTER_MESSAGE : FALLBACK_LOGIN_MESSAGE;

  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status;
    const serverError = error.response?.data?.error;

    // No response at all: offline / server down / CORS.
    if (!error.response) {
      throw createAuthError(NETWORK_MESSAGE, undefined, error);
    }

    const mapped = mapValidationMessage(serverError, mode);
    if (mapped) {
      throw createAuthError(mapped, statusCode, error.response?.data);
    }

    if (statusCode === 400) {
      throw createAuthError(
        typeof serverError === "string" && serverError ? serverError : fallback,
        statusCode,
        error.response?.data,
      );
    }
    if (statusCode === 401) {
      throw createAuthError("بيانات الدخول غير صحيحة. تحقق وحاول مجدداً.", statusCode, error.response?.data);
    }
    if (statusCode === 409) {
      throw createAuthError("اسم المستخدم موجود مسبقاً. اختر اسماً آخر.", statusCode, error.response?.data);
    }
    if (typeof statusCode === "number" && statusCode >= 500) {
      throw createAuthError(SERVER_MESSAGE, statusCode, error.response?.data);
    }

    throw createAuthError(
      typeof serverError === "string" && serverError ? serverError : fallback,
      statusCode,
      error.response?.data,
    );
  }

  if (error instanceof Error && error.message) {
    throw createAuthError(error.message, undefined, error);
  }

  throw createAuthError(fallback, undefined, error);
}

/**
 * Handles a successful auth payload: validates, persists, returns session.
 * @param {unknown} payload Response body.
 * @param {"login"|"register"} mode Which endpoint was called.
 * @returns {{ token: string, username: string, assignedPage: string }} Persisted session.
 */
function handleAuthPayload(payload, mode) {
  const fallback = mode === "register" ? FALLBACK_REGISTER_MESSAGE : FALLBACK_LOGIN_MESSAGE;
  const data = /** @type {{ ok?: boolean, token?: unknown, username?: unknown, assignedPage?: unknown, error?: unknown }} */ (
    payload ?? {}
  );

  if (data?.ok !== true || typeof data.token !== "string" || !data.token) {
    const mapped = mapValidationMessage(typeof data?.error === "string" ? data.error : "", mode);
    throw createAuthError(mapped ?? fallback, undefined, payload);
  }

  const session = {
    token: data.token,
    username: typeof data.username === "string" ? data.username : "",
    assignedPage: typeof data.assignedPage === "string" ? data.assignedPage : "",
  };

  saveSession(session);
  return session;
}

/**
 * Logs in with username + password and persists the session.
 * @param {{ username: string, password: string }} credentials Credentials.
 * @returns {Promise<{ token: string, username: string, assignedPage: string }>} Session.
 */
export async function login(credentials) {
  const username = String(credentials?.username ?? "").trim();
  const password = String(credentials?.password ?? "");

  if (!username || !password) {
    throw createAuthError("يرجى إدخال اسم المستخدم وكلمة المرور.", 400);
  }

  try {
    const response = await axios.post(
      LOGIN_URL,
      { username, password },
      { headers: { "Content-Type": "application/json" } },
    );
    return handleAuthPayload(response.data, "login");
  } catch (error) {
    // handleAuthPayload errors are already normalized Arabic Errors.
    if (error instanceof Error && "raw" in error) throw error;
    return normalizeAuthError(error, "login");
  }
}

/**
 * Registers a new user and persists the session. assignedPage is derived
 * server-side as `/dashboard/<username>` — the client never sends it.
 * @param {{ username: string, password: string }} data Registration data.
 * @returns {Promise<{ token: string, username: string, assignedPage: string }>} Session.
 */
export async function register(data) {
  const username = String(data?.username ?? "").trim();
  const password = String(data?.password ?? "");

  if (!username || !password) {
    throw createAuthError("يرجى إدخال اسم المستخدم وكلمة المرور.", 400);
  }

  try {
    const response = await axios.post(
      REGISTER_URL,
      { username, password },
      { headers: { "Content-Type": "application/json" } },
    );
    return handleAuthPayload(response.data, "register");
  } catch (error) {
    if (error instanceof Error && "raw" in error) throw error;
    return normalizeAuthError(error, "register");
  }
}

export const authService = {
  login,
  register,
  getToken,
  getUsername,
  getAssignedPage,
  saveSession,
  clearSession,
  isAuthenticated,
  isTokenExpired,
  authHeaders,
  getAuthHeader,
};

export default authService;
