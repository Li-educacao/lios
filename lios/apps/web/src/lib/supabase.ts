import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tqpkymereiyfxroiuaip.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxcGt5bWVyZWl5Znhyb2l1YWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxOTQyMzIsImV4cCI6MjA4Nzc3MDIzMn0.z-fuO_R06VU8FKrM4yVMj7h-Nq93DYLSCdiUT-l_elY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
