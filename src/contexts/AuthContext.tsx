import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService, authStorage } from '../utils/authUtils';
import type { AuthUser } from '../api/supabaseApi';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, userData: { firstName: string; lastName: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (userData: { firstName: string; lastName: string; email: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
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
        // Get current user from Supabase
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          authStorage.setUser(currentUser);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        // Clear any invalid cached data
        authStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((user) => {
      setUser(user);
      if (user) {
        authStorage.setUser(user);
      } else {
        authStorage.clear();
      }
    });

    initializeAuth();

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await authService.login(email, password);
      
      if (response.error) {
        const errorMsg = typeof response.error === 'object' && response.error !== null && 'message' in response.error
          ? (response.error as any).message
          : String(response.error);
        return { success: false, error: errorMsg };
      }
      
      if (response.user) {
        // Map auf AuthUser falls nötig
        const user = response.user;
        const authUser = {
          id: user.id,
          email: user.email || '',
          firstName: user.user_metadata?.first_name,
          lastName: user.user_metadata?.last_name,
          emailVerified: user.email_confirmed_at !== null,
          created_at: user.created_at,
          updatedAt: user.updated_at,
        };
        setUser(authUser);
        authStorage.setUser(authUser);
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
        const errorMsg = typeof response.error === 'object' && response.error !== null && 'message' in response.error
          ? (response.error as any).message
          : String(response.error);
        return { success: false, error: errorMsg };
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
        const errorMsg = typeof response.error === 'object' && response.error !== null && 'message' in response.error
          ? (response.error as any).message
          : String(response.error);
        return { success: false, error: errorMsg };
      }
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Fehler beim Senden der Passwort-Reset-E-Mail. Bitte versuchen Sie es erneut.' };
    }
  };

  const updateProfile = async (userData: { firstName: string; lastName: string; email: string }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const response = await authService.updateProfile(userData);
      
      if (response.error) {
        const errorMsg = typeof response.error === 'object' && response.error !== null && 'message' in response.error
          ? (response.error as any).message
          : String(response.error);
        return { success: false, error: errorMsg };
      }
      
      if (response.user) {
        // Update local user state
        const updatedUser = {
          ...user!,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
        };
        setUser(updatedUser);
        authStorage.setUser(updatedUser);
        return { success: true, message: response.message };
      }
      
      return { success: false, error: 'Profil-Update fehlgeschlagen' };
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Profil-Update fehlgeschlagen. Bitte versuchen Sie es erneut.' };
    }
  };

  const updatePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const response = await authService.updatePassword(currentPassword, newPassword);
      
      if (response.error) {
        const errorMsg = typeof response.error === 'object' && response.error !== null && 'message' in response.error
          ? (response.error as any).message
          : String(response.error);
        return { success: false, error: errorMsg };
      }
      
      return { success: true, message: response.message };
    } catch (error) {
      console.error('Update password error:', error);
      return { success: false, error: 'Passwort-Update fehlgeschlagen. Bitte versuchen Sie es erneut.' };
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
    updateProfile,
    updatePassword,
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