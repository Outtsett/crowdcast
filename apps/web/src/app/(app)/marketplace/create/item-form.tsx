'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  LayoutGrid,
  KeyRound,
  BarChart3,
  Loader2,
  DollarSign,
  ArrowLeft,
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
import Link from 'next/link';

const ITEM_TYPES = [
  {
    value: 'template',
    label: 'Poll Pack',
    desc: 'A curated collection of poll formats for a specific topic or use case',
    icon: LayoutGrid,
    gradient: 'from-violet-500/15 to-purple-500/15',
    iconColor: 'text-violet-600 dark:text-violet-400',
    hint: 'e.g. "Team Retrospective Pack", "Movie Tournament Series"',
  },
  {
    value: 'access_pass',
    label: 'Community Pass',
    desc: 'Paid membership for exclusive community access',
    icon: KeyRound,
    gradient: 'from-amber-500/15 to-orange-500/15',
    iconColor: 'text-amber-600 dark:text-amber-400',
    hint: 'e.g. "Pro Sports Predictions", "Tech Leaders Circle"',
  },
  {
    value: 'report',
    label: 'Insight Report',
    desc: 'Data-driven analysis or predictions from your polls',
    icon: BarChart3,
    gradient: 'from-emerald-500/15 to-teal-500/15',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    hint: 'e.g. "Q4 Consumer Sentiment", "2026 Tech Predictions"',
  },
];

const AUDIENCE_CATEGORIES = [
  { value: 'business', label: 'Business', icon: Briefcase },
  { value: 'friends', label: 'Friends & Social', icon: PartyPopper },
  { value: 'family', label: 'Family', icon: Heart },
  { value: 'local', label: 'Local', icon: MapPin },
  { value: 'education', label: 'Education', icon: GraduationCap },
  { value: 'sports', label: 'Sports & Gaming', icon: Trophy },
  { value: 'entertainment', label: 'Entertainment', icon: Clapperboard },
  { value: 'food', label: 'Food & Dining', icon: UtensilsCrossed },
  { value: 'tech', label: 'Tech', icon: Cpu },
  { value: 'health', label: 'Health', icon: Activity },
  { value: 'politics', label: 'Politics & Civic', icon: Landmark },
  { value: 'other', label: 'Other', icon: MoreHorizontal },
];

export function ExchangeListingForm({ userId }: { userId: string }) {
  const [type, setType] = useState('template');
  const [audienceCategory, setAudienceCategory] = useState('other');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const selectedType = ITEM_TYPES.find(t => t.value === type)!;
  const yourCut = price ? (parseFloat(price) * 0.85).toFixed(2) : '0.00';
  const platformCut = price ? (parseFloat(price) * 0.15).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const priceCents = Math.round(parseFloat(price) * 100);
    if (priceCents < 100) {
      setError('Minimum price is $1.00');
      setLoading(false);
      return;
    }

    const { error: createError } = await supabase
      .from('exchange_listings')
      .insert({
        creator_id: userId,
        type,
        category: audienceCategory,
        name,
        description: description || null,
        price_cents: priceCents,
      });

    if (createError) {
      setError(createError.message);
    } else {
      router.push('/marketplace');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1 \u2014 Type selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. What are you listing?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ITEM_TYPES.map((t) => {
              const Icon = t.icon;
              const isActive = type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`relative rounded-xl border p-4 text-left transition-all ${isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/30 hover:bg-accent/50'
                    }`}
                >
                  <div className={`inline-flex rounded-lg bg-gradient-to-br ${t.gradient} p-2 mb-2`}>
                    <Icon className={`h-4 w-4 ${t.iconColor}`} />
                  </div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {t.desc}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            {selectedType.hint}
          </p>
        </CardContent>
      </Card>

      {/* Step 2 \u2014 Audience */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Who is it for?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AUDIENCE_CATEGORIES.map((aud) => {
              const Icon = aud.icon;
              const isActive = audienceCategory === aud.value;
              return (
                <button
                  key={aud.value}
                  type="button"
                  onClick={() => setAudienceCategory(aud.value)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20 font-medium'
                      : 'border-border hover:border-primary/30 hover:bg-accent/50'
                    }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  {aud.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 3 \u2014 Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Listing details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Title</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              placeholder={selectedType.hint.replace('e.g. ', '').split(',')[0].replace(/"/g, '')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="Describe what buyers will get. Be specific about what's included\u2026"
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/2000
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step 4 \u2014 Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">4. Set your price</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="price">Price (USD)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.01"
                min="1"
                max="999"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                placeholder="9.99"
                className="pl-8"
              />
            </div>
          </div>

          {price && parseFloat(price) >= 1 && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sale price</span>
                <span className="font-medium">${parseFloat(price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee (15%)</span>
                <span className="text-muted-foreground">-${platformCut}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-medium">
                <span>You receive</span>
                <span className="text-primary">${yourCut}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" asChild className="gap-2">
          <Link href="/marketplace">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>
        </Button>
        <Button type="submit" className="flex-1 gap-2" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Publishing\u2026
            </>
          ) : (
            'Publish to Exchange'
          )}
        </Button>
      </div>
    </form>
  );
}
