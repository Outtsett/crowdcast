create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text not null,
  icon text not null,
  xp_reward integer not null default 10,
  category text not null default 'general'
);

create table public.user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now()
);

create unique index user_achievements_unique on public.user_achievements (user_id, achievement_id);
create index user_achievements_user_idx on public.user_achievements (user_id);

create table public.streaks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_vote_date date,
  updated_at timestamptz not null default now()
);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.streaks enable row level security;

create policy "Achievements are publicly viewable" on public.achievements for select using (true);
create policy "User achievements are publicly viewable" on public.user_achievements for select using (true);
create policy "Streaks are publicly viewable" on public.streaks for select using (true);
create policy "Users update own streak" on public.streaks for update using (auth.uid() = user_id);

insert into public.achievements (slug, name, description, icon, xp_reward, category) values
  ('first_poll', 'Poll Starter', 'Created your first poll', '📊', 10, 'creation'),
  ('first_vote', 'Voice Heard', 'Cast your first vote', '🗳️', 5, 'voting'),
  ('ten_polls', 'Poll Machine', 'Created 10 polls', '🏭', 50, 'creation'),
  ('hundred_votes', 'Century Voter', 'Cast 100 votes', '💯', 100, 'voting'),
  ('first_community', 'Community Builder', 'Created your first community', '🏘️', 25, 'community'),
  ('streak_7', 'Week Warrior', '7-day voting streak', '🔥', 50, 'streak'),
  ('streak_30', 'Monthly Maven', '30-day voting streak', '⚡', 200, 'streak'),
  ('streak_100', 'Century Streaker', '100-day voting streak', '🏆', 500, 'streak'),
  ('first_follower', 'Influencer', 'Got your first follower', '⭐', 10, 'social'),
  ('hundred_followers', 'Rising Star', 'Reached 100 followers', '🌟', 200, 'social'),
  ('viral_poll', 'Gone Viral', 'A poll reached 1000 votes', '🚀', 300, 'creation'),
  ('commenter', 'Commentator', 'Left 50 comments', '💬', 50, 'social');
