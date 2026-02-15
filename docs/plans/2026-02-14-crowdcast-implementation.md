# Crowdcast Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build Crowdcast, a hybrid social + community polling platform with freemium monetization and creator marketplace.

**Architecture:** Turborepo monorepo with Next.js 14+ web app, shared packages for types/utils/DB, and Supabase for backend (PostgreSQL, Realtime, Auth, Storage, Edge Functions). Stripe for payments. React Native mobile planned for Phase 7.

**Tech Stack:** Next.js 14 (App Router), Supabase, Tailwind CSS, shadcn/ui, Zustand, Zod, Stripe, Turborepo, TypeScript throughout.

---

## Phase Overview

| Phase | Focus | Est. Tasks |
|-------|-------|-----------|
| **1** | Foundation: Monorepo + DB + Auth + Core Polls | 20 |
| **2** | Social Layer: Feed, Follows, Comments, Profiles | 16 |
| **3** | Communities: Groups, Roles, Community Polls | 14 |
| **4** | Discovery + Gamification: Trending, Search, Streaks, Badges | 12 |
| **5** | Premium + Billing: Stripe Subscriptions, Tier Gating | 10 |
| **6** | Marketplace: Stripe Connect, Templates, Access Passes | 10 |
| **7** | Mobile: Expo React Native App | 14 |
| **8** | Polish + Launch: OG Images, Notifications, Analytics | 10 |

**This document covers Phase 1 and Phase 2 in full task detail. Later phases will be planned as we progress.**

---

## Phase 1: Foundation — Monorepo + DB + Auth + Core Polls

### Task 1: Initialize Turborepo Monorepo

**Files:**
- Create: `package.json` (root)
- Create: `turbo.json`
- Create: `apps/web/` (Next.js app)
- Create: `packages/shared/` (types + utils)
- Create: `packages/supabase/` (DB client + hooks)

**Step 1: Scaffold Turborepo with Next.js**

```bash
cd C:\Users\tyler\crowdcast
npx create-turbo@latest . --example with-tailwind
```

If the template doesn't match our structure, manually set up:

```bash
npx create-next-app@latest apps/web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

**Step 2: Create shared package**

Create `packages/shared/package.json`:
```json
{
  "name": "@crowdcast/shared",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

Create `packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

Create `packages/shared/src/index.ts`:
```ts
export * from './types';
export * from './validators';
```

**Step 3: Create supabase package**

Create `packages/supabase/package.json`:
```json
{
  "name": "@crowdcast/supabase",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  }
}
```

**Step 4: Configure turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "lint": { "dependsOn": ["^lint"] },
    "type-check": { "dependsOn": ["^type-check"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```

**Step 5: Install dependencies and verify**

```bash
npm install
npm run build
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize Turborepo monorepo with Next.js + shared packages"
```

---

### Task 2: Set Up Supabase Project + Local Dev

**Files:**
- Create: `supabase/config.toml`
- Create: `.env.local` template
- Modify: `apps/web/.env.local`

**Step 1: Initialize Supabase locally**

```bash
npx supabase init
```

This creates the `supabase/` directory with `config.toml`.

**Step 2: Start Supabase locally**

```bash
npx supabase start
```

Note the output — it gives you `API URL`, `anon key`, `service_role key`.

**Step 3: Create env files**

Create `apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key-from-supabase-start>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-start>
```

Create `.env.example` at root (for documentation, no secrets):
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Step 4: Add .gitignore entries**

Append to root `.gitignore`:
```
.env.local
.env*.local
supabase/.temp/
```

**Step 5: Commit**

```bash
git add supabase/config.toml .env.example .gitignore
git commit -m "feat: initialize Supabase local dev environment"
```

---

### Task 3: Create Core Database Schema — Users + Profiles

**Files:**
- Create: `supabase/migrations/00001_profiles.sql`

**Step 1: Write the migration**

```sql
-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null default '',
  avatar_url text,
  bio text default '',
  website text,
  location text,
  xp integer not null default 0,
  level integer not null default 1,
  is_verified boolean not null default false,
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro', 'business', 'enterprise')),
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Username constraints
alter table public.profiles add constraint username_length check (char_length(username) between 3 and 30);
alter table public.profiles add constraint username_format check (username ~ '^[a-zA-Z0-9_]+$');

-- Updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "Profiles are publicly viewable"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Indexes
create index profiles_username_idx on public.profiles (username);
create index profiles_subscription_tier_idx on public.profiles (subscription_tier);
```

**Step 2: Run migration**

```bash
npx supabase db reset
```

**Step 3: Verify tables exist**

```bash
npx supabase db lint
```

**Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add profiles table with RLS and auto-creation trigger"
```

---

### Task 4: Create Core Database Schema — Polls + Voting

**Files:**
- Create: `supabase/migrations/00002_polls.sql`

**Step 1: Write the migration**

```sql
-- Poll types enum
create type public.poll_type as enum (
  'multiple_choice',
  'yes_no',
  'rating',
  'image',
  'ranked_choice',
  'this_or_that',
  'open_ended'
);

-- Poll status enum
create type public.poll_status as enum ('draft', 'active', 'closed');

-- Polls table
create table public.polls (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid, -- nullable, set when poll belongs to a community
  type public.poll_type not null default 'multiple_choice',
  status public.poll_status not null default 'active',
  question text not null,
  description text,
  is_anonymous boolean not null default false,
  allow_multiple boolean not null default false,
  closes_at timestamptz, -- null = never closes
  total_votes integer not null default 0,
  total_comments integer not null default 0,
  category text,
  tags text[] default '{}',
  trending_score float not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Poll options
create table public.poll_options (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  image_url text, -- for image polls
  position integer not null default 0,
  vote_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Votes
create table public.votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- For ranked choice: position in ranking (1 = first choice)
  rank_position integer,
  -- For rating: the rating value
  rating_value integer check (rating_value between 1 and 10),
  -- For open-ended: text response
  text_response text,
  created_at timestamptz not null default now()
);

-- One vote per user per poll (for non-multiple-choice)
create unique index votes_unique_user_poll
  on public.votes (user_id, poll_id)
  where rank_position is null;

-- For ranked choice: one rank per position per user per poll
create unique index votes_unique_ranked
  on public.votes (user_id, poll_id, rank_position)
  where rank_position is not null;

-- Updated_at trigger for polls
create trigger polls_updated_at
  before update on public.polls
  for each row execute function public.handle_updated_at();

-- Function to increment vote count atomically
create or replace function public.increment_vote_count()
returns trigger as $$
begin
  update public.poll_options
    set vote_count = vote_count + 1
    where id = new.option_id;
  update public.polls
    set total_votes = total_votes + 1
    where id = new.poll_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_vote_created
  after insert on public.votes
  for each row execute function public.increment_vote_count();

-- RLS
alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;

-- Polls: public read, authenticated create, owner update/delete
create policy "Polls are publicly viewable"
  on public.polls for select using (true);

create policy "Authenticated users can create polls"
  on public.polls for insert with check (auth.uid() = creator_id);

create policy "Poll owners can update their polls"
  on public.polls for update using (auth.uid() = creator_id);

create policy "Poll owners can delete their polls"
  on public.polls for delete using (auth.uid() = creator_id);

-- Options: public read, poll owner manages
create policy "Poll options are publicly viewable"
  on public.poll_options for select using (true);

create policy "Poll owners can manage options"
  on public.poll_options for insert
  with check (
    exists (select 1 from public.polls where id = poll_id and creator_id = auth.uid())
  );

-- Votes: users can see aggregates (via options), create their own
create policy "Users can see all votes"
  on public.votes for select using (true);

create policy "Authenticated users can vote"
  on public.votes for insert with check (auth.uid() = user_id);

-- Indexes
create index polls_creator_id_idx on public.polls (creator_id);
create index polls_community_id_idx on public.polls (community_id);
create index polls_status_idx on public.polls (status);
create index polls_trending_score_idx on public.polls (trending_score desc);
create index polls_created_at_idx on public.polls (created_at desc);
create index polls_category_idx on public.polls (category);
create index poll_options_poll_id_idx on public.poll_options (poll_id);
create index votes_poll_id_idx on public.votes (poll_id);
create index votes_user_id_idx on public.votes (user_id);
create index votes_option_id_idx on public.votes (option_id);
```

**Step 2: Run migration**

```bash
npx supabase db reset
```

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add polls, poll_options, and votes tables with RLS"
```

---

### Task 5: Create Database Schema — Social (Follows, Comments, Reactions)

**Files:**
- Create: `supabase/migrations/00003_social.sql`

**Step 1: Write the migration**

```sql
-- Follows
create table public.follows (
  id uuid primary key default uuid_generate_v4(),
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint no_self_follow check (follower_id != following_id)
);

create unique index follows_unique on public.follows (follower_id, following_id);
create index follows_follower_idx on public.follows (follower_id);
create index follows_following_idx on public.follows (following_id);

-- Comments
create table public.poll_comments (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.poll_comments(id) on delete cascade, -- threaded replies
  body text not null,
  likes_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_poll_id_idx on public.poll_comments (poll_id);
create index comments_user_id_idx on public.poll_comments (user_id);
create index comments_parent_id_idx on public.poll_comments (parent_id);

create trigger comments_updated_at
  before update on public.poll_comments
  for each row execute function public.handle_updated_at();

-- Increment comment count on poll
create or replace function public.increment_comment_count()
returns trigger as $$
begin
  update public.polls
    set total_comments = total_comments + 1
    where id = new.poll_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_comment_created
  after insert on public.poll_comments
  for each row execute function public.increment_comment_count();

-- Reactions (likes, etc.) on polls
create type public.reaction_type as enum ('like', 'fire', 'thinking', 'laugh', 'surprise');

create table public.poll_reactions (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction public.reaction_type not null default 'like',
  created_at timestamptz not null default now()
);

create unique index reactions_unique on public.poll_reactions (user_id, poll_id, reaction);
create index reactions_poll_id_idx on public.poll_reactions (poll_id);

-- Notifications
create type public.notification_type as enum (
  'new_follower', 'poll_vote', 'poll_comment', 'poll_reaction',
  'community_invite', 'poll_closed', 'achievement', 'mention'
);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  data jsonb default '{}', -- flexible payload (poll_id, user_id, etc.)
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, is_read, created_at desc);

-- RLS
alter table public.follows enable row level security;
alter table public.poll_comments enable row level security;
alter table public.poll_reactions enable row level security;
alter table public.notifications enable row level security;

create policy "Follows are publicly viewable" on public.follows for select using (true);
create policy "Users can follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow" on public.follows for delete using (auth.uid() = follower_id);

create policy "Comments are publicly viewable" on public.poll_comments for select using (true);
create policy "Authenticated users can comment" on public.poll_comments for insert with check (auth.uid() = user_id);
create policy "Users can edit own comments" on public.poll_comments for update using (auth.uid() = user_id);
create policy "Users can delete own comments" on public.poll_comments for delete using (auth.uid() = user_id);

create policy "Reactions are publicly viewable" on public.poll_reactions for select using (true);
create policy "Users can react" on public.poll_reactions for insert with check (auth.uid() = user_id);
create policy "Users can unreact" on public.poll_reactions for delete using (auth.uid() = user_id);

create policy "Users see own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);
```

**Step 2: Run migration**

```bash
npx supabase db reset
```

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add follows, comments, reactions, and notifications tables"
```

---

### Task 6: Create Database Schema — Communities

**Files:**
- Create: `supabase/migrations/00004_communities.sql`

**Step 1: Write the migration**

```sql
-- Communities
create table public.communities (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  avatar_url text,
  banner_url text,
  category text,
  is_private boolean not null default false,
  member_count integer not null default 0,
  poll_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.communities add constraint slug_format check (slug ~ '^[a-z0-9-]+$');
alter table public.communities add constraint slug_length check (char_length(slug) between 3 and 50);

create trigger communities_updated_at
  before update on public.communities
  for each row execute function public.handle_updated_at();

-- Community members
create type public.community_role as enum ('admin', 'moderator', 'member');

create table public.community_members (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.community_role not null default 'member',
  joined_at timestamptz not null default now()
);

create unique index community_members_unique on public.community_members (community_id, user_id);
create index community_members_user_idx on public.community_members (user_id);
create index community_members_community_idx on public.community_members (community_id);

-- Auto-increment member count
create or replace function public.update_community_member_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.communities set member_count = member_count + 1 where id = new.community_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.communities set member_count = member_count - 1 where id = old.community_id;
    return old;
  end if;
end;
$$ language plpgsql security definer;

create trigger on_member_change
  after insert or delete on public.community_members
  for each row execute function public.update_community_member_count();

-- Add FK from polls to communities
alter table public.polls
  add constraint polls_community_fk
  foreign key (community_id) references public.communities(id) on delete set null;

-- Community rules
create table public.community_rules (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid not null references public.communities(id) on delete cascade,
  title text not null,
  description text not null,
  position integer not null default 0
);

create index community_rules_community_idx on public.community_rules (community_id);

-- RLS
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_rules enable row level security;

-- Public communities visible to all, private only to members
create policy "Public communities are viewable"
  on public.communities for select
  using (
    not is_private
    or exists (select 1 from public.community_members where community_id = id and user_id = auth.uid())
  );

create policy "Authenticated users can create communities"
  on public.communities for insert with check (auth.uid() = creator_id);

create policy "Community admins can update"
  on public.communities for update
  using (
    exists (select 1 from public.community_members where community_id = id and user_id = auth.uid() and role = 'admin')
  );

create policy "Members are viewable in public communities"
  on public.community_members for select using (true);

create policy "Users can join communities"
  on public.community_members for insert with check (auth.uid() = user_id);

create policy "Users can leave communities"
  on public.community_members for delete using (auth.uid() = user_id);

create policy "Admins can manage members"
  on public.community_members for update
  using (
    exists (select 1 from public.community_members cm where cm.community_id = community_id and cm.user_id = auth.uid() and cm.role in ('admin', 'moderator'))
  );

create policy "Rules are viewable" on public.community_rules for select using (true);
create policy "Admins can manage rules"
  on public.community_rules for all
  using (
    exists (select 1 from public.community_members where community_id = community_rules.community_id and user_id = auth.uid() and role = 'admin')
  );

-- Indexes
create index communities_slug_idx on public.communities (slug);
create index communities_category_idx on public.communities (category);
create index communities_creator_idx on public.communities (creator_id);
```

**Step 2: Run migration**

```bash
npx supabase db reset
```

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add communities, members, and rules tables with RLS"
```

---

### Task 7: Create Database Schema — Gamification + Streaks

**Files:**
- Create: `supabase/migrations/00005_gamification.sql`

**Step 1: Write the migration**

```sql
-- Achievements / Badges
create table public.achievements (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  name text not null,
  description text not null,
  icon text not null, -- emoji or icon name
  xp_reward integer not null default 10,
  category text not null default 'general'
);

-- User achievements (join table)
create table public.user_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz not null default now()
);

create unique index user_achievements_unique on public.user_achievements (user_id, achievement_id);
create index user_achievements_user_idx on public.user_achievements (user_id);

-- Voting streaks
create table public.streaks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_vote_date date,
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.streaks enable row level security;

create policy "Achievements are publicly viewable" on public.achievements for select using (true);
create policy "User achievements are publicly viewable" on public.user_achievements for select using (true);
create policy "Streaks are publicly viewable" on public.streaks for select using (true);
create policy "Users update own streak" on public.streaks for update using (auth.uid() = user_id);

-- Seed default achievements
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
```

**Step 2: Run migration**

```bash
npx supabase db reset
```

**Step 3: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add achievements, user_achievements, and streaks tables"
```

---

### Task 8: Generate Supabase TypeScript Types

**Files:**
- Create: `packages/supabase/src/database.types.ts`

**Step 1: Generate types from local Supabase**

```bash
npx supabase gen types typescript --local > packages/supabase/src/database.types.ts
```

**Step 2: Create the Supabase client module**

Create `packages/supabase/src/index.ts`:
```ts
export type { Database } from './database.types';
export { createClient } from './client';
export { createServerClient } from './server';
```

Create `packages/supabase/src/client.ts`:
```ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Create `packages/supabase/src/server.ts`:
```ts
import { createServerClient as createSSRServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './database.types';

export async function createServerClient() {
  const cookieStore = await cookies();

  return createSSRServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can't set cookies in Server Components, only in middleware/route handlers
          }
        },
      },
    }
  );
}
```

**Step 3: Commit**

```bash
git add packages/supabase/
git commit -m "feat: add generated Supabase types and client modules"
```

---

### Task 9: Set Up Supabase Auth Middleware in Next.js

**Files:**
- Create: `apps/web/src/middleware.ts`
- Modify: `apps/web/src/app/layout.tsx`

**Step 1: Create middleware for session refresh**

Create `apps/web/src/middleware.ts`:
```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Step 2: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "feat: add Supabase auth middleware for session refresh"
```

---

### Task 10: Install shadcn/ui + Set Up Design System

**Files:**
- Modify: `apps/web/` (shadcn init + components)

**Step 1: Initialize shadcn/ui**

```bash
cd apps/web
npx shadcn@latest init
```

Choose: New York style, Zinc color, CSS variables.

**Step 2: Add core components**

```bash
npx shadcn@latest add button card dialog dropdown-menu input label tabs avatar badge separator skeleton toast sonner
```

**Step 3: Verify build**

```bash
cd ../..
npm run build
```

**Step 4: Commit**

```bash
git add apps/web/
git commit -m "feat: initialize shadcn/ui with core components"
```

---

### Task 11: Create Shared Zod Validators

**Files:**
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/validators.ts`

**Step 1: Define shared types**

Create `packages/shared/src/types.ts`:
```ts
export type PollType =
  | 'multiple_choice'
  | 'yes_no'
  | 'rating'
  | 'image'
  | 'ranked_choice'
  | 'this_or_that'
  | 'open_ended';

export type PollStatus = 'draft' | 'active' | 'closed';

export type CommunityRole = 'admin' | 'moderator' | 'member';

export type ReactionType = 'like' | 'fire' | 'thinking' | 'laugh' | 'surprise';

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise';

export type NotificationType =
  | 'new_follower'
  | 'poll_vote'
  | 'poll_comment'
  | 'poll_reaction'
  | 'community_invite'
  | 'poll_closed'
  | 'achievement'
  | 'mention';

export const POLL_TYPES: PollType[] = [
  'multiple_choice', 'yes_no', 'rating', 'image',
  'ranked_choice', 'this_or_that', 'open_ended',
];

export const CATEGORIES = [
  'Sports', 'Technology', 'Entertainment', 'Politics', 'Food',
  'Gaming', 'Music', 'Fashion', 'Science', 'Travel',
  'Health', 'Education', 'Business', 'Art', 'Humor', 'Other',
] as const;

export const FREE_COMMUNITY_LIMIT = 3;
```

**Step 2: Define Zod validators**

Create `packages/shared/src/validators.ts`:
```ts
import { z } from 'zod';

export const createPollSchema = z.object({
  type: z.enum([
    'multiple_choice', 'yes_no', 'rating', 'image',
    'ranked_choice', 'this_or_that', 'open_ended',
  ]),
  question: z.string().min(3).max(500),
  description: z.string().max(2000).optional(),
  options: z.array(
    z.object({
      label: z.string().min(1).max(200),
      image_url: z.string().url().optional(),
    })
  ).min(2).max(10),
  is_anonymous: z.boolean().default(false),
  allow_multiple: z.boolean().default(false),
  closes_at: z.string().datetime().optional(),
  category: z.string().optional(),
  tags: z.array(z.string().max(30)).max(5).default([]),
  community_id: z.string().uuid().optional(),
});

export const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(300).optional(),
  website: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  avatar_url: z.string().url().optional(),
});

export const createCommunitySchema = z.object({
  name: z.string().min(3).max(50),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  category: z.string().optional(),
  is_private: z.boolean().default(false),
});

export const createCommentSchema = z.object({
  poll_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
  parent_id: z.string().uuid().optional(),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
```

**Step 3: Verify types compile**

```bash
cd packages/shared && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types and Zod validators for polls, profiles, communities"
```

---

### Task 12: Build Auth Pages (Sign Up / Sign In)

**Files:**
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(auth)/signup/page.tsx`
- Create: `apps/web/src/app/(auth)/layout.tsx`
- Create: `apps/web/src/app/(auth)/auth-form.tsx`

**Step 1: Create auth layout**

Create `apps/web/src/app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
```

**Step 2: Create shared auth form component**

Create `apps/web/src/app/(auth)/auth-form.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@crowdcast/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, display_name: username },
          },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </CardTitle>
        <CardDescription>
          {mode === 'login'
            ? 'Sign in to Crowdcast'
            : 'Join the community and start polling'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="coolpollster"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={30}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? 'Loading...'
              : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>Don&apos;t have an account? <Link href="/signup" className="text-primary hover:underline">Sign up</Link></>
            ) : (
              <>Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link></>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
```

**Step 3: Create login and signup pages**

Create `apps/web/src/app/(auth)/login/page.tsx`:
```tsx
import { AuthForm } from '../auth-form';

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
```

Create `apps/web/src/app/(auth)/signup/page.tsx`:
```tsx
import { AuthForm } from '../auth-form';

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
```

**Step 4: Verify build**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add apps/web/src/app/\(auth\)/
git commit -m "feat: add login and signup pages with Supabase auth"
```

---

### Task 13: Build App Layout Shell (Navbar + Sidebar)

**Files:**
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/components/navbar.tsx`
- Create: `apps/web/src/components/sidebar.tsx`
- Create: `apps/web/src/components/user-menu.tsx`

**Step 1: Build the navbar**

Create `apps/web/src/components/navbar.tsx`:
```tsx
import Link from 'next/link';
import { UserMenu } from './user-menu';

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          Crowdcast
        </Link>
        <div className="flex-1" />
        <UserMenu />
      </div>
    </header>
  );
}
```

**Step 2: Build user menu (client component)**

Create `apps/web/src/components/user-menu.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@crowdcast/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" asChild><Link href="/login">Sign In</Link></Button>
        <Button asChild><Link href="/signup">Sign Up</Link></Button>
      </div>
    );
  }

  const initials = (user.user_metadata?.username || user.email || '?').slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">Settings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={async () => {
          await supabase.auth.signOut();
          router.push('/');
          router.refresh();
        }}>
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Step 3: Build sidebar**

Create `apps/web/src/components/sidebar.tsx`:
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/explore', label: 'Explore', icon: '🔍' },
  { href: '/communities', label: 'Communities', icon: '👥' },
  { href: '/create', label: 'Create Poll', icon: '➕' },
  { href: '/notifications', label: 'Notifications', icon: '🔔' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-56 flex-col gap-1 p-4 border-r min-h-[calc(100vh-3.5rem)]">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent',
            pathname === item.href && 'bg-accent font-medium'
          )}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </aside>
  );
}
```

**Step 4: Create app layout**

Create `apps/web/src/app/(app)/layout.tsx`:
```tsx
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:p-6 max-w-3xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Step 5: Move root page into app group**

Move `apps/web/src/app/page.tsx` to `apps/web/src/app/(app)/page.tsx` and update with a placeholder:
```tsx
export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Your Feed</h1>
      <p className="text-muted-foreground">Polls from people you follow and trending topics will appear here.</p>
    </div>
  );
}
```

**Step 6: Commit**

```bash
git add apps/web/src/
git commit -m "feat: add app shell with navbar, sidebar, and user menu"
```

---

### Task 14: Build Poll Creation Form

**Files:**
- Create: `apps/web/src/app/(app)/create/page.tsx`
- Create: `apps/web/src/app/(app)/create/poll-form.tsx`

**Step 1: Create the poll form client component**

Create `apps/web/src/app/(app)/create/poll-form.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@crowdcast/supabase';
import { createPollSchema, type CreatePollInput, CATEGORIES } from '@crowdcast/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { PollType } from '@crowdcast/shared';

const POLL_TYPE_LABELS: Record<PollType, string> = {
  multiple_choice: 'Multiple Choice',
  yes_no: 'Yes / No',
  rating: 'Rating',
  image: 'Image Poll',
  ranked_choice: 'Ranked Choice',
  this_or_that: 'This or That',
  open_ended: 'Open Ended',
};

export function PollForm() {
  const [type, setType] = useState<PollType>('multiple_choice');
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState([{ label: '' }, { label: '' }]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState('');
  const [closesIn, setClosesIn] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const addOption = () => {
    if (options.length < 10) setOptions([...options, { label: '' }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, label: string) => {
    const updated = [...options];
    updated[index] = { label };
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // For yes/no, auto-set options
      const finalOptions = type === 'yes_no'
        ? [{ label: 'Yes' }, { label: 'No' }]
        : type === 'open_ended'
        ? [{ label: 'Response' }]
        : options;

      let closes_at: string | undefined;
      if (closesIn) {
        const hours = parseInt(closesIn);
        closes_at = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }

      const input = createPollSchema.parse({
        type,
        question,
        description: description || undefined,
        options: finalOptions,
        is_anonymous: isAnonymous,
        closes_at,
        category: category || undefined,
      });

      // Insert poll
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          creator_id: user.id,
          type: input.type,
          question: input.question,
          description: input.description,
          is_anonymous: input.is_anonymous,
          closes_at: input.closes_at,
          category: input.category,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      // Insert options
      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(
          input.options.map((opt, i) => ({
            poll_id: poll.id,
            label: opt.label,
            image_url: opt.image_url,
            position: i,
          }))
        );

      if (optionsError) throw optionsError;

      router.push(`/poll/${poll.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create poll');
    } finally {
      setLoading(false);
    }
  };

  const needsOptions = !['yes_no', 'open_ended'].includes(type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Poll Type Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Poll Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.entries(POLL_TYPE_LABELS) as [PollType, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setType(key)}
                className={`rounded-lg border p-3 text-sm text-left transition-colors ${
                  type === key
                    ? 'border-primary bg-primary/5 font-medium'
                    : 'border-border hover:bg-accent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle>Your Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="What do you want to ask?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              maxLength={500}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea
              id="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Add more context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </div>
        </CardContent>
      </Card>

      {/* Options */}
      {needsOptions && (
        <Card>
          <CardHeader>
            <CardTitle>Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder={`Option ${i + 1}`}
                  value={opt.label}
                  onChange={(e) => updateOption(i, e.target.value)}
                  required
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(i)}
                  >
                    X
                  </Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                + Add Option
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="anonymous">Anonymous voting</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="closes">Auto-close after</Label>
            <select
              id="closes"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={closesIn}
              onChange={(e) => setClosesIn(e.target.value)}
            >
              <option value="">Never</option>
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="168">1 week</option>
              <option value="720">30 days</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Poll'}
      </Button>
    </form>
  );
}
```

**Step 2: Create the page**

Create `apps/web/src/app/(app)/create/page.tsx`:
```tsx
import { PollForm } from './poll-form';

export default function CreatePollPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Create a Poll</h1>
      <PollForm />
    </div>
  );
}
```

**Step 3: Verify build**

```bash
npm run build
```

**Step 4: Commit**

```bash
git add apps/web/src/app/\(app\)/create/
git commit -m "feat: add poll creation form with all poll types"
```

---

### Task 15: Build Poll Detail Page with Voting

**Files:**
- Create: `apps/web/src/app/(app)/poll/[id]/page.tsx`
- Create: `apps/web/src/components/poll-card.tsx`
- Create: `apps/web/src/components/poll-results.tsx`

**Step 1: Create PollResults component (realtime animated bars)**

Create `apps/web/src/components/poll-results.tsx`:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@crowdcast/supabase';

interface PollOption {
  id: string;
  label: string;
  image_url: string | null;
  vote_count: number;
  position: number;
}

export function PollResults({
  pollId,
  options: initialOptions,
  totalVotes: initialTotal,
  userVoteOptionId,
}: {
  pollId: string;
  options: PollOption[];
  totalVotes: number;
  userVoteOptionId: string | null;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [totalVotes, setTotalVotes] = useState(initialTotal);
  const supabase = createClient();

  // Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel(`poll:${pollId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'poll_options',
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as PollOption;
            setOptions((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, vote_count: updated.vote_count } : o))
            );
            setTotalVotes((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pollId]);

  return (
    <div className="space-y-3">
      {options
        .sort((a, b) => a.position - b.position)
        .map((option) => {
          const pct = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;
          const isUserVote = option.id === userVoteOptionId;

          return (
            <div key={option.id} className="relative">
              <div
                className="absolute inset-0 rounded-lg bg-primary/10 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
              <div className={`relative flex items-center justify-between rounded-lg border p-3 ${
                isUserVote ? 'border-primary' : 'border-border'
              }`}>
                <span className="font-medium">
                  {option.label}
                  {isUserVote && <span className="ml-2 text-xs text-primary">Your vote</span>}
                </span>
                <span className="text-sm text-muted-foreground">
                  {pct.toFixed(1)}% ({option.vote_count})
                </span>
              </div>
            </div>
          );
        })}
      <p className="text-sm text-muted-foreground text-center">
        {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
```

**Step 2: Create PollCard component (reusable)**

Create `apps/web/src/components/poll-card.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { createClient } from '@crowdcast/supabase';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PollResults } from './poll-results';
import Link from 'next/link';

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    description: string | null;
    type: string;
    status: string;
    is_anonymous: boolean;
    total_votes: number;
    total_comments: number;
    category: string | null;
    closes_at: string | null;
    created_at: string;
    creator: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      is_verified: boolean;
    };
    options: {
      id: string;
      label: string;
      image_url: string | null;
      vote_count: number;
      position: number;
    }[];
  };
  currentUserId: string | null;
  userVoteOptionId: string | null;
  compact?: boolean;
}

export function PollCard({ poll, currentUserId, userVoteOptionId, compact }: PollCardProps) {
  const [hasVoted, setHasVoted] = useState(!!userVoteOptionId);
  const [votedOptionId, setVotedOptionId] = useState(userVoteOptionId);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleVote = async (optionId: string) => {
    if (hasVoted || !currentUserId || poll.status === 'closed') return;
    setLoading(true);

    const { error } = await supabase
      .from('votes')
      .insert({ poll_id: poll.id, option_id: optionId, user_id: currentUserId });

    if (!error) {
      setHasVoted(true);
      setVotedOptionId(optionId);
    }
    setLoading(false);
  };

  const isClosed = poll.status === 'closed' ||
    (poll.closes_at && new Date(poll.closes_at) < new Date());

  const timeAgo = getTimeAgo(poll.created_at);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Link href={`/user/${poll.creator.username}`}>
            <Avatar className="h-8 w-8">
              <AvatarFallback>{poll.creator.username.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/user/${poll.creator.username}`} className="text-sm font-medium hover:underline">
              {poll.creator.display_name || poll.creator.username}
              {poll.creator.is_verified && <span className="ml-1 text-primary">✓</span>}
            </Link>
            <p className="text-xs text-muted-foreground">@{poll.creator.username} · {timeAgo}</p>
          </div>
          <div className="flex gap-1">
            {poll.category && <Badge variant="secondary">{poll.category}</Badge>}
            {isClosed && <Badge variant="outline">Closed</Badge>}
          </div>
        </div>
        <Link href={`/poll/${poll.id}`}>
          <h3 className="text-lg font-semibold mt-2 hover:underline">{poll.question}</h3>
        </Link>
        {poll.description && !compact && (
          <p className="text-sm text-muted-foreground">{poll.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {hasVoted || isClosed ? (
          <PollResults
            pollId={poll.id}
            options={poll.options}
            totalVotes={poll.total_votes}
            userVoteOptionId={votedOptionId}
          />
        ) : currentUserId ? (
          <div className="space-y-2">
            {poll.options
              .sort((a, b) => a.position - b.position)
              .map((option) => (
                <Button
                  key={option.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => handleVote(option.id)}
                  disabled={loading}
                >
                  {option.label}
                </Button>
              ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-2">Sign in to vote</p>
            <Button asChild variant="outline"><Link href="/login">Sign In</Link></Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground gap-4">
        <Link href={`/poll/${poll.id}`} className="hover:underline">
          {poll.total_comments} comment{poll.total_comments !== 1 ? 's' : ''}
        </Link>
        <span>{poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}</span>
        {poll.closes_at && !isClosed && (
          <span>Closes {getTimeAgo(poll.closes_at)}</span>
        )}
      </CardFooter>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
```

**Step 3: Create poll detail page**

Create `apps/web/src/app/(app)/poll/[id]/page.tsx`:
```tsx
import { createServerClient } from '@crowdcast/supabase';
import { PollCard } from '@/components/poll-card';
import { notFound } from 'next/navigation';

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: poll } = await supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified),
      options:poll_options(*)
    `)
    .eq('id', id)
    .single();

  if (!poll) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  let userVoteOptionId: string | null = null;
  if (user) {
    const { data: vote } = await supabase
      .from('votes')
      .select('option_id')
      .eq('poll_id', id)
      .eq('user_id', user.id)
      .single();
    userVoteOptionId = vote?.option_id ?? null;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PollCard
        poll={{
          ...poll,
          creator: poll.creator as any,
          options: poll.options as any[],
        }}
        currentUserId={user?.id ?? null}
        userVoteOptionId={userVoteOptionId}
      />
      {/* Comments section will be added in Phase 2 */}
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/
git commit -m "feat: add poll detail page with realtime voting and results"
```

---

### Task 16: Build Home Feed Page

**Files:**
- Modify: `apps/web/src/app/(app)/page.tsx`

**Step 1: Build the feed with tabs**

Replace `apps/web/src/app/(app)/page.tsx`:
```tsx
import { createServerClient } from '@crowdcast/supabase';
import { PollCard } from '@/components/poll-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = 'trending' } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified),
      options:poll_options(*)
    `)
    .eq('status', 'active')
    .is('community_id', null);

  if (tab === 'trending') {
    query = query.order('trending_score', { ascending: false }).limit(20);
  } else if (tab === 'latest') {
    query = query.order('created_at', { ascending: false }).limit(20);
  } else if (tab === 'following' && user) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = follows?.map((f) => f.following_id) || [];
    if (followingIds.length > 0) {
      query = query.in('creator_id', followingIds);
    }
    query = query.order('created_at', { ascending: false }).limit(20);
  }

  const { data: polls } = await query;

  // Get user votes for all polls in feed
  let userVotes: Record<string, string> = {};
  if (user && polls?.length) {
    const { data: votes } = await supabase
      .from('votes')
      .select('poll_id, option_id')
      .eq('user_id', user.id)
      .in('poll_id', polls.map((p) => p.id));

    votes?.forEach((v) => { userVotes[v.poll_id] = v.option_id; });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Feed</h1>
        <Button asChild>
          <Link href="/create">Create Poll</Link>
        </Button>
      </div>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="trending" asChild>
            <Link href="/?tab=trending">Trending</Link>
          </TabsTrigger>
          <TabsTrigger value="latest" asChild>
            <Link href="/?tab=latest">Latest</Link>
          </TabsTrigger>
          {user && (
            <TabsTrigger value="following" asChild>
              <Link href="/?tab=following">Following</Link>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {polls && polls.length > 0 ? (
          polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={{
                ...poll,
                creator: poll.creator as any,
                options: poll.options as any[],
              }}
              currentUserId={user?.id ?? null}
              userVoteOptionId={userVotes[poll.id] ?? null}
              compact
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No polls yet. Be the first!</p>
            <Button asChild><Link href="/create">Create a Poll</Link></Button>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(app\)/page.tsx
git commit -m "feat: add home feed with trending, latest, and following tabs"
```

---

### Task 17: Build Explore Page

**Files:**
- Create: `apps/web/src/app/(app)/explore/page.tsx`

**Step 1: Create explore page with category browsing and search**

Create `apps/web/src/app/(app)/explore/page.tsx`:
```tsx
import { createServerClient } from '@crowdcast/supabase';
import { PollCard } from '@/components/poll-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CATEGORIES } from '@crowdcast/shared';
import Link from 'next/link';

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const { category, q } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified),
      options:poll_options(*)
    `)
    .eq('status', 'active')
    .order('trending_score', { ascending: false })
    .limit(30);

  if (category) {
    query = query.eq('category', category);
  }

  if (q) {
    query = query.ilike('question', `%${q}%`);
  }

  const { data: polls } = await query;

  let userVotes: Record<string, string> = {};
  if (user && polls?.length) {
    const { data: votes } = await supabase
      .from('votes')
      .select('poll_id, option_id')
      .eq('user_id', user.id)
      .in('poll_id', polls.map((p) => p.id));
    votes?.forEach((v) => { userVotes[v.poll_id] = v.option_id; });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Explore</h1>

      <form action="/explore" method="GET">
        <Input name="q" placeholder="Search polls..." defaultValue={q} />
      </form>

      <div className="flex flex-wrap gap-2">
        <Link href="/explore">
          <Badge variant={!category ? 'default' : 'secondary'}>All</Badge>
        </Link>
        {CATEGORIES.map((cat) => (
          <Link key={cat} href={`/explore?category=${cat}`}>
            <Badge variant={category === cat ? 'default' : 'secondary'}>{cat}</Badge>
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {polls && polls.length > 0 ? (
          polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={{ ...poll, creator: poll.creator as any, options: poll.options as any[] }}
              currentUserId={user?.id ?? null}
              userVoteOptionId={userVotes[poll.id] ?? null}
              compact
            />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-12">
            No polls found. Try a different search or category.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(app\)/explore/
git commit -m "feat: add explore page with category filtering and search"
```

---

### Task 18: Build User Profile Page

**Files:**
- Create: `apps/web/src/app/(app)/user/[username]/page.tsx`
- Create: `apps/web/src/app/(app)/profile/page.tsx`

**Step 1: Create public user profile page**

Create `apps/web/src/app/(app)/user/[username]/page.tsx`:
```tsx
import { createServerClient } from '@crowdcast/supabase';
import { PollCard } from '@/components/poll-card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) notFound();

  // Get follower/following counts
  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ]);

  // Check if current user follows this profile
  let isFollowing = false;
  if (user && user.id !== profile.id) {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .single();
    isFollowing = !!data;
  }

  // Get user's polls
  const { data: polls } = await supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified),
      options:poll_options(*)
    `)
    .eq('creator_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get achievements
  const { data: achievements } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', profile.id);

  let userVotes: Record<string, string> = {};
  if (user && polls?.length) {
    const { data: votes } = await supabase
      .from('votes')
      .select('poll_id, option_id')
      .eq('user_id', user.id)
      .in('poll_id', polls.map((p) => p.id));
    votes?.forEach((v) => { userVotes[v.poll_id] = v.option_id; });
  }

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-2xl">
            {profile.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            {profile.is_verified && <Badge variant="default">Verified</Badge>}
            <Badge variant="outline">Lv. {profile.level}</Badge>
          </div>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-2">{profile.bio}</p>}
          <div className="flex gap-4 mt-3 text-sm">
            <span><strong>{followerCount ?? 0}</strong> followers</span>
            <span><strong>{followingCount ?? 0}</strong> following</span>
            <span><strong>{profile.xp}</strong> XP</span>
          </div>
        </div>
        {user && user.id !== profile.id && (
          <form action={`/api/follow`} method="POST">
            <input type="hidden" name="targetId" value={profile.id} />
            <input type="hidden" name="action" value={isFollowing ? 'unfollow' : 'follow'} />
            <Button variant={isFollowing ? 'outline' : 'default'}>
              {isFollowing ? 'Following' : 'Follow'}
            </Button>
          </form>
        )}
      </div>

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {achievements.map((ua: any) => (
              <Badge key={ua.id} variant="secondary" title={ua.achievement.description}>
                {ua.achievement.icon} {ua.achievement.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* User's polls */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Polls</h2>
        <div className="space-y-4">
          {polls && polls.length > 0 ? (
            polls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={{ ...poll, creator: poll.creator as any, options: poll.options as any[] }}
                currentUserId={user?.id ?? null}
                userVoteOptionId={userVotes[poll.id] ?? null}
                compact
              />
            ))
          ) : (
            <p className="text-muted-foreground">No polls yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create profile redirect (own profile)**

Create `apps/web/src/app/(app)/profile/page.tsx`:
```tsx
import { createServerClient } from '@crowdcast/supabase';
import { redirect } from 'next/navigation';

export default async function MyProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();

  if (profile) redirect(`/user/${profile.username}`);
  redirect('/');
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/user/ apps/web/src/app/\(app\)/profile/
git commit -m "feat: add user profile page with stats, badges, and polls"
```

---

### Task 19: Build Communities List + Detail Pages

**Files:**
- Create: `apps/web/src/app/(app)/communities/page.tsx`
- Create: `apps/web/src/app/(app)/community/[slug]/page.tsx`

**Step 1: Communities listing page**

Create `apps/web/src/app/(app)/communities/page.tsx`:
```tsx
import { createServerClient } from '@crowdcast/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

export default async function CommunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('communities')
    .select('*')
    .eq('is_private', false)
    .order('member_count', { ascending: false })
    .limit(30);

  if (q) {
    query = query.ilike('name', `%${q}%`);
  }

  const { data: communities } = await query;

  // Get user's communities
  let myCommunities: string[] = [];
  if (user) {
    const { data } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('user_id', user.id);
    myCommunities = data?.map((m) => m.community_id) || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Communities</h1>
        {user && (
          <Button asChild>
            <Link href="/communities/create">Create Community</Link>
          </Button>
        )}
      </div>

      <form action="/communities" method="GET">
        <Input name="q" placeholder="Search communities..." defaultValue={q} />
      </form>

      <div className="grid gap-4 sm:grid-cols-2">
        {communities?.map((community) => (
          <Link key={community.id} href={`/community/${community.slug}`}>
            <Card className="hover:bg-accent/50 transition-colors h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{community.name}</CardTitle>
                  {community.is_private && <Badge variant="outline">Private</Badge>}
                </div>
                {community.category && (
                  <Badge variant="secondary">{community.category}</Badge>
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {community.description || 'No description'}
                </p>
                <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                  <span>{community.member_count} members</span>
                  <span>{community.poll_count} polls</span>
                </div>
                {myCommunities.includes(community.id) && (
                  <Badge variant="default" className="mt-2">Joined</Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {(!communities || communities.length === 0) && (
        <p className="text-center text-muted-foreground py-12">
          No communities found. Create the first one!
        </p>
      )}
    </div>
  );
}
```

**Step 2: Community detail page**

Create `apps/web/src/app/(app)/community/[slug]/page.tsx`:
```tsx
import { createServerClient } from '@crowdcast/supabase';
import { PollCard } from '@/components/poll-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!community) notFound();

  // Check membership
  let isMember = false;
  let memberRole: string | null = null;
  if (user) {
    const { data } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .single();
    isMember = !!data;
    memberRole = data?.role ?? null;
  }

  // Get community polls
  const { data: polls } = await supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified),
      options:poll_options(*)
    `)
    .eq('community_id', community.id)
    .order('created_at', { ascending: false })
    .limit(20);

  let userVotes: Record<string, string> = {};
  if (user && polls?.length) {
    const { data: votes } = await supabase
      .from('votes')
      .select('poll_id, option_id')
      .eq('user_id', user.id)
      .in('poll_id', polls.map((p) => p.id));
    votes?.forEach((v) => { userVotes[v.poll_id] = v.option_id; });
  }

  // Get rules
  const { data: rules } = await supabase
    .from('community_rules')
    .select('*')
    .eq('community_id', community.id)
    .order('position');

  return (
    <div className="space-y-6">
      {/* Community header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{community.name}</h1>
            <p className="text-muted-foreground">/{community.slug}</p>
          </div>
          {user && !isMember && (
            <form action="/api/community/join" method="POST">
              <input type="hidden" name="communityId" value={community.id} />
              <Button>Join Community</Button>
            </form>
          )}
          {isMember && (
            <div className="flex gap-2">
              <Badge variant="default">{memberRole}</Badge>
              {(memberRole === 'admin' || memberRole === 'moderator') && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/community/${slug}/settings`}>Settings</Link>
                </Button>
              )}
            </div>
          )}
        </div>
        {community.description && <p>{community.description}</p>}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{community.member_count} members</span>
          <span>{community.poll_count} polls</span>
          {community.category && <Badge variant="secondary">{community.category}</Badge>}
        </div>
      </div>

      {/* Rules */}
      {rules && rules.length > 0 && (
        <details className="border rounded-lg p-4">
          <summary className="font-medium cursor-pointer">Community Rules</summary>
          <ol className="mt-2 space-y-2 list-decimal list-inside text-sm">
            {rules.map((rule: any) => (
              <li key={rule.id}>
                <strong>{rule.title}</strong>: {rule.description}
              </li>
            ))}
          </ol>
        </details>
      )}

      {/* Create poll for community */}
      {isMember && (
        <Button asChild>
          <Link href={`/create?community=${community.id}`}>Create Poll in {community.name}</Link>
        </Button>
      )}

      {/* Polls */}
      <div className="space-y-4">
        {polls && polls.length > 0 ? (
          polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={{ ...poll, creator: poll.creator as any, options: poll.options as any[] }}
              currentUserId={user?.id ?? null}
              userVoteOptionId={userVotes[poll.id] ?? null}
              compact
            />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No polls in this community yet.
          </p>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/\(app\)/communities/ apps/web/src/app/\(app\)/community/
git commit -m "feat: add communities listing and detail pages"
```

---

### Task 20: Build API Routes (Follow, Vote, Community Join)

**Files:**
- Create: `apps/web/src/app/api/follow/route.ts`
- Create: `apps/web/src/app/api/community/join/route.ts`

**Step 1: Follow/unfollow API**

Create `apps/web/src/app/api/follow/route.ts`:
```ts
import { createServerClient } from '@crowdcast/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const targetId = formData.get('targetId') as string;
  const action = formData.get('action') as string;

  if (!targetId) {
    return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
  }

  if (action === 'unfollow') {
    await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetId);
  } else {
    await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetId });
  }

  return NextResponse.redirect(new URL(request.headers.get('referer') || '/', request.url));
}
```

**Step 2: Community join API**

Create `apps/web/src/app/api/community/join/route.ts`:
```ts
import { createServerClient } from '@crowdcast/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const communityId = formData.get('communityId') as string;

  if (!communityId) {
    return NextResponse.json({ error: 'Missing communityId' }, { status: 400 });
  }

  await supabase
    .from('community_members')
    .insert({
      community_id: communityId,
      user_id: user.id,
      role: 'member',
    });

  return NextResponse.redirect(new URL(request.headers.get('referer') || '/', request.url));
}
```

**Step 3: Commit**

```bash
git add apps/web/src/app/api/
git commit -m "feat: add follow and community join API routes"
```

---

## Phase 2: Social Layer — Comments, Reactions, Notifications (Outline)

### Task 21: Comment System
- Create `apps/web/src/components/comments.tsx` — threaded comment component
- Create `apps/web/src/app/api/comments/route.ts` — CRUD comments
- Add realtime subscription for live comment updates
- Add to poll detail page

### Task 22: Reaction System
- Create `apps/web/src/components/reactions.tsx` — emoji reaction bar
- Create `apps/web/src/app/api/reactions/route.ts` — toggle reactions
- Show reaction counts on poll cards

### Task 23: Notification System
- Create `apps/web/src/app/(app)/notifications/page.tsx`
- Create Edge Function to generate notifications on follow/vote/comment
- Add notification bell with unread count in navbar
- Realtime subscription for live notification updates

### Task 24: Follow System Enhancement
- Client-side follow/unfollow button with optimistic updates
- "Following" tab on home feed populated correctly
- Follower/following lists on profile page

### Task 25: Profile Editing
- Create `apps/web/src/app/(app)/settings/page.tsx`
- Edit display name, bio, website, location
- Avatar upload to Supabase Storage
- Account settings (email, password change)

### Task 26: Community Creation Form
- Create `apps/web/src/app/(app)/communities/create/page.tsx`
- Enforce free community limit (3)
- Slug auto-generation from name
- Community settings page for admins

---

## Phase 3-8: High-Level Roadmap

### Phase 3: Discovery + Gamification
- Trending algorithm (Edge Function, runs on cron)
- Daily Poll feature
- Search with full-text search (pg_trgm)
- Voting streaks (Edge Function tracks daily)
- Badge/achievement auto-granting
- Leaderboard page
- XP and level progression

### Phase 4: Premium + Billing
- Stripe subscription integration
- Pricing page
- Tier gating middleware (check subscription before premium features)
- Advanced poll types (tournament brackets, branching)
- Advanced analytics dashboard
- Poll scheduling
- CSV/PDF export
- Custom branding on polls

### Phase 5: Marketplace
- Stripe Connect onboarding for creators
- Marketplace listing page
- Poll template system
- Theme system for polls
- Community access passes (paid memberships)
- Creator dashboard (earnings, sales)
- Payout management

### Phase 6: Mobile App
- Expo React Native setup in `apps/mobile/`
- Shared packages integration (supabase, shared)
- NativeWind styling
- Core screens: Feed, Create, Profile, Communities, Explore
- Push notifications via Expo
- Deep linking
- App Store / Play Store submission

### Phase 7: Polish + Launch
- OG image generation (Edge Function + Satori)
- SEO optimization (meta tags, sitemap, structured data)
- Error boundaries and loading states
- Rate limiting
- Content moderation (basic profanity filter)
- PostHog analytics integration
- Performance optimization (image lazy-loading, infinite scroll)
- Landing page / marketing site
