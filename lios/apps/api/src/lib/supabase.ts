import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Admin client (service role) for backend operations — bypasses RLS
export const supabaseAdmin = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey
);

// Create per-request client that respects RLS for the authenticated user
export function createSupabaseClient(accessToken: string) {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
