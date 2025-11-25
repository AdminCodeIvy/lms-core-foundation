import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Types for the database
export type UserRole = 'INPUTTER' | 'APPROVER' | 'VIEWER' | 'ADMINISTRATOR';

export interface User {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface District {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface SubDistrict {
  id: string;
  district_id: string;
  name: string;
  is_active: boolean;
}

export interface PropertyType {
  id: string;
  name: string;
  category: string;
  is_active: boolean;
}

export interface Carrier {
  id: string;
  name: string;
  is_active: boolean;
}

export interface Country {
  id: string;
  code: string;
  name: string;
}
