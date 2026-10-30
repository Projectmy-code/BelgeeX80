import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {SUPABASE_URL,SUPABASE_ANON_KEY,configured} from './config.js';
export const db=configured?createClient(SUPABASE_URL,SUPABASE_ANON_KEY):null;
export async function currentUser(){if(!db)return null;const {data:{user},error}=await db.auth.getUser();if(error)throw error;return user;}
export async function adminStatus(){const user=await currentUser();if(!user)return false;const {data,error}=await db.rpc('is_admin');if(error)throw error;return data===true;}
export async function submissionMode(){if(!db)return 'everyone';const {data,error}=await db.from('site_settings').select('value').eq('key','submission_mode').single();if(error)throw error;return data.value;}
export function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
