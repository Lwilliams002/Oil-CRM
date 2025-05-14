

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqkkmgjlcxdbuhwzjeou.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxa2ttZ2psY3hkYnVod3pqZW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3MjYxNjAsImV4cCI6MjA2MTMwMjE2MH0.kVMtxC6XgrGA8BFwbruCOY5KYv84Phb1M6gi2brojtY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;