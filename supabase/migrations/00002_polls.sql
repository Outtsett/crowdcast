create type public.poll_type as enum (
  'multiple_choice', 'yes_no', 'rating', 'image',
  'ranked_choice', 'this_or_that', 'open_ended'
);

create type public.poll_status as enum ('draft', 'active', 'closed');

create table public.polls (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  community_id uuid,
  type public.poll_type not null default 'multiple_choice',
  status public.poll_status not null default 'active',
  question text not null,
  description text,
  is_anonymous boolean not null default false,
  allow_multiple boolean not null default false,
  closes_at timestamptz,
  total_votes integer not null default 0,
  total_comments integer not null default 0,
  category text,
  tags text[] default '{}',
  trending_score float not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.poll_options (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  label text not null,
  image_url text,
  position integer not null default 0,
  vote_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  option_id uuid not null references public.poll_options(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank_position integer,
  rating_value integer check (rating_value between 1 and 10),
  text_response text,
  created_at timestamptz not null default now()
);

create unique index votes_unique_user_poll
  on public.votes (user_id, poll_id)
  where rank_position is null;

create unique index votes_unique_ranked
  on public.votes (user_id, poll_id, rank_position)
  where rank_position is not null;

create trigger polls_updated_at
  before update on public.polls
  for each row execute function public.handle_updated_at();

create or replace function public.increment_vote_count()
returns trigger as $$
begin
  update public.poll_options set vote_count = vote_count + 1 where id = new.option_id;
  update public.polls set total_votes = total_votes + 1 where id = new.poll_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_vote_created
  after insert on public.votes
  for each row execute function public.increment_vote_count();

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes enable row level security;

create policy "Polls are publicly viewable" on public.polls for select using (true);
create policy "Authenticated users can create polls" on public.polls for insert with check (auth.uid() = creator_id);
create policy "Poll owners can update their polls" on public.polls for update using (auth.uid() = creator_id);
create policy "Poll owners can delete their polls" on public.polls for delete using (auth.uid() = creator_id);

create policy "Poll options are publicly viewable" on public.poll_options for select using (true);
create policy "Poll owners can manage options" on public.poll_options for insert
  with check (exists (select 1 from public.polls where id = poll_id and creator_id = auth.uid()));

create policy "Users can see all votes" on public.votes for select using (true);
create policy "Authenticated users can vote" on public.votes for insert with check (auth.uid() = user_id);

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
