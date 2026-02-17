-- Add geolocation fields to votes for the 3D globe feature.
-- We store approximate lat/lng (city-level, never street-level) and country code.
-- The data is captured from request headers (Vercel/Cloudflare geo headers) at vote time.

alter table public.votes
  add column latitude double precision,
  add column longitude double precision,
  add column country_code text;

-- Index for efficient geo queries
create index votes_geo_idx on public.votes (latitude, longitude)
  where latitude is not null and longitude is not null;

create index votes_country_idx on public.votes (country_code)
  where country_code is not null;

-- Aggregate view for poll-level geo stats (avoids exposing individual vote locations)
create or replace view public.poll_vote_locations as
select
  poll_id,
  round(latitude::numeric, 1) as lat,
  round(longitude::numeric, 1) as lng,
  country_code,
  count(*) as vote_count
from public.votes
where latitude is not null and longitude is not null
group by poll_id, round(latitude::numeric, 1), round(longitude::numeric, 1), country_code;

-- Global aggregate view (all polls combined)
create or replace view public.global_vote_locations as
select
  round(latitude::numeric, 1) as lat,
  round(longitude::numeric, 1) as lng,
  country_code,
  count(*) as vote_count
from public.votes
where latitude is not null and longitude is not null
group by round(latitude::numeric, 1), round(longitude::numeric, 1), country_code;

-- RLS: views inherit the underlying table's RLS, votes are already publicly readable
