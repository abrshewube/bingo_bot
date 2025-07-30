import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';

interface User {
  id: string;
  telegramId: string;
  firstName: string;
  lastName: string;
  username: string;
  phoneNumber?: string;
  isRegistered: boolean;
  walletBalance: number;
  gamesPlayed: number;
  gamesWon: number;
  totalWinnings: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (telegramData: any) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if running in Telegram WebApp
        if (window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();
          
          if (tg.initDataUnsafe?.user) {
            const telegramUser = tg.initDataUnsafe.user;
            await login({
              telegramId: telegramUser.id.toString(),
              firstName: telegramUser.first_name,
              lastName: telegramUser.last_name || '',
              username: telegramUser.username || ''
            });
          }
        } else {
          // For development - use mock data
          await login({
            telegramId: '123456789',
            firstName: 'Test',
            lastName: 'User',
            username: 'testuser'
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (telegramData: any) => {
    try {
      const response = await authService.login(telegramData);
      setUser(response.user);
      setToken(response.token);
      localStorage.setItem('token', response.token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const value = {
    user,
    token,
    login,
    logout,
    updateUser,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};