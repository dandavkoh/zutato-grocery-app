import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './stores/store'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './contexts/ToastContext'

// Ionic React Imports
import { setupIonicReact } from '@ionic/react'
import { defineCustomElements } from '@ionic/pwa-elements/loader'

// Ionic CSS
import '@ionic/react/css/core.css'
import '@ionic/react/css/normalize.css'
import '@ionic/react/css/structure.css'
import '@ionic/react/css/typography.css'
import '@ionic/react/css/padding.css'
import '@ionic/react/css/float-elements.css'
import '@ionic/react/css/text-alignment.css'
import '@ionic/react/css/text-transformation.css'
import '@ionic/react/css/flex-utils.css'
import '@ionic/react/css/display.css'

// Initialize Ionic
setupIonicReact({
  mode: 'ios', // Use iOS mode for consistent look across platforms
  rippleEffect: false, // Disable ripple effect for better performance
  animated: true
})

// Initialize PWA Elements
defineCustomElements(window)

// Initialize Capacitor Service
import { capacitorService } from './services/capacitorService'

// Initialize Global Services (Interceptor & Queue)
import { globalServiceManager } from './services/globalServiceManager'

// Initialize PWA Service
import './services/pwaService'
// Supabase is automatically initialized
import { logInfo, getSentryConfig } from './config/environment'

// Initialize Sentry
import * as Sentry from '@sentry/react'

const sentryConfig = getSentryConfig()
if (sentryConfig.enabled && sentryConfig.dsn) {
  Sentry.init({
    dsn: sentryConfig.dsn,
    environment: sentryConfig.environment,
    // Setting this option to true will send default PII data to Sentry.
    // For example, automatic IP address collection on events
    sendDefaultPii: true,
    // Performance Monitoring
    tracesSampleRate: sentryConfig.environment === 'production' ? 0.1 : 1.0,
    // Session Replay
    replaysSessionSampleRate: sentryConfig.environment === 'production' ? 0.1 : 0.5,
    replaysOnErrorSampleRate: 1.0,
    // Additional options
    beforeSend(event) {
      // Filter out development errors in production
      if (sentryConfig.environment === 'production' && event.exception) {
        const error = event.exception.values?.[0];
        if (error?.value?.includes('localhost') || error?.value?.includes('127.0.0.1')) {
          return null;
        }
      }
      return event;
    },
  });
  
  logInfo('Sentry initialized', { 
    environment: sentryConfig.environment, 
    enabled: sentryConfig.enabled 
  });
} else {
  logInfo('Sentry disabled or not configured');
}

// Initialize services
const initializeApp = async () => {
  try {
    logInfo('Initializing ZUTATO PWA...');
    
    // Initialize Capacitor
    await capacitorService.initialize();
    
    // Initialize Global Services (Interceptor & Queue)
    // These services are automatically initialized as singletons
    // and will be active throughout the entire app lifecycle
    logInfo('Global services initialized (Interceptor & Queue)');
    
    // Supabase is automatically initialized when the client is created
    logInfo('App initialization completed');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
};

// Initialize app and render
initializeApp().then(() => {
  const container = document.getElementById('root')!;
  const root = createRoot(container);
  
  const AppWithProviders = (
    <StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </BrowserRouter>
      </Provider>
    </StrictMode>
  );
  
  // Wrap with Sentry Error Boundary if Sentry is enabled
  if (sentryConfig.enabled && sentryConfig.dsn) {
    root.render(
      <Sentry.ErrorBoundary fallback={({ error, resetError }) => (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
            {/* Error Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            {/* Error Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Oops! Etwas ist schiefgelaufen
            </h1>
            
            {/* Error Message */}
            <p className="text-gray-600 mb-8 leading-relaxed">
              Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut oder lade die Seite neu.
            </p>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <button 
                onClick={resetError}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Seite neu laden
              </button>
              
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Zur Startseite
              </button>
            </div>
            
            {/* Development Error Details */}
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-8 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 font-medium">
                  Fehlerdetails (Development)
                </summary>
                <div className="mt-3 p-4 bg-gray-100 rounded-lg">
                  <pre className="text-xs text-red-600 overflow-auto whitespace-pre-wrap break-words">
                    {error?.toString()}
                  </pre>
                </div>
              </details>
            )}
          </div>
        </div>
      )}>
        {AppWithProviders}
      </Sentry.ErrorBoundary>
    );
  } else {
    root.render(AppWithProviders);
  }
});
