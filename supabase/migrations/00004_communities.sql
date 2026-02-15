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

alter table public.polls
  add constraint polls_community_fk
  foreign key (community_id) references public.communities(id) on delete set null;

create table public.community_rules (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid not null references public.communities(id) on delete cascade,
  title text not null,
  description text not null,
  position integer not null default 0
);

create index community_rules_community_idx on public.community_rules (community_id);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_rules enable row level security;

create policy "Public communities are viewable"
  on public.communities for select
  using (not is_private or exists (select 1 from public.community_members where community_id = id and user_id = auth.uid()));

create policy "Authenticated users can create communities"
  on public.communities for insert with check (auth.uid() = creator_id);

create policy "Community admins can update"
  on public.communities for update
  using (exists (select 1 from public.community_members where community_id = id and user_id = auth.uid() and role = 'admin'));

create policy "Members are viewable" on public.community_members for select using (true);
create policy "Users can join communities" on public.community_members for insert with check (auth.uid() = user_id);
create policy "Users can leave communities" on public.community_members for delete using (auth.uid() = user_id);
create policy "Admins can manage members"
  on public.community_members for update
  using (exists (select 1 from public.community_members cm where cm.community_id = community_id and cm.user_id = auth.uid() and cm.role in ('admin', 'moderator')));

create policy "Rules are viewable" on public.community_rules for select using (true);

create index communities_slug_idx on public.communities (slug);
create index communities_category_idx on public.communities (category);
create index communities_creator_idx on public.communities (creator_id);
