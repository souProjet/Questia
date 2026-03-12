-- Quêtes Secondaires - Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up your database.

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Profiles table: stores user personality and progression data
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  explorer_axis text not null check (explorer_axis in ('homebody', 'explorer')),
  risk_axis text not null check (risk_axis in ('cautious', 'risktaker')),
  declared_personality jsonb not null default '{}',
  exhibited_personality jsonb not null default '{}',
  current_day integer not null default 1,
  current_phase text not null default 'calibration'
    check (current_phase in ('calibration', 'expansion', 'rupture')),
  congruence_delta real not null default 0,
  streak_count integer not null default 0,
  rerolls_remaining integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Quest logs table: records every quest interaction
create table public.quest_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id integer not null,
  assigned_at timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'completed', 'rejected', 'replaced')),
  completed_at timestamptz,
  congruence_delta_at_assignment real not null default 0,
  phase_at_assignment text not null default 'calibration'
    check (phase_at_assignment in ('calibration', 'expansion', 'rupture')),
  was_rerolled boolean not null default false,
  was_fallback boolean not null default false,
  safety_consent_given boolean not null default false
);

-- Indexes for common queries
create index idx_quest_logs_user_id on public.quest_logs(user_id);
create index idx_quest_logs_assigned_at on public.quest_logs(assigned_at desc);
create index idx_quest_logs_status on public.quest_logs(status);

-- Auto-update updated_at on profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.quest_logs enable row level security;

-- Policies (users can only access their own data)
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users read own quest logs"
  on public.quest_logs for select
  using (auth.uid() = user_id);

create policy "Users insert own quest logs"
  on public.quest_logs for insert
  with check (auth.uid() = user_id);

create policy "Users update own quest logs"
  on public.quest_logs for update
  using (auth.uid() = user_id);
