import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { validatePassword, getPasswordStrength } from '../utils/authUtils';
import { supabase } from '../config/supabase';
import { sentryErrorService } from '../services/sentryErrorService';

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

interface ValidationErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    // Check if we're in password recovery mode
    const checkRecoveryMode = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If we have a session and it's a recovery session, show the form
      if (session) {
        setIsRecoveryMode(true);
      } else {
        // No session means invalid or expired recovery link
        setErrors({ general: 'Ungültiger oder abgelaufener Reset-Link. Bitte fordern Sie einen neuen an.' });
      }
    };

    checkRecoveryMode();
  }, []);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Passwort zurücksetzen',
      showBack: true,
      background: '',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Neues Passwort ist erforderlich';
    } else {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors.join(', ');
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwort-Bestätigung ist erforderlich';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwörter stimmen nicht überein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }

    // Clear general error when user starts typing
    if (errors.general) {
      setErrors(prev => ({
        ...prev,
        general: undefined
      }));
    }

    // Clear success message when user makes changes
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!isRecoveryMode) {
      setErrors({ general: 'Ungültiger oder abgelaufener Reset-Link. Bitte fordern Sie einen neuen an.' });
      return;
    }

    setIsLoading(true);

    try {
      // Update the password - Supabase handles the recovery token automatically
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccessMessage('Passwort erfolgreich zurückgesetzt! Sie werden zur Anmeldung weitergeleitet...');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Passwort erfolgreich zurückgesetzt! Sie können sich jetzt anmelden.' }
        });
      }, 3000);

    } catch (error) {
      console.error('Password reset error:', error);
      sentryErrorService.reportApiError(error, {
        url: 'reset-password-page',
        method: 'POST',
      });
      setErrors({ 
        general: error instanceof Error ? error.message : 'Fehler beim Zurücksetzen des Passworts. Bitte versuchen Sie es erneut.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // If not in recovery mode, show error
  if (!isRecoveryMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <FontAwesomeIcon icon="fa-exclamation-circle" size="base" className="text-red-600 mr-2" />
              <p className="text-red-700 text-sm">
                Ungültiger oder abgelaufener Reset-Link. Bitte fordern Sie einen neuen an.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-all duration-200"
          >
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <FontAwesomeIcon icon="fa-check-circle" size="base" className="text-green-600 mr-2" />
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <FontAwesomeIcon icon="fa-exclamation-circle" size="base" className="text-red-600 mr-2" />
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">Passwort zurücksetzen</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Neues Passwort *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 bg-gray-50 border ${errors.password ? 'border-red-500' : 'border-gray-400'} rounded-lg text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <FontAwesomeIcon 
                    icon={showPassword ? 'fa-eye-slash' : 'fa-eye'} 
                    size="base" 
                    style="regular"
                  />
                </button>
              </div>
              {errors.password && (
                <p className="text-red-600 text-sm mt-1">{errors.password}</p>
              )}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          passwordStrength.percentage <= 20 ? 'bg-red-500' :
                          passwordStrength.percentage <= 40 ? 'bg-orange-500' :
                          passwordStrength.percentage <= 60 ? 'bg-yellow-500' :
                          passwordStrength.percentage <= 80 ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${passwordStrength.percentage}%` }}
                      />
                    </div>
                    <span className={`text-xs ${passwordStrength.color.replace('text-yellow-500', 'text-orange-600')}`}>
                      {passwordStrength.strength}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Passwort bestätigen *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 pr-12 bg-gray-50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-400'} rounded-lg text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <FontAwesomeIcon 
                    icon={showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} 
                    size="base" 
                    style="regular"
                  />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <FontAwesomeIcon icon="fa-spinner" size="base" className="animate-spin mr-2" />
                  Passwort zurücksetzen...
                </>
              ) : (
                'Passwort zurücksetzen'
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => navigate('/login')}
              className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
            >
              Zurück zur Anmeldung
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage; 