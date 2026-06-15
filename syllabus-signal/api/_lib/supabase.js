import { createClient } from '@supabase/supabase-js';

// Service-role client: used ONLY in backend functions (never shipped to the
// browser). It bypasses RLS so the ingest pipeline can write content tables.
export const admin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
