// Copy your Supabase Project URL and PUBLISHABLE (anon) key from Project Settings > API.
// NEVER put the service_role / secret key in frontend code.
export const SUPABASE_URL = 'PASTE_SUPABASE_PROJECT_URL';
export const SUPABASE_ANON_KEY = 'PASTE_SUPABASE_PUBLISHABLE_KEY';
export const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_ANON_KEY.startsWith('PASTE_');
