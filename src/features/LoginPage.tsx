import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { validateLoginForm, validateEmail } from '../utils/authUtils';
import { useAuth } from '../contexts/AuthContext';
import { sentryErrorService } from '../services/sentryErrorService';
import { useToast } from '../contexts/ToastContext';

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
  const { showToast } = useToast();
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Show message from navigation state (e.g., from ProtectedRoute offline redirect)
  useEffect(() => {
    const navState = location.state as { message?: string } | null;
    if (navState?.message) {
      showToast(navState.message, { type: 'info' });
      // Clear message so it doesn't persist on future navigations
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setErrors({ general: 'Keine Internetverbindung. Bitte stelle eine Verbindung her und versuche es erneut.' });
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
      sentryErrorService.reportApiError(error, {
        url: 'login-page',
        method: 'POST',
      });
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

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setErrors({ general: 'Keine Internetverbindung. Passwort-Reset erfordert eine Internetverbindung.' });
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
      sentryErrorService.reportApiError(error, {
        url: 'login-page-reset',
        method: 'POST',
      });
      setErrors({ general: 'Fehler beim Senden der Passwort-Reset-E-Mail. Bitte versuchen Sie es erneut.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <FontAwesomeIcon icon="fa-exclamation-circle" size="base" className="text-red-600 mr-2" />
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-md p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">Anmelden</h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-Mail-Adresse *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-gray-50 border ${errors.email ? 'border-red-500' : 'border-gray-400'} rounded-lg text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                placeholder="max.mustermann@example.com"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-600 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Passwort *
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
                  autoComplete="current-password"
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
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 bg-white border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Angemeldet bleiben</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isLoading}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors disabled:opacity-50"
              >
                Passwort vergessen?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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

          <div className="text-center mt-6">
            <p className="text-gray-700">
              Noch kein Konto?{' '}
              <Link 
                to="/register" 
                className="text-orange-600 hover:text-orange-700 font-semibold transition-colors"
              >
                Registrieren
              </Link>
            </p>
          </div>

          <div className="text-center mt-4">
            <p className="text-xs text-gray-500">
              Durch die Anmeldung stimmen Sie unseren{' '}
              <Link to="/terms" className="text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline">Nutzungsbedingungen</Link>{' '}
              und{' '}
              <Link to="/privacy" className="text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline">Datenschutzrichtlinien</Link>{' '}
              zu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage; 