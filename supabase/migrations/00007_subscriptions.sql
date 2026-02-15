-- Subscriptions table for Stripe integration
create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  tier text not null default 'free' check (tier in ('free', 'pro', 'business', 'enterprise')),
  status text not null default 'active' check (status in ('active', 'canceled', 'past_due', 'trialing')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_user_idx on public.subscriptions (user_id);
create index subscriptions_stripe_idx on public.subscriptions (stripe_subscription_id);

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.handle_updated_at();

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);

-- Marketplace items table
create table public.marketplace_items (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('template', 'theme', 'access_pass', 'report')),
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 100), -- minimum $1
  preview_url text,
  data jsonb default '{}', -- template data, theme colors, etc.
  is_active boolean not null default true,
  purchase_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index marketplace_items_creator_idx on public.marketplace_items (creator_id);
create index marketplace_items_type_idx on public.marketplace_items (type);
create index marketplace_items_active_idx on public.marketplace_items (is_active, type);

create trigger marketplace_items_updated_at
  before update on public.marketplace_items
  for each row execute function public.handle_updated_at();

alter table public.marketplace_items enable row level security;

create policy "Active items are viewable"
  on public.marketplace_items for select using (is_active or creator_id = auth.uid());

create policy "Creators can manage own items"
  on public.marketplace_items for insert with check (auth.uid() = creator_id);

create policy "Creators can update own items"
  on public.marketplace_items for update using (auth.uid() = creator_id);

-- Marketplace purchases
create table public.marketplace_purchases (
  id uuid primary key default uuid_generate_v4(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.marketplace_items(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  stripe_payment_intent_id text,
  amount_cents integer not null,
  platform_fee_cents integer not null, -- 15% commission
  seller_amount_cents integer not null, -- 85% to creator
  status text not null default 'completed' check (status in ('pending', 'completed', 'refunded')),
  created_at timestamptz not null default now()
);

create index purchases_buyer_idx on public.marketplace_purchases (buyer_id);
create index purchases_seller_idx on public.marketplace_purchases (seller_id);
create index purchases_item_idx on public.marketplace_purchases (item_id);

alter table public.marketplace_purchases enable row level security;

create policy "Buyers can view own purchases"
  on public.marketplace_purchases for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Increment purchase count trigger
create or replace function public.increment_purchase_count()
returns trigger as $$
begin
  update public.marketplace_items
    set purchase_count = purchase_count + 1
    where id = new.item_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_purchase_created
  after insert on public.marketplace_purchases
  for each row execute function public.increment_purchase_count();

-- Creator payouts tracking
create table public.creator_payouts (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  stripe_transfer_id text,
  amount_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now()
);

create index payouts_creator_idx on public.creator_payouts (creator_id);

alter table public.creator_payouts enable row level security;

create policy "Creators can view own payouts"
  on public.creator_payouts for select using (auth.uid() = creator_id);

-- Add stripe_connect_account_id to profiles
alter table public.profiles add column if not exists stripe_connect_account_id text;
