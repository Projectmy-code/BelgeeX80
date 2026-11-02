import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://slccolaeyzmashhulcoc.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Mo2wS9QW4DTup39LgMMf3g_bRHO2QIR';

export const configured = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
    }
});
