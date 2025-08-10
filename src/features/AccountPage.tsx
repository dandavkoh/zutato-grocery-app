import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setHeader, resetHeader, resetBackClick } from '../stores/store';
import type { RootState } from '../stores/store';
import FontAwesomeIcon from '../components/FontAwesomeIcon';
import { useAuth } from '../contexts/AuthContext';
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  getPasswordStrength 
} from '../utils/authUtils';

interface AccountFormData {
  firstName: string;
  lastName: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user, updateProfile, updatePassword, logout } = useAuth();
  
  // Local state
  const [formData, setFormData] = useState<AccountFormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Watch for back button events
  const backClicked = useSelector((state: RootState) => state.events.backClicked);

  useEffect(() => {
    dispatch(setHeader({
      title: 'Account verwalten',
      showBack: true,
      background: '',
    }));
    return () => { dispatch(resetHeader()); };
  }, [dispatch]);

  // Handle back button events
  useEffect(() => {
    if (backClicked) {
      navigate('/lists');
      dispatch(resetBackClick());
    }
  }, [backClicked, navigate, dispatch]);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  // Form validation
  const validateProfileForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // First name validation
    const firstNameValidation = validateName(formData.firstName);
    if (!firstNameValidation.isValid) {
      newErrors.firstName = firstNameValidation.error!;
    }

    // Last name validation
    const lastNameValidation = validateName(formData.lastName);
    if (!lastNameValidation.isValid) {
      newErrors.lastName = lastNameValidation.error!;
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePasswordForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Current password validation - must be at least 1 character
    if (!formData.currentPassword.trim()) {
      newErrors.currentPassword = 'Aktuelles Passwort ist erforderlich';
    }

    // New password validation
    if (!formData.newPassword) {
      newErrors.newPassword = 'Neues Passwort ist erforderlich';
    } else {
      const passwordValidation = validatePassword(formData.newPassword);
      if (!passwordValidation.isValid) {
        newErrors.newPassword = passwordValidation.errors.join(', ');
      }
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwort-Bestätigung ist erforderlich';
    } else if (formData.newPassword !== formData.confirmPassword) {
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

    // Clear success message when user makes changes
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleSaveProfile = async () => {
    if (!validateProfileForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
      });

      if (result.success) {
        setSuccessMessage(result.message || 'Profil erfolgreich aktualisiert!');
      } else {
        setErrors({ email: result.error || 'Fehler beim Aktualisieren des Profils' });
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setErrors({ email: 'Fehler beim Aktualisieren des Profils' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await updatePassword(formData.currentPassword, formData.newPassword);

      if (result.success) {
        setSuccessMessage('Passwort erfolgreich geändert!');
        // Clear password fields
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        }));
      } else {
        setErrors({ currentPassword: result.error || 'Fehler beim Ändern des Passworts' });
      }
    } catch (error) {
      console.error('Password change error:', error);
      setErrors({ currentPassword: 'Fehler beim Ändern des Passworts' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Möchten Sie sich wirklich abmelden?')) {
      setLoading(true);
      try {
        await logout();
        navigate('/login');
      } catch (error) {
        console.error('Logout error:', error);
        setErrors({ email: 'Fehler beim Abmelden' });
      } finally {
        setLoading(false);
      }
    }
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-green-700 text-sm">{successMessage}</div>
          </div>
        )}

        {/* Profile Section */}
        <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
          <label className="block text-gray-900 text-sm font-semibold mb-4">
            Profilinformationen
          </label>
          
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <FontAwesomeIcon icon="fa-user" size="base" style="regular"/>
                </div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full bg-gray-50 border ${errors.firstName ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                  placeholder="Vorname"
                />
              </div>
              {errors.firstName && (
                <p className="text-red-600 text-sm mt-1">{errors.firstName}</p>
              )}
            </div>

            <div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <FontAwesomeIcon icon="fa-user" size="base" style="regular"/>
                </div>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full bg-gray-50 border ${errors.lastName ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                  placeholder="Nachname"
                />
              </div>
              {errors.lastName && (
                <p className="text-red-600 text-sm mt-1">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email Field */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <FontAwesomeIcon icon="fa-envelope" size="base" style="regular"/>
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full bg-gray-50 border ${errors.email ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                placeholder="E-Mail-Adresse"
              />
            </div>
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Speichere...' : 'Profil speichern'}
          </button>
        </div>

        {/* Password Section */}
        <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
          <label className="block text-gray-900 text-sm font-semibold mb-4">
            Passwort ändern
          </label>
          
          {/* Current Password */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <FontAwesomeIcon icon="fa-lock" size="base" style="regular"/>
              </div>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleInputChange}
                className={`w-full bg-gray-50 border ${errors.currentPassword ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-12 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                placeholder="Aktuelles Passwort"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={showCurrentPassword ? "fa-eye-slash" : "fa-eye"} size="base" style="regular"/>
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-red-600 text-sm mt-1">{errors.currentPassword}</p>
            )}
          </div>

          {/* New Password */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <FontAwesomeIcon icon="fa-lock" size="base" style="regular"/>
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className={`w-full bg-gray-50 border ${errors.newPassword ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-12 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                placeholder="Neues Passwort"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={showNewPassword ? "fa-eye-slash" : "fa-eye"} size="base" style="regular"/>
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-red-600 text-sm mt-1">{errors.newPassword}</p>
            )}
            {formData.newPassword && (
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
                  <span className={`text-xs ${passwordStrength.color.replace('text-', 'text-')}`}>
                    {passwordStrength.strength}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <FontAwesomeIcon icon="fa-lock" size="base" style="regular"/>
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full bg-gray-50 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-400'} rounded-lg pl-10 pr-12 py-3 text-gray-900 placeholder-gray-500 hover:border-gray-500 focus:outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-500/40`}
                placeholder="Passwort bestätigen"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <FontAwesomeIcon icon={showConfirmPassword ? "fa-eye-slash" : "fa-eye"} size="base" style="regular"/>
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            onClick={handleChangePassword}
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Ändere...' : 'Passwort ändern'}
          </button>
        </div>

        {/* Logout Section */}
        <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6">
          <label className="block text-gray-900 text-sm font-semibold mb-4">
            Account
          </label>
          
          <button
            onClick={handleLogout}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Melde ab...' : 'Abmelden'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountPage; 