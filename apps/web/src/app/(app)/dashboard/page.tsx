export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CreatorDashboardPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get user's exchange listings
  const { data: items } = await supabase
    .from('exchange_listings')
    .select('*')
    .eq('creator_id', user.id)
    .order('created_at', { ascending: false });

  // Get sales
  const { data: sales } = await supabase
    .from('exchange_purchases')
    .select('*, item:exchange_listings!item_id(name)')
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);

  // Total earnings
  const totalEarnings = sales?.reduce((sum, s) => sum + s.seller_amount_cents, 0) || 0;
  const totalSales = sales?.length || 0;

  // Profile stats
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_tier, stripe_connect_account_id, xp, level')
    .eq('id', user.id)
    .single();

  // Poll stats
  const { count: pollCount } = await supabase
    .from('polls')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', user.id);

  const { data: totalVotesData } = await supabase
    .from('polls')
    .select('total_votes')
    .eq('creator_id', user.id);

  const totalVotes = totalVotesData?.reduce((sum, p) => sum + p.total_votes, 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Creator Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Earnings</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">${(totalEarnings / 100).toFixed(2)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Sales</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalSales}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Polls Created</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{pollCount || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Votes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{totalVotes}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Listings</CardTitle>
          <Button size="sm" asChild><Link href="/marketplace/create">New Listing</Link></Button>
        </CardHeader>
        <CardContent>
          {items && items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                      <span className="text-xs text-muted-foreground">{item.purchase_count} sold</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${(item.price_cents / 100).toFixed(2)}</p>
                    <Badge variant={item.is_active ? 'default' : 'outline'} className="text-xs">
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No listings yet.</p>
          )}
        </CardContent>
      </Card>

      {sales && sales.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Sales</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sales.map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between p-2 text-sm">
                  <span>{(sale.item as any)?.name || 'Unknown item'}</span>
                  <span className="font-medium text-green-600">
                    +${(sale.seller_amount_cents / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Subscription</span>
            <Badge>{profile?.subscription_tier || 'free'}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Level</span>
            <span className="text-sm font-medium">Lv. {profile?.level} ({profile?.xp} XP)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Stripe Connect</span>
            {profile?.stripe_connect_account_id ? (
              <Badge variant="default">Connected</Badge>
            ) : (
              <Button size="sm" variant="outline">Connect Stripe</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
