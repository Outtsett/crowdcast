-- ============================================================
-- Migration 00010: Poll Visibility & Invites
-- Adds private, unlisted, and community-only poll support
-- ============================================================

-- 1. Add visibility column to polls
alter table public.polls
  add column visibility text not null default 'public'
  check (visibility in ('public', 'private', 'unlisted', 'community'));

create index polls_visibility_idx on public.polls (visibility);

-- 2. Poll invites table (for private polls)
create table public.poll_invites (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index poll_invites_poll_id_idx on public.poll_invites (poll_id);
create index poll_invites_user_id_idx on public.poll_invites (user_id);
create index poll_invites_status_idx on public.poll_invites (status);

alter table public.poll_invites enable row level security;

-- Invite policies
create policy "Users can see their own invites"
  on public.poll_invites for select
  using (auth.uid() = user_id or auth.uid() = invited_by);

create policy "Poll owners can see all invites for their polls"
  on public.poll_invites for select
  using (exists (
    select 1 from public.polls where id = poll_id and creator_id = auth.uid()
  ));

create policy "Poll owners can create invites"
  on public.poll_invites for insert
  with check (exists (
    select 1 from public.polls where id = poll_id and creator_id = auth.uid()
  ));

create policy "Poll owners can delete invites"
  on public.poll_invites for delete
  using (exists (
    select 1 from public.polls where id = poll_id and creator_id = auth.uid()
  ));

create policy "Invited users can update their invite status"
  on public.poll_invites for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Helper function: can the current user view a poll?
create or replace function public.can_view_poll(p public.polls)
returns boolean as $$
begin
  -- Public & unlisted polls are always viewable
  if p.visibility in ('public', 'unlisted') then
    return true;
  end if;

  -- Poll creator can always view their own poll
  if p.creator_id = auth.uid() then
    return true;
  end if;

  -- Private polls: creator + invited users
  if p.visibility = 'private' then
    return exists (
      select 1 from public.poll_invites
      where poll_id = p.id
        and user_id = auth.uid()
        and status in ('pending', 'accepted')
    );
  end if;

  -- Community polls: community members only
  if p.visibility = 'community' then
    return exists (
      select 1 from public.community_members
      where community_id = p.community_id
        and user_id = auth.uid()
    );
  end if;

  return false;
end;
$$ language plpgsql stable security definer;

-- 4. Replace the old "publicly viewable" poll policies with visibility-aware ones
drop policy if exists "Polls are publicly viewable" on public.polls;

create policy "Users can view polls based on visibility"
  on public.polls for select
  using (public.can_view_poll(polls));

-- Also update poll_options to respect poll visibility
drop policy if exists "Poll options are publicly viewable" on public.poll_options;

create policy "Poll options follow poll visibility"
  on public.poll_options for select
  using (exists (
    select 1 from public.polls p
    where p.id = poll_id
      and public.can_view_poll(p)
  ));

-- Also gate votes viewing to visible polls
drop policy if exists "Users can see all votes" on public.votes;

create policy "Votes follow poll visibility"
  on public.votes for select
  using (exists (
    select 1 from public.polls p
    where p.id = poll_id
      and public.can_view_poll(p)
  ));

-- 5. Notification for poll invites
-- If notifications table exists, create an insert trigger
create or replace function public.notify_poll_invite()
returns trigger as $$
begin
  insert into public.notifications (user_id, type, data)
  values (
    new.user_id,
    'community_invite',
    jsonb_build_object(
      'poll_id', new.poll_id,
      'invited_by', new.invited_by
    )
  );
  return new;
exception
  when undefined_table then
    return new;
end;
$$ language plpgsql security definer;

create trigger on_poll_invite_created
  after insert on public.poll_invites
  for each row execute function public.notify_poll_invite();
