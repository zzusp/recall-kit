import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export function initSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  
  // Use service role key if available, otherwise use anon key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables. Required: SUPABASE_URL and either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}

export type SupabaseClient = ReturnType<typeof initSupabase>;