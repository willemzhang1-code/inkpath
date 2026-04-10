-- ============================================================
-- InkPath Database Schema
-- Run this in Supabase SQL Editor (Database → SQL Editor → New Query)
-- ============================================================

-- 1. PROFILES TABLE (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  preferred_lang text default 'en',
  tier text default 'free' check (tier in ('free', 'plus', 'max')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  subscription_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. WRITING ENTRIES TABLE
-- ============================================================
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'free' check (mode in ('free', 'task1', 'task2', 'letter', 'guided')),
  title text,
  content text not null,
  word_count integer not null default 0,

  -- Feedback (stored as JSON for flexibility)
  feedback jsonb,
  band_score numeric(2,1),

  -- Personal growth analysis
  primary_emotion text,
  emotion_intensity numeric(2,1),
  themes text[],
  reflection_prompt text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index entries_user_id_created_at_idx on public.entries(user_id, created_at desc);
create index entries_user_id_band_score_idx on public.entries(user_id, band_score);

-- 3. VOCABULARY TABLE
-- ============================================================
create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid references public.entries(id) on delete set null,

  word text not null,
  definition text not null,
  example text,
  cefr_level text check (cefr_level in ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
  category text,

  -- Spaced repetition (SM-2 lite)
  mastery_status text default 'new' check (mastery_status in ('new', 'learning', 'mastered')),
  review_count integer default 0,
  next_review_at timestamptz default now(),
  last_reviewed_at timestamptz,

  created_at timestamptz default now()
);

create index vocabulary_user_id_idx on public.vocabulary(user_id);
create index vocabulary_user_id_status_idx on public.vocabulary(user_id, mastery_status);
create index vocabulary_user_id_review_idx on public.vocabulary(user_id, next_review_at);
create unique index vocabulary_user_word_unique on public.vocabulary(user_id, lower(word));

-- 4. USAGE TRACKING (for free tier limits)
-- ============================================================
create table public.usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create index usage_log_user_action_idx on public.usage_log(user_id, action, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — privacy enforcement at the DB level
-- ============================================================

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.vocabulary enable row level security;
alter table public.usage_log enable row level security;

-- Profiles: users can only see/update their own profile
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Entries: full CRUD on own entries only
create policy "entries_select_own" on public.entries
  for select using (auth.uid() = user_id);
create policy "entries_insert_own" on public.entries
  for insert with check (auth.uid() = user_id);
create policy "entries_update_own" on public.entries
  for update using (auth.uid() = user_id);
create policy "entries_delete_own" on public.entries
  for delete using (auth.uid() = user_id);

-- Vocabulary: full CRUD on own vocabulary only
create policy "vocabulary_select_own" on public.vocabulary
  for select using (auth.uid() = user_id);
create policy "vocabulary_insert_own" on public.vocabulary
  for insert with check (auth.uid() = user_id);
create policy "vocabulary_update_own" on public.vocabulary
  for update using (auth.uid() = user_id);
create policy "vocabulary_delete_own" on public.vocabulary
  for delete using (auth.uid() = user_id);

-- Usage log: read own, insert own
create policy "usage_log_select_own" on public.usage_log
  for select using (auth.uid() = user_id);
create policy "usage_log_insert_own" on public.usage_log
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile when a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at timestamp
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

create trigger entries_touch_updated_at
  before update on public.entries
  for each row execute function public.touch_updated_at();

-- ============================================================
-- HELPER VIEWS
-- ============================================================

-- Weekly entry count for free tier limits
create or replace view public.weekly_usage as
select
  user_id,
  count(*) filter (where created_at > now() - interval '7 days') as entries_this_week
from public.entries
group by user_id;

grant select on public.weekly_usage to authenticated;
