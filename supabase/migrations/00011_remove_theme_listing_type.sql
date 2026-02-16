-- Remove 'theme' as an exchange listing type.
-- Themes are now free built-in color schemes, not sellable items.

-- First deactivate any existing theme listings
update public.exchange_listings
  set is_active = false
  where type = 'theme';

-- Update the check constraint to only allow template, access_pass, report
-- (Need to handle both old table name and new table name in case migration 00009 hasn't run)
do $$
begin
  -- Try exchange_listings first (renamed table)
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'exchange_listings'
  ) then
    alter table public.exchange_listings
      drop constraint if exists marketplace_items_type_check;
    alter table public.exchange_listings
      drop constraint if exists exchange_listings_type_check;
    alter table public.exchange_listings
      add constraint exchange_listings_type_check
      check (type in ('template', 'access_pass', 'report'));
  end if;

  -- Also handle marketplace_items if it still exists (old name)
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'marketplace_items'
  ) then
    alter table public.marketplace_items
      drop constraint if exists marketplace_items_type_check;
    alter table public.marketplace_items
      add constraint marketplace_items_type_check
      check (type in ('template', 'access_pass', 'report'));
  end if;
end $$;
