// Environment Configuration für Development und Production
export interface EnvironmentConfig {
  // Supabase Configuration
  supabaseUrl: string;
  supabaseAnonKey: string;
  
  // Site Configuration
  siteUrl: string;
  
  // API Configuration
  apiTimeout: number;
  
  // PWA Configuration
  pwaName: string;
  pwaShortName: string;
  pwaDescription: string;
  pwaThemeColor: string;
  pwaBackgroundColor: string;
  
  // Offline Configuration
  
  // Feature Flags
  enableNotifications: boolean;
  enableBackgroundSync: boolean;
  
  // Debug Configuration
  enableDebugLogs: boolean;
  enablePerformanceMonitoring: boolean;

  // Shopping List Limits
  shoppingListMaxActiveItems: number;
  shoppingListMaxCompletedItems: number;
  
  // Lists Limits
  maxListsPerUser: number;
}

// Development Environment
const developmentConfig: EnvironmentConfig = {
  // Supabase Configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_API_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
  // Site Configuration
  siteUrl: import.meta.env.VITE_SITE_URL || 'http://localhost:3000',
  
  // API Configuration
  apiTimeout: 5000,
  
  // PWA Configuration
  pwaName: 'ZUTATO - Einkaufsliste (Dev)',
  pwaShortName: 'ZUTATO Dev',
  pwaDescription: 'Deine intelligente Einkaufsliste für den Haushalt - Development Version',
  pwaThemeColor: '#fbbf24',
  pwaBackgroundColor: '#000000',
  
  // Offline Configuration
  
  // Feature Flags
  enableNotifications: false, // Deaktiviert in Development
  enableBackgroundSync: false, // Deaktiviert in Development
  
  // Debug Configuration
  enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' || true,
  enablePerformanceMonitoring: true,

  // Shopping List Limits
  shoppingListMaxActiveItems: parseInt(import.meta.env.VITE_SHOPPINGLIST_MAX_ACTIVE_ITEMS || '300'),
  shoppingListMaxCompletedItems: parseInt(import.meta.env.VITE_SHOPPINGLIST_MAX_COMPLETED_ITEMS || '100'),
  
  // Lists Limits
  maxListsPerUser: parseInt(import.meta.env.VITE_MAX_LISTS_PER_USER || '10'),
};

// Production Environment
const productionConfig: EnvironmentConfig = {
  // Supabase Configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_API_URL,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  
  // Site Configuration
  siteUrl: import.meta.env.VITE_SITE_URL || 'https://zutato.app',
  
  // API Configuration
  apiTimeout: 10000,
  
  // PWA Configuration
  pwaName: 'ZUTATO - Einkaufsliste',
  pwaShortName: 'ZUTATO',
  pwaDescription: 'Deine intelligente Einkaufsliste für den Haushalt',
  pwaThemeColor: '#fbbf24',
  pwaBackgroundColor: '#000000',
  
  // Offline Configuration
  
  // Feature Flags
  enableNotifications: true,
  enableBackgroundSync: true,
  
  // Debug Configuration
  enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' || false,
  enablePerformanceMonitoring: true,

  // Shopping List Limits
  shoppingListMaxActiveItems: parseInt(import.meta.env.VITE_SHOPPINGLIST_MAX_ACTIVE_ITEMS || '300'),
  shoppingListMaxCompletedItems: parseInt(import.meta.env.VITE_SHOPPINGLIST_MAX_COMPLETED_ITEMS || '100'),
  
  // Lists Limits
  maxListsPerUser: parseInt(import.meta.env.VITE_MAX_LISTS_PER_USER || '10'),
};

// Environment Detection
const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Export current environment config
export const environment: EnvironmentConfig = isDevelopment 
  ? developmentConfig 
  : productionConfig;

// Environment Info
export const environmentInfo = {
  mode: isDevelopment ? 'development' : 'production',
  isDevelopment,
  isProduction,
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  buildTime: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
};

// Utility Functions
export const isOfflineModeEnabled = (): boolean => {
  return false;
};

export const isDebugModeEnabled = (): boolean => {
  return environment.enableDebugLogs;
};

// Removed getApiUrl; no API base URL is used client-side.

export const getSupabaseConfig = () => {
  return {
    url: environment.supabaseUrl,
    anonKey: environment.supabaseAnonKey,
  };
};

export const getSiteUrl = (): string => {
  return environment.siteUrl;
};

export const logDebug = (message: string, data?: any): void => {
  if (environment.enableDebugLogs) {
    console.log(`🔧 [${environmentInfo.mode.toUpperCase()}] ${message}`, data || '');
  }
};

export const logError = (message: string, error?: any): void => {
  console.error(`❌ [${environmentInfo.mode.toUpperCase()}] ${message}`, error || '');
};

export const logInfo = (message: string, data?: any): void => {
  console.log(`ℹ️ [${environmentInfo.mode.toUpperCase()}] ${message}`, data || '');
};

// Environment Validation
export const validateEnvironment = (): void => {
  const requiredFields: (keyof EnvironmentConfig)[] = [
    'supabaseUrl',
    'supabaseAnonKey',
  ];

  for (const field of requiredFields) {
    const value = environment[field];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required environment field: ${field}`);
    }
  }

  logInfo('Environment validation passed', {
    mode: environmentInfo.mode,
    supabaseUrl: environment.supabaseUrl,
    debugLogs: environment.enableDebugLogs
  });
}; 