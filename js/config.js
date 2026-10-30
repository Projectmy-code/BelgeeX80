import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const SUPABASE_URL = 'https://slccolaeyzmashhulcoc.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Mo2wS9QW4DTup39LgMMf3g_bRHO2QIR';

// ВОТ ЗДЕСЬ ОЧЕНЬ ВАЖНО НАПИСАТЬ EXPORT:
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);﻿
