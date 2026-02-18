-- ============================================================
-- Seed data for local development.
-- Run via: supabase db reset  (applies migrations + seed.sql)
-- ============================================================

-- Create two test users in auth.users (Supabase local-dev only).
-- The handle_new_user() trigger auto-creates matching profiles.
insert into auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'alice@example.com',
   '{"username":"alice","display_name":"Alice Tester"}'::jsonb,
   now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),

  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'bob@example.com',
   '{"username":"bob","display_name":"Bob Voter"}'::jsonb,
   now(), now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

-- ---- Communities ----
insert into public.communities (id, creator_id, name, slug, description, category, is_private)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc01',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Tech Talk', 'tech-talk', 'Polls about technology, software, and gadgets', 'Technology', false),

  ('cccccccc-cccc-cccc-cccc-cccccccccc02',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Sports Arena', 'sports-arena', 'All things sports — from football to esports', 'Sports', false);

-- Add both users as members
insert into public.community_members (community_id, user_id, role)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'member'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin');

-- ---- Polls ----
insert into public.polls (id, creator_id, type, question, description, category, status)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd01',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'multiple_choice',
   'Best programming language for 2026?',
   'Cast your vote — the crowd decides.',
   'Technology', 'active'),

  ('dddddddd-dddd-dddd-dddd-dddddddddd02',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'yes_no',
   'Should AI-generated art be in museums?',
   'A cultural debate for the ages.',
   'Culture', 'active'),

  ('dddddddd-dddd-dddd-dddd-dddddddddd03',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'this_or_that',
   'Coffee or Tea?',
   null,
   'Lifestyle', 'active');

-- Options for the multiple choice poll
insert into public.poll_options (id, poll_id, label, position)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee01', 'dddddddd-dddd-dddd-dddd-dddddddddd01', 'Rust',       0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02', 'dddddddd-dddd-dddd-dddd-dddddddddd01', 'TypeScript', 1),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee03', 'dddddddd-dddd-dddd-dddd-dddddddddd01', 'Python',     2),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee04', 'dddddddd-dddd-dddd-dddd-dddddddddd01', 'Go',         3);

-- Options for the yes/no poll
insert into public.poll_options (id, poll_id, label, position)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee05', 'dddddddd-dddd-dddd-dddd-dddddddddd02', 'Yes', 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee06', 'dddddddd-dddd-dddd-dddd-dddddddddd02', 'No',  1);

-- Options for this-or-that
insert into public.poll_options (id, poll_id, label, position)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee07', 'dddddddd-dddd-dddd-dddd-dddddddddd03', 'Coffee ☕', 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee08', 'dddddddd-dddd-dddd-dddd-dddddddddd03', 'Tea 🍵',   1);

-- Bob votes on the programming language poll
insert into public.votes (poll_id, option_id, user_id, latitude, longitude, country_code)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd01',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeee02',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   40.7, -74.0, 'US');

-- ---- Social ----
-- Bob follows Alice
insert into public.follows (follower_id, following_id)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

-- Bob leaves a comment on the AI art poll
insert into public.poll_comments (poll_id, user_id, body)
values ('dddddddd-dddd-dddd-dddd-dddddddddd02', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Great question! I think context matters a lot.');

-- ---- Streaks ----
insert into public.streaks (user_id, current_streak, longest_streak, last_vote_date)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 3, 7, current_date - 1),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 1, 1, current_date);
