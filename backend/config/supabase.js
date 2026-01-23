const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Configure with custom fetch options to avoid timeout issues
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-node',
    },
  },
};

// Public client (with RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey, options);

// Service role client (bypass RLS for admin operations)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, options);

module.exports = { supabase, supabaseAdmin };

