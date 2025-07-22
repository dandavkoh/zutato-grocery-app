import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig, logInfo, logError } from './environment';

// Supabase Client Configuration
const supabaseConfig = getSupabaseConfig();

// Create Supabase client
export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Supabase client is automatically initialized when created
// No need for explicit initialization - the client handles connection management

// Make Supabase client available globally for PWA interceptor
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

// No types exported from config - moved to API 