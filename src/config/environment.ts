// Environment Configuration für Development und Production
export interface EnvironmentConfig {
  // Supabase Configuration
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  
  // API Configuration
  apiBaseUrl: string;
  apiTimeout: number;
  
  // PWA Configuration
  pwaName: string;
  pwaShortName: string;
  pwaDescription: string;
  pwaThemeColor: string;
  pwaBackgroundColor: string;
  
  // Offline Configuration
  maxQueueSize: number;
  cacheDuration: number;
  cacheCleanupInterval: number;
  
  // Feature Flags
  enableOfflineMode: boolean;
  enableNotifications: boolean;
  enableBackgroundSync: boolean;
  
  // Debug Configuration
  enableDebugLogs: boolean;
  enablePerformanceMonitoring: boolean;
}

// Development Environment
const developmentConfig: EnvironmentConfig = {
  // Supabase Configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_API_URL || 'http://127.0.0.1:54321',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  supabaseServiceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  
  // API Configuration
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
  apiTimeout: 5000,
  
  // PWA Configuration
  pwaName: 'HNGRY - Einkaufsliste (Dev)',
  pwaShortName: 'HNGRY Dev',
  pwaDescription: 'Deine intelligente Einkaufsliste für den Haushalt - Development Version',
  pwaThemeColor: '#fbbf24',
  pwaBackgroundColor: '#000000',
  
  // Offline Configuration
  maxQueueSize: parseInt(import.meta.env.VITE_MAX_QUEUE_SIZE || '50'),
  cacheDuration: parseInt(import.meta.env.VITE_CACHE_DURATION || '300000'),
  cacheCleanupInterval: parseInt(import.meta.env.VITE_CACHE_CLEANUP_INTERVAL || '120000'),
  
  // Feature Flags
  enableOfflineMode: import.meta.env.VITE_ENABLE_OFFLINE_MODE === 'true' || true,
  enableNotifications: false, // Deaktiviert in Development
  enableBackgroundSync: false, // Deaktiviert in Development
  
  // Debug Configuration
  enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' || true,
  enablePerformanceMonitoring: true,
};

// Production Environment
const productionConfig: EnvironmentConfig = {
  // Supabase Configuration
  supabaseUrl: import.meta.env.VITE_SUPABASE_API_URL || 'https://your-project.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_PRODUCTION_ANON_KEY',
  supabaseServiceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'YOUR_PRODUCTION_SERVICE_ROLE_KEY',
  
  // API Configuration
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'https://api.hngry.app',
  apiTimeout: 10000,
  
  // PWA Configuration
  pwaName: 'HNGRY - Einkaufsliste',
  pwaShortName: 'HNGRY',
  pwaDescription: 'Deine intelligente Einkaufsliste für den Haushalt',
  pwaThemeColor: '#fbbf24',
  pwaBackgroundColor: '#000000',
  
  // Offline Configuration
  maxQueueSize: parseInt(import.meta.env.VITE_MAX_QUEUE_SIZE || '100'),
  cacheDuration: parseInt(import.meta.env.VITE_CACHE_DURATION || '86400000'),
  cacheCleanupInterval: parseInt(import.meta.env.VITE_CACHE_CLEANUP_INTERVAL || '3600000'),
  
  // Feature Flags
  enableOfflineMode: import.meta.env.VITE_ENABLE_OFFLINE_MODE === 'true' || true,
  enableNotifications: true,
  enableBackgroundSync: true,
  
  // Debug Configuration
  enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true' || false,
  enablePerformanceMonitoring: true,
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
  return environment.enableOfflineMode;
};

export const isDebugModeEnabled = (): boolean => {
  return environment.enableDebugLogs;
};

export const getApiUrl = (endpoint: string): string => {
  return `${environment.apiBaseUrl}${endpoint}`;
};

export const getSupabaseConfig = () => {
  return {
    url: environment.supabaseUrl,
    anonKey: environment.supabaseAnonKey,
    serviceRoleKey: environment.supabaseServiceRoleKey,
  };
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
    'apiBaseUrl',
    'maxQueueSize',
    'cacheDuration',
    'enableOfflineMode'
  ];

  for (const field of requiredFields) {
    const value = environment[field];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing required environment field: ${field}`);
    }
    
    // Spezielle Validierung für enableOfflineMode
    if (field === 'enableOfflineMode' && typeof value !== 'boolean') {
      throw new Error(`Invalid value for enableOfflineMode: ${value}. Expected boolean.`);
    }
  }

  logInfo('Environment validation passed', {
    mode: environmentInfo.mode,
    supabaseUrl: environment.supabaseUrl,
    apiBaseUrl: environment.apiBaseUrl,
    offlineMode: environment.enableOfflineMode,
    debugLogs: environment.enableDebugLogs
  });
}; 