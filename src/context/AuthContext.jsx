import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import apiClient from "../services/apiClient.js";
import {
  clearSession,
  getAssignedPage,
  getRole,
  getToken,
  getUsername,
  isTokenExpired,
  login as serviceLogin,
  register as serviceRegister,
  saveSession,
} from "../services/authService.js";

/**
 * Auth state restored from localStorage on mount.
 * @typedef {Object} AuthState
 * @property {(string|null)} token Stored JWT.
 * @property {(string|null)} username Stored username.
 * @property {(string|null)} assignedPage User's own diet-plan route.
 * @property {(string|null)} role User role ("user" | "admin").
 * @property {boolean} isAuthenticated Whether a token is present.
 */

/**
 * Context value exposed to login forms and route guards.
 * @typedef {Object} AuthContextValue
 * @property {(string|null)} token Stored JWT.
 * @property {(string|null)} username Stored username.
 * @property {(string|null)} assignedPage User's own diet-plan route.
 * @property {string} role User role ("user" | "admin", defaults to "user").
 * @property {boolean} isAdmin True when the user has the admin role.
 * @property {boolean} isAuthenticated Whether a token is present.
 * @property {boolean} isAuthLoading True while login/register is in flight.
 * @property {(string|null)} authError Last Arabic auth error message.
 * @property {(credentials: { username: string, password: string }) => Promise<{ token: string, username: string, assignedPage: string }>} login Logs in and syncs state.
 * @property {(data: { username: string, password: string }) => Promise<{ token: string, username: string, assignedPage: string }>} register Registers and syncs state.
 * @property {() => void} logout Clears the session and resets state.
 * @property {() => void} clearAuthError Clears the last auth error.
 */

/**
 * Reads the persisted session synchronously for lazy useState init.
 * Expired tokens are purged on the spot so a stale session never counts
 * as authenticated (server would 401 it on first use anyway).
 * @returns {AuthState} Initial auth state.
 */
function loadInitialAuthState() {
  const token = getToken();
  if (token && isTokenExpired(token)) {
    clearSession();
    return { token: null, username: null, assignedPage: null, role: null, isAuthenticated: false };
  }
  return {
    token,
    username: getUsername(),
    assignedPage: getAssignedPage(),
    role: getRole() ?? "user",
    isAuthenticated: Boolean(token),
  };
}

/** @type {import("react").Context<AuthContextValue | undefined>} */
const AuthContext = createContext(undefined);

/**
 * Provides auth session state and actions to the whole app.
 * @param {{ children: import("react").ReactNode }} props Provider props.
 * @returns {JSX.Element} Context provider wrapper.
 */
export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(loadInitialAuthState);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Latest state for the one-shot /me reconciliation below, so the response
  // is compared against current values (not the mount-time closure) when a
  // login/logout happens while the request is in flight.
  const authStateRef = useRef(authState);
  authStateRef.current = authState;

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setAuthState({
      token: null,
      username: null,
      assignedPage: null,
      role: null,
      isAuthenticated: false,
    });
    setAuthError(null);
  }, []);

  // Silent session validation on mount: a stored token can be revoked
  // server-side (user deleted) while still unexpired. A 401 from /me means
  // the session is dead — drop it quietly. Network failures are ignored so
  // offline users keep their local session.
  // A 200 also reconciles username/assignedPage/role (e.g. a promotion to
  // admin applies without forcing re-login). Identity, storage, and state
  // update together in one place: saveSession is the single localStorage
  // write path, followed by a single setAuthState.
  useEffect(() => {
    if (!authState.isAuthenticated) return;
    let cancelled = false;
    apiClient
      .get("/api/auth/me")
      .then((response) => {
        if (cancelled) return;
        const prev = authStateRef.current;
        const username = response.data?.username;
        const assignedPage = response.data?.assignedPage;
        const role = response.data?.role;
        const next = {
          ...prev,
          username: typeof username === "string" && username ? username : prev.username,
          assignedPage:
            typeof assignedPage === "string" && assignedPage ? assignedPage : prev.assignedPage,
          role: typeof role === "string" && role ? role : prev.role,
        };
        const changed =
          next.username !== prev.username ||
          next.assignedPage !== prev.assignedPage ||
          next.role !== prev.role;
        if (!changed) return;
        saveSession({
          token: next.token,
          username: next.username,
          assignedPage: next.assignedPage,
          role: next.role,
        });
        setAuthState(next);
      })
      .catch((error) => {
        if (cancelled) return;
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          logout();
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Logs in and syncs context state with the persisted session.
   * @param {{ username: string, password: string }} credentials Credentials.
   * @returns {Promise<{ token: string, username: string, assignedPage: string, role: string }>} Session.
   */
  const login = useCallback(async (credentials) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const session = await serviceLogin(credentials);
      setAuthState({
        token: session.token,
        username: session.username,
        assignedPage: session.assignedPage,
        role: session.role ?? "user",
        isAuthenticated: true,
      });
      return session;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  /**
   * Registers a new user and syncs context state with the persisted session.
   * @param {{ username: string, password: string }} data Registration data.
   * @returns {Promise<{ token: string, username: string, assignedPage: string, role: string }>} Session.
   */
  const register = useCallback(async (data) => {
    setIsAuthLoading(true);
    setAuthError(null);
    try {
      const session = await serviceRegister(data);
      setAuthState({
        token: session.token,
        username: session.username,
        assignedPage: session.assignedPage,
        role: session.role ?? "user",
        isAuthenticated: true,
      });
      return session;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      token: authState.token,
      username: authState.username,
      assignedPage: authState.assignedPage,
      role: authState.role ?? "user",
      isAdmin: authState.role === "admin",
      isAuthenticated: authState.isAuthenticated,
      isAuthLoading,
      authError,
      login,
      register,
      logout,
      clearAuthError,
    }),
    [authState, isAuthLoading, authError, login, register, logout, clearAuthError],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

/**
 * Reads auth context and enforces provider usage.
 * @returns {AuthContextValue} Auth context value.
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}

export default useAuth;
