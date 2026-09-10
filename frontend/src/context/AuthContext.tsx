import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, UserRole } from '../types/index.js';
import { authApi, LoginPayload, RegisterPayload } from '../api/authApi.js';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (role: UserRole) => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('cm_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cm_access_token'));
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth on load
  const refreshUserProfile = useCallback(async () => {
    const accessToken = localStorage.getItem('cm_access_token');
    if (!accessToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authApi.getMe();
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('cm_user', JSON.stringify(res.data));
      }
    } catch {
      localStorage.removeItem('cm_access_token');
      localStorage.removeItem('cm_refresh_token');
      localStorage.removeItem('cm_user');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUserProfile();
  }, [refreshUserProfile]);

  const login = async (payload: LoginPayload) => {
    const res = await authApi.login(payload);
    if (res.data) {
      const { user: loggedInUser, accessToken, refreshToken } = res.data;
      localStorage.setItem('cm_access_token', accessToken);
      localStorage.setItem('cm_refresh_token', refreshToken);
      localStorage.setItem('cm_user', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      setToken(accessToken);
    }
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authApi.register(payload);
    if (res.data) {
      const { user: registeredUser, accessToken, refreshToken } = res.data;
      localStorage.setItem('cm_access_token', accessToken);
      localStorage.setItem('cm_refresh_token', refreshToken);
      localStorage.setItem('cm_user', JSON.stringify(registeredUser));
      setUser(registeredUser);
      setToken(accessToken);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue client cleanup even if backend logout fails
    } finally {
      localStorage.removeItem('cm_access_token');
      localStorage.removeItem('cm_refresh_token');
      localStorage.removeItem('cm_user');
      setUser(null);
      setToken(null);
    }
  };

  const switchDemoRole = async (role: UserRole) => {
    const isDemoEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true';
    if (!isDemoEnabled) {
      throw new Error('Demo 1-Click Role Switching is disabled in production environments.');
    }

    const demoCredentials: Record<UserRole, { email: string; pass: string }> = {
      SUPER_ADMIN: { email: 'superadmin@cricketmaster.io', pass: 'Password@123' },
      TOURNAMENT_ADMIN: { email: 'tournamentadmin@cricketmaster.io', pass: 'Password@123' },
      LEAGUE_ADMIN: { email: 'leagueadmin@cricketmaster.io', pass: 'Password@123' },
      SCORER: { email: 'scorer@cricketmaster.io', pass: 'Password@123' },
      TEAM_MANAGER: { email: 'manager@cricketmaster.io', pass: 'Password@123' },
      PLAYER: { email: 'player@cricketmaster.io', pass: 'Password@123' },
      VIEWER: { email: 'viewer@cricketmaster.io', pass: 'Password@123' },
    };

    const target = demoCredentials[role];
    if (target) {
      await login({ email: target.email, password: target.pass });
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        switchDemoRole,
        hasRole,
        hasAnyRole,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
