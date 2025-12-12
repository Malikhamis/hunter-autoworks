const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.warn('Supabase admin client not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment');
}

// Create a supabase client for server-side use. Use the service role key only on trusted servers.
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
});

module.exports = supabaseAdmin;
