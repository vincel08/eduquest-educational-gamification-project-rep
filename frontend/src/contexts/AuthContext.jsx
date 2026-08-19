import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService';
import { getErrorMessage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('eduquest_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('eduquest_token'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('eduquest_token')));

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await authService.me();
        setUser(response.data.data.user);
        setProfile(response.data.data.profile);
        localStorage.setItem('eduquest_user', JSON.stringify(response.data.data.user));
      } catch {
        localStorage.removeItem('eduquest_token');
        localStorage.removeItem('eduquest_user');
        setToken(null);
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [token]);

  const applyAuth = useCallback(({ token: nextToken, user: nextUser, profile: nextProfile }) => {
    localStorage.setItem('eduquest_token', nextToken);
    localStorage.setItem('eduquest_user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
    setProfile(nextProfile);
    return nextUser;
  }, []);

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

  const logout = useCallback(() => {
    localStorage.removeItem('eduquest_token');
    localStorage.removeItem('eduquest_user');
    setToken(null);
    setUser(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback((nextProfile, nextUser = null) => {
    setProfile(nextProfile);
    if (nextUser) {
      setUser(nextUser);
      localStorage.setItem('eduquest_user', JSON.stringify(nextUser));
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      token,
      loading,
      login,
      register,
      logout,
      updateProfile,
      getErrorMessage,
      isAuthenticated: Boolean(user && token),
    }),
    [user, profile, token, loading, login, register, logout, updateProfile]
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
