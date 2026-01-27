import { createClient } from '@supabase/supabase-js';

// Source: https://supabase.com/docs/reference/javascript/initializing - Verified: 2026-01-27
// The anon key is safe to use in the browser — RLS policies control access.
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
