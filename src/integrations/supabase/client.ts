import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ztfhhnpvpxnftmbdegtq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0ZmhobnB2cHhuZnRtYmRlZ3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODY3NTgsImV4cCI6MjA4MDI2Mjc1OH0.0H9wV3vQxsDBcmkC1I8qe4je4qo2TXntDxTJa53OCJE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
