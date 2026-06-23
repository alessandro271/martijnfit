-- ════════════════════════════════════════════════════════════════════
-- Martijnfit database schema  ·  run this in Supabase → SQL Editor
-- Idempotent: safe to re-run.
-- ════════════════════════════════════════════════════════════════════

-- ─── profiles (1 row per auth user) ──────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default 'Athlete',
  sports        text[] not null default '{}',
  tracking_since date,
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ─── sessions (the logged activities — Strava + manual) ──────────────
create table if not exists public.sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date             date not null,
  sport            text not null,
  duration_minutes integer not null default 0,
  source           text not null default 'manual',   -- 'strava' | 'manual'
  intensity        text,                              -- 'easy'|'moderate'|'hard'
  distance_km      numeric,
  notes            text,
  edited           boolean not null default false,
  external_id      text,                              -- strava activity id (dedup)
  created_at       timestamptz not null default now()
);
create index if not exists sessions_user_date_idx on public.sessions(user_id, date);
create unique index if not exists sessions_user_external_idx
  on public.sessions(user_id, external_id) where external_id is not null;

-- ─── recurring habits ────────────────────────────────────────────────
create table if not exists public.habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  sport      text not null,
  days       text[] not null default '{}',
  start_time text not null,
  end_time   text not null,
  label      text not null default ''
);
create index if not exists habits_user_idx on public.habits(user_id);

-- ─── per-week plan status overrides (confirm/skip) ───────────────────
create table if not exists public.plan_overrides (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id text not null,
  status  text not null,
  primary key (user_id, item_id)
);

-- ─── ad-hoc planned items (added in the planner / by the coach) ──────
create table if not exists public.ad_hoc_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date       date not null,
  sport      text not null,
  start_time text not null default '',
  end_time   text not null default '',
  label      text not null default '',
  status     text not null default 'confirmed',
  origin     text not null default 'adhoc'
);
create index if not exists adhoc_user_idx on public.ad_hoc_items(user_id);

-- ─── connection status (shown in the UI; tokens live separately) ─────
create table if not exists public.connections (
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  provider    text not null,             -- 'strava' | 'google_calendar'
  connected   boolean not null default false,
  last_synced timestamptz,
  primary key (user_id, provider)
);

-- ─── provider OAuth tokens (SERVICE-ROLE ONLY — no client policies) ──
create table if not exists public.provider_tokens (
  user_id       uuid not null references auth.users(id) on delete cascade,
  provider      text not null,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  scope         text,
  athlete_id    text,
  primary key (user_id, provider)
);

-- ════════════════════════════════════════════════════════════════════
-- Row Level Security
-- ════════════════════════════════════════════════════════════════════
alter table public.profiles       enable row level security;
alter table public.sessions       enable row level security;
alter table public.habits         enable row level security;
alter table public.plan_overrides enable row level security;
alter table public.ad_hoc_items   enable row level security;
alter table public.connections    enable row level security;
alter table public.provider_tokens enable row level security;  -- deny all (no policies) → service role only

-- profiles: owner can read/update their own row
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- helper: same owner policy for the user_id tables
drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own habits" on public.habits;
create policy "own habits" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own overrides" on public.plan_overrides;
create policy "own overrides" on public.plan_overrides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own adhoc" on public.ad_hoc_items;
create policy "own adhoc" on public.ad_hoc_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own connections" on public.connections;
create policy "own connections" on public.connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════════
-- Auto-create a profile row whenever a new auth user signs up
-- ════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, onboarded)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Athlete'),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
