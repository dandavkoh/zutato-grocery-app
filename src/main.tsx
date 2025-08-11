import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './stores/store'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from './contexts/ToastContext'
// Initialize PWA Service
import './services/pwaService'
// Supabase is automatically initialized
import { logInfo } from './config/environment'

// Initialize services
const initializeApp = async () => {
  try {
    logInfo('Initializing ZUTATO PWA...');
    // Supabase is automatically initialized when the client is created
    logInfo('App initialization completed');
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
};

// Initialize app and render
initializeApp().then(() => {
  createRoot(document.getElementById('root')!).render(
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
    </StrictMode>,
  );
});
