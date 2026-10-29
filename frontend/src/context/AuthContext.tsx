import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: Role | null;
  isAdmin: boolean;
  isOperator: boolean;
  login: (username: string, password: string, allowedRoles?: Role[]) => Promise<User>;
  register: (username: string, email: string, password: string) => Promise<User>;
  logout: () => void;
  hasRole: (allowedRoles: Role | Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cnip_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('cnip_token'));
  const [isLoading, setIsLoading] = useState(() => Boolean(
    localStorage.getItem('cnip_token') && !localStorage.getItem('cnip_user'),
  ));

  useEffect(() => {
    if (token && !user) {
      setIsLoading(true);
      api.auth
        .me()
        .then((userData) => {
          setUser(userData);
          localStorage.setItem('cnip_user', JSON.stringify(userData));
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [token]);

  const login = async (username: string, password: string, allowedRoles?: Role[]): Promise<User> => {
    setIsLoading(true);
    try {
      const authRes = await api.auth.login({ username, password });
      if (allowedRoles && !allowedRoles.includes(authRes.user.role)) {
        throw new Error(allowedRoles.includes('CUSTOMER')
          ? 'Use customer sign-in for customer accounts.'
          : 'Customer accounts must use customer sign-in.');
      }
      setToken(authRes.token);
      setUser(authRes.user);
      localStorage.setItem('cnip_token', authRes.token);
      localStorage.setItem('cnip_user', JSON.stringify(authRes.user));
      return authRes.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const authRes = await api.auth.register({ username, email, password });
      setToken(authRes.token);
      setUser(authRes.user);
      localStorage.setItem('cnip_token', authRes.token);
      localStorage.setItem('cnip_user', JSON.stringify(authRes.user));
      return authRes.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('cnip_token');
    localStorage.removeItem('cnip_user');
    window.location.href = '/login';
  };

  const role = user?.role || user?.roleName || null;
  const isAdmin = role === 'ADMIN';
  const isOperator = role === 'OPERATOR' || isAdmin;

  const hasRole = (allowedRoles: Role | Role[]): boolean => {
    if (!role) return false;
    if (Array.isArray(allowedRoles)) {
      return allowedRoles.includes(role);
    }
    return role === allowedRoles;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        role,
        isAdmin,
        isOperator,
        login,
        register,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
