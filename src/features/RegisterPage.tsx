import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setHeader } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { 
  validateRegistrationForm, 
  getPasswordStrength, 
  validatePassword
} from '../utils/authUtils';
import { useAuth } from '../contexts/AuthContext';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { register } = useAuth();
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Set header when component mounts
  React.useEffect(() => {
    dispatch(setHeader({
      title: 'Registrierung',
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
    const validation = validateRegistrationForm(formData);
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(
        formData.email,
        formData.password,
        {
          firstName: formData.firstName,
          lastName: formData.lastName,
        }
      );

      if (result.success) {
        navigate('/login', { 
          state: { 
            message: 'Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse.' 
          } 
        });
      } else {
        setErrors({ email: result.error || 'Registrierung fehlgeschlagen' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ email: 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.' });
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Content */}
      <div className="flex-1 px-4 pt-6 pb-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                Vorname *
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-neutral-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors text-white placeholder-gray-400 ${
                  errors.firstName ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Max"
              />
              {errors.firstName && (
                <p className="text-red-400 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                Nachname *
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-neutral-900 border rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-colors text-white placeholder-gray-400 ${
                  errors.lastName ? 'border-red-500' : 'border-gray-600'
                }`}
                placeholder="Mustermann"
              />
              {errors.lastName && (
                <p className="text-red-400 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

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
            {formData.password && (
              <div className="mt-2">
                <p className={`text-sm font-medium ${passwordStrength.color === 'text-green-500' ? 'text-green-400' : passwordStrength.color === 'text-yellow-500' ? 'text-yellow-400' : 'text-red-400'}`}>
                  Stärke: {passwordStrength.strength}
                </p>
                <div className="mt-1 flex space-x-1">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const validation = validatePassword(formData.password);
                    const validCount = 5 - validation.errors.length;
                    const isActive = level <= validCount;
                    return (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          isActive ? 'bg-green-400' : 'bg-gray-600'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
            {errors.password && (
              <p className="text-red-400 text-sm mt-1">{errors.password}</p>
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
                Registriere...
              </>
            ) : (
              'Konto erstellen'
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-gray-400">
            Bereits ein Konto?{' '}
            <Link 
              to="/login" 
              className="text-yellow-400 hover:text-yellow-300 font-semibold transition-colors"
            >
              Anmelden
            </Link>
          </p>
        </div>

        {/* Terms and Privacy */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Durch die Registrierung stimmen Sie unseren{' '}
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

export default RegisterPage; 