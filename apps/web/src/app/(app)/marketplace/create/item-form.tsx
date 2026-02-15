'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@crowdcast/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ITEM_TYPES = [
  { value: 'template', label: 'Poll Template', desc: 'Reusable poll format with custom design' },
  { value: 'theme', label: 'Theme Pack', desc: 'Visual theme for polls and profiles' },
  { value: 'access_pass', label: 'Community Access Pass', desc: 'Monthly paid membership to your community' },
  { value: 'report', label: 'Poll Report', desc: 'Detailed analysis of poll results' },
];

export function MarketplaceItemForm({ userId }: { userId: string }) {
  const [type, setType] = useState('template');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

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
      .from('marketplace_items')
      .insert({
        creator_id: userId,
        type,
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
      <Card>
        <CardHeader><CardTitle>Item Type</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {ITEM_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setType(t.value)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  type === t.value ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                }`}>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)}
              required maxLength={100} placeholder="My Awesome Template" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea id="description"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={description} onChange={(e) => setDescription(e.target.value)}
              maxLength={2000} placeholder="Describe what buyers will get..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price (USD)</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input id="price" type="number" step="0.01" min="1" max="999"
                value={price} onChange={(e) => setPrice(e.target.value)}
                required placeholder="9.99" />
            </div>
            <p className="text-xs text-muted-foreground">You receive 85% (${price ? (parseFloat(price) * 0.85).toFixed(2) : '0.00'})</p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Listing...' : 'List on Marketplace'}
      </Button>
    </form>
  );
}
