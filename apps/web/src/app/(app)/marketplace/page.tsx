export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

const TYPE_LABELS: Record<string, string> = {
  template: 'Poll Templates',
  theme: 'Themes',
  access_pass: 'Access Passes',
  report: 'Reports',
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('marketplace_items')
    .select('*, creator:profiles!creator_id(id, username, display_name)')
    .eq('is_active', true)
    .order('purchase_count', { ascending: false })
    .limit(30);

  if (type) query = query.eq('type', type);

  const { data: items } = await query;

  // Check user's purchases
  let purchasedIds: string[] = [];
  if (user) {
    const { data: purchases } = await supabase
      .from('marketplace_purchases')
      .select('item_id')
      .eq('buyer_id', user.id);
    purchasedIds = purchases?.map(p => p.item_id) || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Marketplace</h1>
        {user && (
          <Button asChild>
            <Link href="/marketplace/create">Sell Something</Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue={type || 'all'}>
        <TabsList>
          <TabsTrigger value="all" asChild>
            <Link href="/marketplace">All</Link>
          </TabsTrigger>
          {Object.entries(TYPE_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key} asChild>
              <Link href={`/marketplace?type=${key}`}>{label}</Link>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items?.map((item: any) => (
          <Card key={item.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">{TYPE_LABELS[item.type] || item.type}</Badge>
                <span className="text-lg font-bold">${(item.price_cents / 100).toFixed(2)}</span>
              </div>
              <CardTitle className="text-lg mt-2">{item.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <p className="text-sm text-muted-foreground flex-1 line-clamp-3">
                {item.description || 'No description'}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <Link href={`/user/${item.creator?.username}`} className="text-xs text-muted-foreground hover:underline">
                  by {item.creator?.display_name || item.creator?.username}
                </Link>
                <span className="text-xs text-muted-foreground">{item.purchase_count} sold</span>
              </div>
              <div className="mt-3">
                {purchasedIds.includes(item.id) ? (
                  <Button variant="outline" disabled className="w-full">Purchased</Button>
                ) : (
                  <Button className="w-full" asChild>
                    <Link href={`/api/marketplace/purchase?item=${item.id}`}>Buy Now</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(!items || items.length === 0) && (
        <p className="text-center text-muted-foreground py-12">
          No items in the marketplace yet. Be the first to sell!
        </p>
      )}
    </div>
  );
}
