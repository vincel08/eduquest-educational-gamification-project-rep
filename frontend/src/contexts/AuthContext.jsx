import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import authService from '../services/authService';
import {
  clearAuthStorage,
  getErrorMessage,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredSessionMeta,
  persistAuthSession,
} from '../services/api';

const AuthContext = createContext(null);
const DEFAULT_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const IDLE_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('eduwow_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(() => getStoredAccessToken());
  const [session, setSession] = useState(() => getStoredSessionMeta());
  const [loading, setLoading] = useState(Boolean(getStoredAccessToken() || getStoredRefreshToken()));
  const logoutRef = useRef(null);

  const applyAuth = useCallback(({
    token: nextToken,
    refreshToken,
    user: nextUser,
    profile: nextProfile,
    session: nextSession,
  }) => {
    persistAuthSession({
      token: nextToken,
      refreshToken,
      user: nextUser,
      session: nextSession,
    });
    setToken(nextToken);
    setUser(nextUser);
    setProfile(nextProfile ?? null);
    if (nextSession) setSession(nextSession);
    return nextUser;
  }, []);

  const clearClientAuth = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    clearClientAuth();
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Client already cleared; ignore revoke failures.
      }
    }
  }, [clearClientAuth]);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  useEffect(() => {
    async function bootstrap() {
      const accessToken = getStoredAccessToken();
      const refreshToken = getStoredRefreshToken();

      if (!accessToken && !refreshToken) {
        setLoading(false);
        return;
      }

      try {
        if (!accessToken && refreshToken) {
          const refreshed = await authService.refresh(refreshToken);
          applyAuth(refreshed.data.data);
        }
        const response = await authService.me();
        setUser(response.data.data.user);
        setProfile(response.data.data.profile);
        if (response.data.data.session) {
          setSession(response.data.data.session);
          localStorage.setItem('eduwow_session', JSON.stringify(response.data.data.session));
        }
        localStorage.setItem('eduwow_user', JSON.stringify(response.data.data.user));
        setToken(getStoredAccessToken());
      } catch {
        clearClientAuth();
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [applyAuth, clearClientAuth]);

  // Idle session timeout (default 10 minutes of no activity).
  useEffect(() => {
    if (!token && !getStoredRefreshToken()) return undefined;

    const idleMs = Number(session?.idleTimeoutMs) || DEFAULT_IDLE_TIMEOUT_MS;
    let timerId = null;

    const resetIdleTimer = () => {
      window.clearTimeout(timerId);
      timerId = window.setTimeout(() => {
        logoutRef.current?.();
      }, idleMs);
    };

    IDLE_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });
    document.addEventListener('visibilitychange', resetIdleTimer);
    resetIdleTimer();

    return () => {
      window.clearTimeout(timerId);
      IDLE_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
      document.removeEventListener('visibilitychange', resetIdleTimer);
    };
  }, [token, session?.idleTimeoutMs]);

  const login = useCallback(async (credentials) => {
    const response = await authService.login(credentials);
    return applyAuth(response.data.data);
  }, [applyAuth]);

  const register = useCallback(async (payload) => {
    const response = await authService.register(payload);
    const data = response.data.data;
    applyAuth(data);
    return data;
  }, [applyAuth]);

  const updateProfile = useCallback((nextProfile, nextUser = null) => {
    setProfile(nextProfile);
    if (nextUser) {
      setUser(nextUser);
      localStorage.setItem('eduwow_user', JSON.stringify(nextUser));
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      token,
      session,
      loading,
      login,
      register,
      logout,
      updateProfile,
      getErrorMessage,
      isAuthenticated: Boolean(user && (token || getStoredRefreshToken())),
    }),
    [user, profile, token, session, loading, login, register, logout, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
