import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  clearSession,
  getAssignedPage,
  getToken,
  getUsername,
  login as serviceLogin,
  register as serviceRegister,
} from "../services/authService.js";

/**
 * Auth state restored from localStorage on mount.
 * @typedef {Object} AuthState
 * @property {(string|null)} token Stored JWT.
 * @property {(string|null)} username Stored username.
 * @property {(string|null)} assignedPage User's own diet-plan route.
 * @property {boolean} isAuthenticated Whether a token is present.
 */

/**
 * Context value exposed to login forms and route guards.
 * @typedef {Object} AuthContextValue
 * @property {(string|null)} token Stored JWT.
 * @property {(string|null)} username Stored username.
 * @property {(string|null)} assignedPage User's own diet-plan route.
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
 * @returns {AuthState} Initial auth state.
 */
function loadInitialAuthState() {
  const token = getToken();
  return {
    token,
    username: getUsername(),
    assignedPage: getAssignedPage(),
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

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  /**
   * Logs in and syncs context state with the persisted session.
   * @param {{ username: string, password: string }} credentials Credentials.
   * @returns {Promise<{ token: string, username: string, assignedPage: string }>} Session.
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
   * @returns {Promise<{ token: string, username: string, assignedPage: string }>} Session.
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
   * Clears the session and resets state (logout).
   * @returns {void}
   */
  const logout = useCallback(() => {
    clearSession();
    setAuthState({
      token: null,
      username: null,
      assignedPage: null,
      isAuthenticated: false,
    });
    setAuthError(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      token: authState.token,
      username: authState.username,
      assignedPage: authState.assignedPage,
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
