-- Run in Supabase SQL Editor. Create first admin account through Auth UI, then promote via SQL below.
create extension if not exists pgcrypto;
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Участник',
 role text not null default 'member' check (role in ('member','admin')),
 created_at timestamptz not null default now()
);
create table if not exists public.site_settings (
 key text primary key,
 value text not null,
 updated_at timestamptz not null default now()
);
insert into public.site_settings(key,value) values ('submission_mode','everyone') on conflict (key) do nothing;
create table if not exists public.articles (
 id uuid primary key default gen_random_uuid(),
 author_id uuid references auth.users(id) on delete set null,
 guest_name text,
 title text not null check (char_length(title) between 5 and 180),
 category text not null check (char_length(category) between 2 and 80),
 summary text not null check (char_length(summary) between 10 and 800),
 content text not null check (char_length(content) between 30 and 30000),
 status text not null default 'pending' check (status in ('pending','published','rejected')),
 rejection_reason text,
 created_at timestamptz not null default now(),
 published_at timestamptz
);
create index if not exists articles_status_created_idx on public.articles(status,created_at desc);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin');
$$;
create or replace function public.submission_allowed() returns boolean language sql stable security definer set search_path = '' as $$
 select public.is_admin() or coalesce((select case value when 'everyone' then true when 'registered' then (select auth.uid()) is not null else false end from public.site_settings where key='submission_mode'),false);
$$;
create or replace function public.create_profile() returns trigger language plpgsql security definer set search_path = '' as $$
 begin insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(left(new.raw_user_meta_data->>'display_name',80),''),'Участник')); return new; end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();
-- Backfill profiles for users who registered before installing schema.
insert into public.profiles(id) select id from auth.users on conflict do nothing;
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.articles enable row level security;
drop policy if exists "profiles own or admin read" on public.profiles;
create policy "profiles own or admin read" on public.profiles for select to authenticated using (id=(select auth.uid()) or public.is_admin());
drop policy if exists "settings readable" on public.site_settings;
create policy "settings readable" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "settings admin update" on public.site_settings;
create policy "settings admin update" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "published and own and admin read" on public.articles;
create policy "published and own and admin read" on public.articles for select to anon,authenticated using (status='published' or public.is_admin() or (author_id is not null and author_id=(select auth.uid())));
drop policy if exists "submit pending only" on public.articles;
create policy "submit pending only" on public.articles for insert to anon,authenticated with check (
 public.submission_allowed() and status='pending' and published_at is null and rejection_reason is null
 and ((auth.uid() is null and author_id is null and guest_name is not null and char_length(trim(guest_name)) between 2 and 80)
 or (auth.uid() is not null and author_id=auth.uid()))
);
drop policy if exists "admin updates articles" on public.articles;
create policy "admin updates articles" on public.articles for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes articles" on public.articles;
create policy "admin deletes articles" on public.articles for delete to authenticated using (public.is_admin());

-- Feedback is write-only for visitors, readable and deletable by admins.
create table if not exists public.feedback (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(trim(name)) between 2 and 80),
 message text not null check (char_length(trim(message)) between 10 and 4000),
 created_at timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback(created_at desc);
alter table public.feedback enable row level security;
drop policy if exists "feedback submit" on public.feedback;
create policy "feedback submit" on public.feedback for insert to anon,authenticated with check (true);
drop policy if exists "feedback admin read" on public.feedback;
create policy "feedback admin read" on public.feedback for select to authenticated using (public.is_admin());
drop policy if exists "feedback admin delete" on public.feedback;
create policy "feedback admin delete" on public.feedback for delete to authenticated using (public.is_admin());
-- Limit grants to the operations needed by public clients.
revoke all on public.profiles,public.site_settings,public.articles,public.feedback from anon,authenticated;
grant select on public.site_settings to anon,authenticated;
grant update(value,updated_at) on public.site_settings to authenticated;
grant select on public.profiles to authenticated;
grant select,insert on public.articles to anon;
grant select,insert,update,delete on public.articles to authenticated;
grant insert on public.feedback to anon;
grant insert,select,delete on public.feedback to authenticated;
grant execute on function public.is_admin() to anon,authenticated;
grant execute on function public.submission_allowed() to anon,authenticated;

-- IMPORTANT: after registering your own account, promote it by replacing the email:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='YOUR_EMAIL@example.com');
-- Never add public policies allowing clients to update profiles.role.
