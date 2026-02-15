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

create table public.poll_comments (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.poll_comments(id) on delete cascade,
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

create or replace function public.increment_comment_count()
returns trigger as $$
begin
  update public.polls set total_comments = total_comments + 1 where id = new.poll_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_comment_created
  after insert on public.poll_comments
  for each row execute function public.increment_comment_count();

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
  data jsonb default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, is_read, created_at desc);

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
