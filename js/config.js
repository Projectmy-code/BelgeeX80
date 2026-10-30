// Copy your Supabase Project URL and PUBLISHABLE (anon) key from Project Settings > API.
// NEVER put the service_role / secret key in frontend code.
export const SUPABASE_URL = 'https://slccolaeyzmashhulcoc.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Mo2wS9QW4DTup39LgMMf3g_bRHO2QIR';
export const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_ANON_KEY.startsWith('PASTE_');
