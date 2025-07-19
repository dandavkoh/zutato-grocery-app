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

// Initialize Supabase connection
export const initializeSupabase = async () => {
  try {
    // Test connection
    const { data, error } = await supabase.from('shopping_items').select('count').limit(1);
    
    if (error) {
      logError('Supabase connection test failed', error);
      throw error;
    }
    
    logInfo('Supabase connection established successfully', {
      url: supabaseConfig.url,
      hasData: !!data
    });
    
    return supabase;
  } catch (error) {
    logError('Failed to initialize Supabase', error);
    throw error;
  }
};

// Supabase service functions
export const supabaseService = {
  // Shopping Items
  async getShoppingItems() {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },
  
  async createShoppingItem(item: any) {
    const { data, error } = await supabase
      .from('shopping_items')
      .insert([item])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async updateShoppingItem(id: string, updates: any) {
    const { data, error } = await supabase
      .from('shopping_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
  
  async deleteShoppingItem(id: string) {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },
  
  // Categories
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  
  // Units
  async getUnits() {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  },
  
  // Households
  async getHouseholds() {
    const { data, error } = await supabase
      .from('households')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) throw error;
    return data;
  }
};

// Export types for Supabase
export type ShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  unit_id: string;
  category_id: string;
  household_id: string;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  created_at: string;
};

export type Unit = {
  id: string;
  name: string;
  abbreviation: string;
  created_at: string;
};

export type Household = {
  id: string;
  name: string;
  created_at: string;
}; 