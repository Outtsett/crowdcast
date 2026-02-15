create extension if not exists "uuid-ossp";

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

alter table public.profiles add constraint username_length check (char_length(username) between 3 and 30);
alter table public.profiles add constraint username_format check (username ~ '^[a-zA-Z0-9_]+$');

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

alter table public.profiles enable row level security;

create policy "Profiles are publicly viewable"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create index profiles_username_idx on public.profiles (username);
create index profiles_subscription_tier_idx on public.profiles (subscription_tier);
