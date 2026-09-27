import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithGoogleRedirect: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'rag_auth_token';
const USER_KEY = 'rag_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check if token arrived via OAuth redirect URL query parameter
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');

      if (urlToken) {
        localStorage.setItem(TOKEN_KEY, urlToken);
        setToken(urlToken);

        // Clean query parameters from URL without reloading
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
          const meRes = await api.getAuthMe();
          if (meRes.data) {
            setUser(meRes.data);
            localStorage.setItem(USER_KEY, JSON.stringify(meRes.data));
          }
        } catch (err) {
          console.error('Failed to fetch user profile with URL token:', err);
        }
        setIsLoading(false);
        return;
      }

      // 2. Check localStorage for existing session
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedToken && savedUser) {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const loginWithGoogle = async (credential: string) => {
    const res = await api.authGoogle(credential);
    if (res.data) {
      const { token: jwtToken, user: userProfile } = res.data;
      setToken(jwtToken);
      setUser(userProfile);
      localStorage.setItem(TOKEN_KEY, jwtToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userProfile));
    }
  };

  const loginWithGoogleRedirect = () => {
    // Redirect to backend passport Google OAuth endpoint
    const backendUrl = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/auth/google`
      : '/api/auth/google';
    window.location.href = backendUrl;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        loginWithGoogle,
        loginWithGoogleRedirect,
        logout,
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
