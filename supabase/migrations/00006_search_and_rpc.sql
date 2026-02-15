-- Full-text search index on polls
alter table public.polls add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(question, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

create index polls_search_idx on public.polls using gin (search_vector);

-- Full-text search on communities
alter table public.communities add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored;

create index communities_search_idx on public.communities using gin (search_vector);

-- Full-text search on profiles
alter table public.profiles add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(username, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(display_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(bio, '')), 'C')
  ) stored;

create index profiles_search_idx on public.profiles using gin (search_vector);

-- RPC: Increment XP and handle leveling
create or replace function public.increment_xp(user_id_input uuid, xp_amount integer)
returns void as $$
declare
  new_xp integer;
  new_level integer;
begin
  update public.profiles
    set xp = xp + xp_amount
    where id = user_id_input
    returning xp into new_xp;

  -- Level formula: level = floor(sqrt(xp / 100)) + 1
  new_level := greatest(1, floor(sqrt(new_xp::float / 100.0))::integer + 1);

  update public.profiles
    set level = new_level
    where id = user_id_input;
end;
$$ language plpgsql security definer;

-- RPC: Search polls
create or replace function public.search_polls(search_query text, result_limit integer default 20)
returns setof public.polls as $$
begin
  return query
    select *
    from public.polls
    where search_vector @@ plainto_tsquery('english', search_query)
      and status = 'active'
    order by ts_rank(search_vector, plainto_tsquery('english', search_query)) desc
    limit result_limit;
end;
$$ language plpgsql stable;

-- RPC: Search communities
create or replace function public.search_communities(search_query text, result_limit integer default 20)
returns setof public.communities as $$
begin
  return query
    select *
    from public.communities
    where search_vector @@ plainto_tsquery('english', search_query)
      and not is_private
    order by ts_rank(search_vector, plainto_tsquery('english', search_query)) desc
    limit result_limit;
end;
$$ language plpgsql stable;

-- RPC: Search users
create or replace function public.search_users(search_query text, result_limit integer default 20)
returns setof public.profiles as $$
begin
  return query
    select *
    from public.profiles
    where search_vector @@ plainto_tsquery('english', search_query)
    order by ts_rank(search_vector, plainto_tsquery('english', search_query)) desc
    limit result_limit;
end;
$$ language plpgsql stable;

-- Daily poll feature: table to track featured polls
create table if not exists public.daily_polls (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  featured_date date unique not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.daily_polls enable row level security;
create policy "Daily polls are viewable" on public.daily_polls for select using (true);

create index daily_polls_date_idx on public.daily_polls (featured_date desc);
