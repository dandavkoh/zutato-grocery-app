import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService, authStorage } from '../utils/authUtils';
import type { AuthUser } from '../utils/authUtils';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, userData: { firstName: string; lastName: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing authentication on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check if user is authenticated
        const isAuth = await authService.isAuthenticated();
        
        if (isAuth) {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            authStorage.setUser(currentUser);
          }
        } else {
          // Check local storage for cached user
          const cachedUser = authStorage.getUser();
          if (cachedUser) {
            setUser(cachedUser);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear any invalid cached data
        authStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authService.login(email, password);
      
      if (response.error) {
        return { success: false, error: response.error.message };
      }
      
      if (response.user) {
        setUser(response.user);
        authStorage.setUser(response.user);
        return { success: true };
      }
      
      return { success: false, error: 'Anmeldung fehlgeschlagen' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.' };
    }
  };

  const register = async (email: string, password: string, userData: { firstName: string; lastName: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authService.register(email, password, userData);
      
      if (response.error) {
        return { success: false, error: response.error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
      setUser(null);
      authStorage.clear();
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if server logout fails
      setUser(null);
      authStorage.clear();
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authService.resetPassword(email);
      
      if (response.error) {
        return { success: false, error: response.error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Fehler beim Senden der Passwort-Reset-E-Mail. Bitte versuchen Sie es erneut.' };
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 