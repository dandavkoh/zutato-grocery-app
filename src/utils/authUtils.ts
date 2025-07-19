// Authentication utility functions for Supabase compatibility

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResponse {
  user?: AuthUser;
  error?: AuthError;
}

// Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Mindestens 8 Zeichen');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Mindestens ein Großbuchstabe');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Mindestens ein Kleinbuchstabe');
  }
  if (!/\d/.test(password)) {
    errors.push('Mindestens eine Zahl');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Mindestens ein Sonderzeichen');
  }

  return { isValid: errors.length === 0, errors };
};

// Get password strength indicator
export const getPasswordStrength = (password: string): { strength: string; color: string; percentage: number } => {
  if (!password) return { strength: '', color: '', percentage: 0 };
  
  const validation = validatePassword(password);
  const validCount = 5 - validation.errors.length;
  const percentage = (validCount / 5) * 100;
  
  if (validCount <= 1) return { strength: 'Sehr schwach', color: 'text-red-500', percentage };
  if (validCount <= 2) return { strength: 'Schwach', color: 'text-orange-500', percentage };
  if (validCount <= 3) return { strength: 'Mittel', color: 'text-yellow-500', percentage };
  if (validCount <= 4) return { strength: 'Stark', color: 'text-blue-500', percentage };
  return { strength: 'Sehr stark', color: 'text-green-500', percentage };
};

// Name validation
export const validateName = (name: string): { isValid: boolean; error?: string } => {
  if (!name.trim()) {
    return { isValid: false, error: 'Name ist erforderlich' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name muss mindestens 2 Zeichen lang sein' };
  }
  if (name.trim().length > 50) {
    return { isValid: false, error: 'Name darf maximal 50 Zeichen lang sein' };
  }
  return { isValid: true };
};

// Form validation helpers
export const validateRegistrationForm = (formData: {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  // First name validation
  const firstNameValidation = validateName(formData.firstName);
  if (!firstNameValidation.isValid) {
    errors.firstName = firstNameValidation.error!;
  }

  // Last name validation
  const lastNameValidation = validateName(formData.lastName);
  if (!lastNameValidation.isValid) {
    errors.lastName = lastNameValidation.error!;
  }

  // Email validation
  if (!formData.email.trim()) {
    errors.email = 'E-Mail ist erforderlich';
  } else if (!validateEmail(formData.email)) {
    errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
  }

  // Password validation
  if (!formData.password) {
    errors.password = 'Passwort ist erforderlich';
  } else {
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors.join(', ');
    }
  }

  // Confirm password validation
  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Passwort-Bestätigung ist erforderlich';
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = 'Passwörter stimmen nicht überein';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateLoginForm = (formData: {
  email: string;
  password: string;
}): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {};

  // Email validation
  if (!formData.email.trim()) {
    errors.email = 'E-Mail ist erforderlich';
  } else if (!validateEmail(formData.email)) {
    errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
  }

  // Password validation
  if (!formData.password) {
    errors.password = 'Passwort ist erforderlich';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

// TODO: Supabase authentication functions (to be implemented)
export const authService = {
  // Register user
  async register(email: string, password: string, userData: { firstName: string; lastName: string }): Promise<AuthResponse> {
    // TODO: Replace with actual Supabase implementation
    // const { data, error } = await supabase.auth.signUp({
    //   email,
    //   password,
    //   options: {
    //     data: {
    //       first_name: userData.firstName,
    //       last_name: userData.lastName,
    //     }
    //   }
    // });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      user: {
        id: 'temp-id',
        email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        emailVerified: false,
        createdAt: new Date().toISOString(),
      }
    };
  },

  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    // TODO: Replace with actual Supabase implementation
    // const { data, error } = await supabase.auth.signInWithPassword({
    //   email,
    //   password,
    // });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      user: {
        id: 'temp-id',
        email,
        firstName: 'Max',
        lastName: 'Mustermann',
        emailVerified: true,
        createdAt: new Date().toISOString(),
      }
    };
  },

  // Reset password
  async resetPassword(email: string): Promise<AuthResponse> {
    // TODO: Replace with actual Supabase implementation
    // const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    //   redirectTo: `${window.location.origin}/reset-password`,
    // });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {};
  },

  // Logout user
  async logout(): Promise<void> {
    // TODO: Replace with actual Supabase implementation
    // const { error } = await supabase.auth.signOut();
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
  },

  // Get current user
  async getCurrentUser(): Promise<AuthUser | null> {
    // TODO: Replace with actual Supabase implementation
    // const { data: { user } } = await supabase.auth.getUser();
    // return user;
    
    return null;
  },

  // Check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  },
};

// Local storage helpers for authentication state
export const authStorage = {
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token);
  },

  getToken: (): string | null => {
    return localStorage.getItem('auth_token');
  },

  removeToken: () => {
    localStorage.removeItem('auth_token');
  },

  setUser: (user: AuthUser) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
  },

  getUser: (): AuthUser | null => {
    const userStr = localStorage.getItem('auth_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  removeUser: () => {
    localStorage.removeItem('auth_user');
  },

  clear: () => {
    authStorage.removeToken();
    authStorage.removeUser();
  },
}; 