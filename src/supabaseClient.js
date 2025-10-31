

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://mrsvaopoewlagrrvljch.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1yc3Zhb3BvZXdsYWdycnZsamNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4Njk5NDIsImV4cCI6MjA3NzQ0NTk0Mn0.73Z0_H2R2I2dPLrpykEjQ7gii_LJjxcvBr6zYlXbTfM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;