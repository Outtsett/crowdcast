export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { MarketplaceItemForm } from './item-form';

export default async function CreateMarketplaceItemPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-3xl font-bold">List on Marketplace</h1>
      <p className="text-muted-foreground">
        Sell poll templates, themes, community access passes, or reports.
        You keep 85% of every sale.
      </p>
      <MarketplaceItemForm userId={user.id} />
    </div>
  );
}
