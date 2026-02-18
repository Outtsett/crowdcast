'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { CATEGORIES } from '@/lib/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CommunityForm({ userId }: { userId: string }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const generateSlug = (text: string) => {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: community, error: createError } = await supabase
        .from('communities')
        .insert({
          creator_id: userId,
          name,
          slug: slug || generateSlug(name),
          description: description || null,
          category: category || null,
          is_private: isPrivate,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Auto-join as admin
      await supabase.from('community_members').insert({
        community_id: community.id,
        user_id: userId,
        role: 'admin',
      });

      router.push(`/community/${community.slug}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create community';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Community Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name}
              onChange={(e) => { setName(e.target.value); if (!slug) setSlug(generateSlug(e.target.value)); }}
              required minLength={3} maxLength={50} placeholder="My Community" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">/community/</span>
              <Input id="slug" value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                required minLength={3} maxLength={50} placeholder="my-community" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea id="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={description} onChange={(e) => setDescription(e.target.value)}
              maxLength={1000} placeholder="What's this community about?" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select id="category"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Select category...</option>
              {CATEGORIES.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="private" checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)} className="h-4 w-4 rounded border-input" />
            <Label htmlFor="private">Private community (invite-only)</Label>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Community'}
      </Button>
    </form>
  );
}
