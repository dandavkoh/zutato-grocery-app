import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader, resetHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { validatePassword, getPasswordStrength } from '../utils/authUtils';
import { useAuth } from '../contexts/AuthContext';

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
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { resetPassword } = useAuth();
  
  const [formData, setFormData] = useState<ResetPasswordFormData>({
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Get token from URL hash fragment (Supabase sends this in the reset link)
  const [token, setToken] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);

  useEffect(() => {
    // Parse hash fragment from URL
    const hash = window.location.hash.substring(1); // Remove the #
    const params = new URLSearchParams(hash);
    const tokenParam = params.get('token');
    const typeParam = params.get('type');
    
    setToken(tokenParam);
    setType(typeParam);
  }, []);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Passwort zurücksetzen',
      showBack: true,
      background: 'bg-yellow-400',
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

    if (!token || type !== 'recovery') {
      setErrors({ general: 'Ungültiger oder abgelaufener Reset-Link. Bitte fordern Sie einen neuen an.' });
      return;
    }

    setIsLoading(true);

    try {
      // Use Supabase's updateUser with the recovery token to set the new password
      const { supabase } = await import('../config/supabase');
      
      // Update the password using the recovery token
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
      setErrors({ 
        general: error instanceof Error ? error.message : 'Fehler beim Zurücksetzen des Passworts. Bitte versuchen Sie es erneut.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // If no token or wrong type, show error
  if (!token || type !== 'recovery') {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <div className="flex-1 px-4 pt-6 pb-10">
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
            <div className="flex items-center">
              <FontAwesomeIcon icon="fa-exclamation-circle" size="base" className="text-red-400 mr-2" />
              <p className="text-red-300 text-sm">
                Ungültiger oder abgelaufener Reset-Link. Bitte fordern Sie einen neuen an.
              </p>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-yellow-400 text-black font-semibold py-3 rounded-xl hover:bg-yellow-300 transition-all duration-200"
          >
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="flex-1 px-4 pt-6 pb-10">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
            <div className="flex items-center">
              <FontAwesomeIcon icon="fa-check-circle" size="base" className="text-green-400 mr-2" />
              <p className="text-green-300 text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {/* General Error Message */}
        {errors.general && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
            <div className="flex items-center">
              <FontAwesomeIcon icon="fa-exclamation-circle" size="base" className="text-red-400 mr-2" />
              <p className="text-red-300 text-sm">{errors.general}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Neues Passwort *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 pr-12 bg-neutral-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors text-white placeholder-gray-400 ${
                  errors.password ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                <FontAwesomeIcon 
                  icon={showPassword ? 'fa-eye-slash' : 'fa-eye'} 
                  size="base" 
                  style="regular"
                />
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password}</p>
            )}
            {formData.password && (
              <div className="mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
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
                  <span className={`text-xs ${passwordStrength.color}`}>
                    {passwordStrength.strength}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
              Passwort bestätigen *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 pr-12 bg-neutral-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors text-white placeholder-gray-400 ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                <FontAwesomeIcon 
                  icon={showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} 
                  size="base" 
                  style="regular"
                />
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-yellow-400 text-black font-semibold py-3 rounded-xl hover:bg-yellow-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

        {/* Back to Login */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/login')}
            className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors"
          >
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage; 