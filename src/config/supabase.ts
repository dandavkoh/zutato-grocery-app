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

// No types exported from config - moved to API 