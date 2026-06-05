-- Sextacy Manager - Supabase Schema
-- Run this in the Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- TABLES
-- ==========================================

create table if not exists players (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text not null default 'field', -- 'portiere' | 'field'
  number int,
  created_at timestamptz default now()
);

create table if not exists matches (
  id uuid primary key default uuid_generate_v4(),
  opponent text not null,
  scheduled_time timestamptz,
  half_duration_mins int not null default 12,
  score_us int not null default 0,
  score_them int not null default 0,
  status text not null default 'pending' check (status in ('pending', 'live', 'done')),
  phase text not null default 'girone' check (phase in ('girone', 'playoff', 'quarti', 'semi', 'finale')),
  created_at timestamptz default now()
);

create table if not exists match_lineups (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  player_id uuid not null references players(id),
  is_captain boolean not null default false,
  is_starter boolean not null default true,
  created_at timestamptz default now(),
  unique(match_id, player_id)
);

create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  match_id uuid not null references matches(id) on delete cascade,
  minute int not null default 0,
  type text not null check (type in ('goal', 'goal_opp', 'yellow', 'red', 'sub', 'assist')),
  player_id uuid references players(id),
  player_out_id uuid references players(id),
  created_at timestamptz default now()
);

create table if not exists player_stats (
  id uuid primary key default uuid_generate_v4(),
  player_id uuid not null references players(id),
  match_id uuid not null references matches(id) on delete cascade,
  minutes_played int not null default 0,
  goals int not null default 0,
  assists int not null default 0,
  yellows int not null default 0,
  reds int not null default 0,
  created_at timestamptz default now(),
  unique(player_id, match_id)
);

create table if not exists standings (
  id uuid primary key default uuid_generate_v4(),
  team_name text not null unique,
  group_name text not null check (group_name in ('1', '2')),
  played int not null default 0,
  won int not null default 0,
  drawn int not null default 0,
  lost int not null default 0,
  goals_for int not null default 0,
  goals_against int not null default 0,
  points int not null default 0,
  updated_at timestamptz default now()
);

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

alter table players enable row level security;
alter table matches enable row level security;
alter table match_lineups enable row level security;
alter table events enable row level security;
alter table player_stats enable row level security;
alter table standings enable row level security;

-- Allow authenticated users full access to all tables
create policy "Authenticated full access - players" on players
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated full access - matches" on matches
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated full access - match_lineups" on match_lineups
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated full access - events" on events
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated full access - player_stats" on player_stats
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "Authenticated full access - standings" on standings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ==========================================
-- SEED DATA
-- ==========================================

-- Rosa Sextacy
insert into players (name, role) values
  ('Mattia Paratore', 'portiere'),
  ('Federico Valente', 'field'),
  ('Roberto Caruso', 'field'),
  ('Sadia Omar Toure', 'field'),
  ('Jacopo Tugnolo', 'field'),
  ('Antonio Ballacchino', 'field'),
  ('Andrea Stocchino', 'field')
on conflict do nothing;

-- Classifica iniziale
insert into standings (team_name, group_name) values
  ('Sextacy', '1'),
  ('Cunico FC', '1'),
  ('GDB', '1'),
  ('Los Mantos', '1'),
  ('Porceddus FC', '1'),
  ('Cerveza FC', '2'),
  ('scuadra', '2'),
  ('Ceres FC', '2'),
  ('Melanzony FC', '2'),
  ('Tempo Pazzo', '2')
on conflict (team_name) do nothing;
