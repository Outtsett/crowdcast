export const revalidate = 60;
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase-server';

export const metadata: Metadata = {
  title: 'Creator Exchange',
  description: 'Discover poll packs, community passes, and insight reports from top creators on the Crowdcast Exchange.',
  openGraph: { title: 'Crowdcast Creator Exchange', description: 'Discover premium poll content from top creators.' },
};
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import {
  LayoutGrid,
  KeyRound,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Sparkles,
  Users,
  ArrowRight,
  CheckCircle2,
  Star,
  Briefcase,
  PartyPopper,
  Heart,
  MapPin,
  GraduationCap,
  Trophy,
  Clapperboard,
  UtensilsCrossed,
  Cpu,
  Activity,
  Landmark,
  MoreHorizontal,
} from 'lucide-react';
import { PurchaseButton } from './purchase-button';

/* ------------------------------------------------------------------ */
/*  Listing type metadata                                              */
/* ------------------------------------------------------------------ */

const LISTING_TYPES = [
  {
    key: 'template',
    label: 'Poll Packs',
    description: 'Curated collections of ready-to-use polls ($1\u201310)',
    icon: LayoutGrid,
    gradient: 'from-violet-500/15 to-purple-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    key: 'access_pass',
    label: 'Community Passes',
    description: 'Paid membership for exclusive communities ($1\u201320/mo)',
    icon: KeyRound,
    gradient: 'from-amber-500/15 to-orange-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'report',
    label: 'Insight Reports',
    description: 'Data analysis and trend reports from polls ($5\u201350)',
    icon: BarChart3,
    gradient: 'from-emerald-500/15 to-teal-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
];

/* ------------------------------------------------------------------ */
/*  Audience category metadata                                         */
/* ------------------------------------------------------------------ */

const AUDIENCE_CATEGORIES = [
  { key: 'business', label: 'Business', icon: Briefcase },
  { key: 'friends', label: 'Friends & Social', icon: PartyPopper },
  { key: 'family', label: 'Family', icon: Heart },
  { key: 'local', label: 'Local', icon: MapPin },
  { key: 'education', label: 'Education', icon: GraduationCap },
  { key: 'sports', label: 'Sports & Gaming', icon: Trophy },
  { key: 'entertainment', label: 'Entertainment', icon: Clapperboard },
  { key: 'food', label: 'Food & Dining', icon: UtensilsCrossed },
  { key: 'tech', label: 'Tech', icon: Cpu },
  { key: 'health', label: 'Health', icon: Activity },
  { key: 'politics', label: 'Politics & Civic', icon: Landmark },
  { key: 'other', label: 'Other', icon: MoreHorizontal },
];

const TYPE_LABEL: Record<string, string> = {
  template: 'Poll Pack',
  access_pass: 'Community Pass',
  report: 'Insight Report',
};

const TYPE_ICON: Record<string, typeof LayoutGrid> = {
  template: LayoutGrid,
  access_pass: KeyRound,
  report: BarChart3,
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function ExchangePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; category?: string }>;
}) {
  const { type, category } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  /* ---- Fetch items ---- */
  let query = supabase
    .from('exchange_listings')
    .select('*, creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified)')
    .eq('is_active', true)
    .order('purchase_count', { ascending: false })
    .limit(30);

  if (type) query = query.eq('type', type);
  if (category) query = query.eq('category', category);

  const { data: items } = await query;

  /* ---- Fetch user purchases ---- */
  let purchasedIds: string[] = [];
  if (user) {
    const { data: purchases } = await supabase
      .from('exchange_purchases')
      .select('item_id')
      .eq('buyer_id', user.id);
    purchasedIds = purchases?.map(p => p.item_id) || [];
  }

  /* ---- Fetch top creators (by purchase_count sum) ---- */
  const { data: topCreators } = await supabase
    .from('exchange_listings')
    .select('creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified)')
    .eq('is_active', true)
    .order('purchase_count', { ascending: false })
    .limit(6);

  // Deduplicate creators
  const seenCreators = new Set<string>();
  const uniqueCreators = (topCreators || [])
    .map((i: any) => i.creator)
    .filter((c: any) => {
      if (!c || seenCreators.has(c.id)) return false;
      seenCreators.add(c.id);
      return true;
    })
    .slice(0, 4);

  /* ---- Featured items (top 3 by purchases, no filter) ---- */
  const hasFilter = !!type || !!category;
  const featured = !hasFilter
    ? (items || []).slice(0, 3)
    : [];

  const listItems = hasFilter ? items : (items || []).slice(3);

  /* ---- Active type for highlighting ---- */
  const activeType = LISTING_TYPES.find(c => c.key === type);
  const activeAudience = AUDIENCE_CATEGORIES.find(c => c.key === category);

  /* ---- URL builder helpers ---- */
  const buildUrl = (params: { type?: string; category?: string }) => {
    const p = new URLSearchParams();
    if (params.type) p.set('type', params.type);
    if (params.category) p.set('category', params.category);
    const qs = p.toString();
    return `/marketplace${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-10">
      {/* ============================================================ */}
      {/*  HERO SECTION                                                 */}
      {/* ============================================================ */}
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-8 md:p-12">
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">Creator Exchange</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Built by the community,{' '}
            <span className="text-primary">for the community</span>
          </h1>
          <p className="mt-3 text-muted-foreground text-lg leading-relaxed max-w-xl">
            Discover poll packs, community passes, and insight reports crafted by
            top Crowdcast creators. Sell your own and keep 85% of every sale.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {user ? (
              <Button asChild size="lg">
                <Link href="/marketplace/create">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Start Selling
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg">
                <Link href="/login">Sign In to Sell</Link>
              </Button>
            )}
            <Button variant="outline" size="lg" asChild>
              <Link href="#browse">
                Browse All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
      </section>

      {/* ============================================================ */}
      {/*  LISTING TYPE CARDS                                           */}
      {/* ============================================================ */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Browse by Type</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {LISTING_TYPES.map((cat) => {
            const Icon = cat.icon;
            const isActive = type === cat.key;
            return (
              <Link
                key={cat.key}
                href={buildUrl({ type: isActive ? undefined : cat.key, category })}
                className={`group relative rounded-xl border p-4 transition-all hover:shadow-md ${
                  isActive
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                    : 'hover:border-primary/30'
                }`}
              >
                <div className={`inline-flex rounded-lg bg-gradient-to-br ${cat.gradient} p-2.5 mb-3`}>
                  <Icon className={`h-5 w-5 ${cat.iconColor}`} />
                </div>
                <p className="font-medium text-sm">{cat.label}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {cat.description}
                </p>
                {isActive && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  AUDIENCE CATEGORY PILLS                                      */}
      {/* ============================================================ */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Who is it for?</h2>
        <div className="flex flex-wrap gap-2">
          <Link href={buildUrl({ type, category: undefined })}>
            <Badge
              variant={!category ? 'default' : 'outline'}
              className="gap-1.5 px-3 py-1.5 text-sm cursor-pointer hover:bg-primary/10 transition-colors"
            >
              All Audiences
            </Badge>
          </Link>
          {AUDIENCE_CATEGORIES.map((aud) => {
            const Icon = aud.icon;
            const isActive = category === aud.key;
            return (
              <Link key={aud.key} href={buildUrl({ type, category: isActive ? undefined : aud.key })}>
                <Badge
                  variant={isActive ? 'default' : 'outline'}
                  className="gap-1.5 px-3 py-1.5 text-sm cursor-pointer hover:bg-primary/10 transition-colors"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {aud.label}
                </Badge>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURED ITEMS (only on "All" view)                          */}
      {/* ============================================================ */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Trending on the Exchange</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((item: any, index: number) => {
              const Icon = TYPE_ICON[item.type] || LayoutGrid;
              return (
                <Card
                  key={item.id}
                  className="group relative overflow-hidden border-2 hover:border-primary/30 transition-all hover:shadow-lg"
                >
                  {/* Rank badge */}
                  <div className="absolute top-3 left-3 z-10">
                    <div className="flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                      <Star className="h-3 w-3" />
                      #{index + 1}
                    </div>
                  </div>
                  <CardContent className="p-5 pt-10">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant="secondary" className="gap-1">
                        <Icon className="h-3 w-3" />
                        {TYPE_LABEL[item.type] || item.type}
                      </Badge>
                      {item.category && item.category !== 'other' && (
                        <Badge variant="outline" className="text-xs">
                          {AUDIENCE_CATEGORIES.find(a => a.key === item.category)?.label || item.category}
                        </Badge>
                      )}
                      <span className="text-xl font-bold tabular-nums">
                        ${(item.price_cents / 100).toFixed(2)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-base line-clamp-1">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                      {item.description || 'No description provided'}
                    </p>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/user/${item.creator?.username}`}
                        className="flex items-center gap-2 group/creator"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {(item.creator?.display_name || item.creator?.username || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground group-hover/creator:text-foreground transition-colors">
                          {item.creator?.display_name || item.creator?.username}
                        </span>
                        {item.creator?.is_verified && (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        )}
                      </Link>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {item.purchase_count} sold
                      </span>
                    </div>
                    <div className="mt-4">
                      {purchasedIds.includes(item.id) ? (
                        <Button variant="outline" disabled className="w-full gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Purchased
                        </Button>
                      ) : (
                        <PurchaseButton
                          itemId={item.id}
                          price={item.price_cents}
                          isOwn={item.creator_id === user?.id}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/*  MAIN LISTING                                                 */}
      {/* ============================================================ */}
      <section id="browse">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {activeType ? activeType.label : activeAudience ? activeAudience.label : 'All Listings'}
          </h2>
          <span className="text-sm text-muted-foreground">
            {(listItems?.length || 0) + featured.length} item{((listItems?.length || 0) + featured.length) !== 1 ? 's' : ''}
          </span>
        </div>

        {listItems && listItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listItems.map((item: any) => {
              const Icon = TYPE_ICON[item.type] || LayoutGrid;
              return (
                <Card
                  key={item.id}
                  className="group flex flex-col hover:border-primary/20 transition-all hover:shadow-sm"
                >
                  <CardContent className="flex-1 flex flex-col p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Icon className="h-3 w-3" />
                        {TYPE_LABEL[item.type] || item.type}
                      </Badge>
                      {item.category && item.category !== 'other' && (
                        <Badge variant="secondary" className="text-xs">
                          {AUDIENCE_CATEGORIES.find(a => a.key === item.category)?.label || item.category}
                        </Badge>
                      )}
                      <span className="ml-auto text-lg font-bold tabular-nums">
                        ${(item.price_cents / 100).toFixed(2)}
                      </span>
                    </div>

                    <h3 className="font-semibold line-clamp-1">{item.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1.5 flex-1 line-clamp-3">
                      {item.description || 'No description provided'}
                    </p>

                    <Separator className="my-4" />

                    <div className="flex items-center justify-between">
                      <Link
                        href={`/user/${item.creator?.username}`}
                        className="flex items-center gap-2 group/creator"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px]">
                            {(item.creator?.display_name || item.creator?.username || '?')[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground group-hover/creator:text-foreground transition-colors">
                          {item.creator?.display_name || item.creator?.username}
                        </span>
                        {item.creator?.is_verified && (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        )}
                      </Link>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {item.purchase_count} sold
                      </span>
                    </div>

                    <div className="mt-4">
                      {purchasedIds.includes(item.id) ? (
                        <Button variant="outline" disabled className="w-full gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Purchased
                        </Button>
                      ) : (
                        <PurchaseButton
                          itemId={item.id}
                          price={item.price_cents}
                          isOwn={item.creator_id === user?.id}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : !featured.length ? (
          /* ---- Empty state ---- */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 px-6 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No listings yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              {activeType
                ? `Be the first to list a ${activeType.label.toLowerCase().slice(0, -1)} on the exchange!`
                : activeAudience
                ? `No ${activeAudience.label.toLowerCase()} listings yet \u2014 be the first!`
                : 'The exchange is waiting for its first creator. Could it be you?'}
            </p>
            {user && (
              <Button asChild>
                <Link href="/marketplace/create">
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Create a Listing
                </Link>
              </Button>
            )}
          </div>
        ) : null}
      </section>

      {/* ============================================================ */}
      {/*  TOP CREATORS                                                 */}
      {/* ============================================================ */}
      {uniqueCreators.length > 0 && !hasFilter && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Top Creators</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {uniqueCreators.map((creator: any) => (
              <Link
                key={creator.id}
                href={`/user/${creator.username}`}
                className="flex items-center gap-3 rounded-xl border p-4 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {(creator.display_name || creator.username || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {creator.display_name || creator.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{creator.username}
                  </p>
                </div>
                {creator.is_verified && (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 ml-auto" />
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
