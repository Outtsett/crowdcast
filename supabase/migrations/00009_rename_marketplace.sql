-- Rename marketplace tables to exchange tables
-- =============================================

-- 1. Drop dependent objects first (trigger + function referencing old tables)
drop trigger if exists on_purchase_created on public.marketplace_purchases;
drop trigger if exists marketplace_items_updated_at on public.marketplace_items;

-- 2. Rename tables
alter table public.marketplace_items rename to exchange_listings;
alter table public.marketplace_purchases rename to exchange_purchases;

-- 3. Rename indexes
alter index marketplace_items_creator_idx rename to exchange_listings_creator_idx;
alter index marketplace_items_type_idx rename to exchange_listings_type_idx;
alter index marketplace_items_active_idx rename to exchange_listings_active_idx;
alter index purchases_buyer_idx rename to exchange_purchases_buyer_idx;
alter index purchases_seller_idx rename to exchange_purchases_seller_idx;
alter index purchases_item_idx rename to exchange_purchases_item_idx;

-- 4. Drop old RLS policies and recreate on renamed tables
drop policy if exists "Active items are viewable" on public.exchange_listings;
drop policy if exists "Creators can manage own items" on public.exchange_listings;
drop policy if exists "Creators can update own items" on public.exchange_listings;
drop policy if exists "Buyers can view own purchases" on public.exchange_purchases;

create policy "Active listings are viewable"
  on public.exchange_listings for select using (is_active or creator_id = auth.uid());

create policy "Creators can manage own listings"
  on public.exchange_listings for insert with check (auth.uid() = creator_id);

create policy "Creators can update own listings"
  on public.exchange_listings for update using (auth.uid() = creator_id);

create policy "Buyers and sellers can view purchases"
  on public.exchange_purchases for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- 5. Recreate updated_at trigger on renamed table
create trigger exchange_listings_updated_at
  before update on public.exchange_listings
  for each row execute function public.handle_updated_at();

-- 6. Recreate purchase count functions referencing new table names
create or replace function public.increment_purchase_count()
returns trigger as $$
begin
  update public.exchange_listings
    set purchase_count = purchase_count + 1
    where id = new.item_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_purchase_created
  after insert on public.exchange_purchases
  for each row execute function public.increment_purchase_count();

-- 7. Add audience category column to exchange_listings
alter table public.exchange_listings
  add column category text not null default 'other'
  check (category in (
    'business', 'friends', 'family', 'local', 'education',
    'sports', 'entertainment', 'food', 'tech', 'health',
    'politics', 'other'
  ));

create index exchange_listings_category_idx on public.exchange_listings (category);
