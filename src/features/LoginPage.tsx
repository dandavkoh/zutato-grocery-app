import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { validateLoginForm, validateEmail } from '../utils/authUtils';
import { useAuth } from '../contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { login, resetPassword } = useAuth();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Get message from navigation state (e.g., from registration)
  const message = location.state?.message;

  // Set header when component mounts
  React.useEffect(() => {
    dispatch(setHeader({
      title: 'Anmeldung',
      showBack: true,
      background: 'bg-yellow-400',
    }));

    return () => {
      dispatch(setHeader({
        title: '',
        showBack: false,
        background: 'bg-yellow-400',
      }));
    };
  }, [dispatch]);

  // Form validation
  const validateForm = (): boolean => {
    const validation = validateLoginForm(formData);
    setErrors(validation.errors);
    return validation.isValid;
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);

      if (result.success) {
        // Redirect to the page they were trying to access, or to home
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        setErrors({ general: result.error || 'Anmeldung fehlgeschlagen' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ general: 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre E-Mail und Ihr Passwort.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim() || !validateEmail(formData.email)) {
      setErrors({ email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein, um Ihr Passwort zurückzusetzen.' });
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(formData.email);

      if (result.success) {
        setErrors({ general: 'Passwort-Reset-E-Mail wurde gesendet. Bitte überprüfen Sie Ihren Posteingang.' });
      } else {
        setErrors({ general: result.error || 'Fehler beim Senden der Passwort-Reset-E-Mail' });
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setErrors({ general: 'Fehler beim Senden der Passwort-Reset-E-Mail. Bitte versuchen Sie es erneut.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Content */}
      <div className="flex-1 px-4 pt-6 pb-10">
        {/* Success Message */}
        {message && (
          <div className="mb-6 p-4 bg-green-900/20 border border-green-500/30 rounded-xl">
            <div className="flex items-center">
              <FontAwesomeIcon icon="fa-check-circle" size="base" className="text-green-400 mr-2" />
              <p className="text-green-300 text-sm">{message}</p>
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
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              E-Mail-Adresse *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 bg-neutral-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors text-white placeholder-gray-400 ${
                errors.email ? 'border-red-500' : 'border-gray-600'
              }`}
              placeholder="max.mustermann@example.com"
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Passwort *
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
                autoComplete="current-password"
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
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-yellow-400 focus:ring-yellow-400 bg-neutral-900 border-gray-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-300">Angemeldet bleiben</span>
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isLoading}
              className="text-sm text-yellow-400 hover:text-yellow-300 font-medium transition-colors disabled:opacity-50"
            >
              Passwort vergessen?
            </button>
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
                Anmelden...
              </>
            ) : (
              'Anmelden'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-600"></div>
          <span className="px-4 text-sm text-gray-400">oder</span>
          <div className="flex-1 border-t border-gray-600"></div>
        </div>

        {/* Social Login Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            className="w-full flex items-center justify-center px-4 py-3 bg-neutral-900 border border-gray-600 rounded-xl text-gray-300 font-medium hover:bg-neutral-800 transition-colors"
          >
            <FontAwesomeIcon icon="fa-google" size="base" className="mr-3" />
            Mit Google anmelden
          </button>
          <button
            type="button"
            className="w-full flex items-center justify-center px-4 py-3 bg-neutral-900 border border-gray-600 rounded-xl text-gray-300 font-medium hover:bg-neutral-800 transition-colors"
          >
            <FontAwesomeIcon icon="fa-apple" size="base" className="mr-3" />
            Mit Apple anmelden
          </button>
        </div>

        {/* Register Link */}
        <div className="text-center mt-6">
          <p className="text-gray-400">
            Noch kein Konto?{' '}
            <Link 
              to="/register" 
              className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors"
            >
              Registrieren
            </Link>
          </p>
        </div>

        {/* Terms and Privacy */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Durch die Anmeldung stimmen Sie unseren{' '}
            <a href="#" className="text-yellow-400 hover:underline">Nutzungsbedingungen</a>{' '}
            und{' '}
            <a href="#" className="text-yellow-400 hover:underline">Datenschutzrichtlinien</a>{' '}
            zu.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 