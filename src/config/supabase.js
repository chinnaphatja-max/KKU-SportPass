const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Some API endpoints may fail.');
}

// We use the SECRET_KEY to bypass RLS for server-side admin operations if available
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

module.exports = supabase;
