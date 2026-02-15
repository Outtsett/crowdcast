-- Seed data for development

-- Note: In local dev, auth.users are created via the Supabase dashboard or auth API.
-- This seed assumes some users already exist. Run after creating test users.

-- Example: Insert some test communities (after creating users manually)
-- insert into public.communities (creator_id, name, slug, description, category, is_private)
-- values
--   ('<user-id>', 'Tech Talk', 'tech-talk', 'Polls about technology, software, and gadgets', 'Technology', false),
--   ('<user-id>', 'Sports Arena', 'sports-arena', 'All things sports - from football to esports', 'Sports', false),
--   ('<user-id>', 'Foodies Unite', 'foodies-unite', 'The best food debates and recommendations', 'Food', false),
--   ('<user-id>', 'Gaming Hub', 'gaming-hub', 'Game reviews, opinions, and community votes', 'Gaming', false);

-- Daily poll setup (when you have polls)
-- insert into public.daily_polls (poll_id, featured_date) values ('<poll-id>', current_date);
