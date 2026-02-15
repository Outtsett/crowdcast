'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@crowdcast/supabase/client';
import { createPollSchema, CATEGORIES } from '@crowdcast/shared';
import type { PollType } from '@crowdcast/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const POLL_TYPE_LABELS: Record<PollType, string> = {
  multiple_choice: 'Multiple Choice',
  yes_no: 'Yes / No',
  rating: 'Rating',
  image: 'Image Poll',
  ranked_choice: 'Ranked Choice',
  this_or_that: 'This or That',
  open_ended: 'Open Ended',
};

export function PollForm() {
  const [type, setType] = useState<PollType>('multiple_choice');
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState([{ label: '' }, { label: '' }]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState('');
  const [closesIn, setClosesIn] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const addOption = () => {
    if (options.length < 10) setOptions([...options, { label: '' }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, label: string) => {
    const updated = [...options];
    updated[index] = { label };
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const finalOptions = type === 'yes_no'
        ? [{ label: 'Yes' }, { label: 'No' }]
        : type === 'open_ended'
        ? [{ label: 'Response' }]
        : options;

      let closes_at: string | undefined;
      if (closesIn) {
        const hours = parseInt(closesIn);
        closes_at = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      }

      const input = createPollSchema.parse({
        type,
        question,
        description: description || undefined,
        options: finalOptions,
        is_anonymous: isAnonymous,
        closes_at,
        category: category || undefined,
      });

      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          creator_id: user.id,
          type: input.type,
          question: input.question,
          description: input.description,
          is_anonymous: input.is_anonymous,
          closes_at: input.closes_at,
          category: input.category,
        })
        .select()
        .single();

      if (pollError) throw pollError;

      const { error: optionsError } = await supabase
        .from('poll_options')
        .insert(
          input.options.map((opt, i) => ({
            poll_id: poll.id,
            label: opt.label,
            image_url: opt.image_url,
            position: i,
          }))
        );

      if (optionsError) throw optionsError;
      router.push(`/poll/${poll.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create poll';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const needsOptions = !['yes_no', 'open_ended'].includes(type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Poll Type</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.entries(POLL_TYPE_LABELS) as [PollType, string][]).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setType(key)}
                className={`rounded-lg border p-3 text-sm text-left transition-colors ${
                  type === key ? 'border-primary bg-primary/5 font-medium' : 'border-border hover:bg-accent'
                }`}>{label}</button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your Question</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input id="question" placeholder="What do you want to ask?" value={question}
              onChange={(e) => setQuestion(e.target.value)} required maxLength={500} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <textarea id="description"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Add more context..." value={description}
              onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>
        </CardContent>
      </Card>

      {needsOptions && (
        <Card>
          <CardHeader><CardTitle>Options</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder={`Option ${i + 1}`} value={opt.label}
                  onChange={(e) => updateOption(i, e.target.value)} required />
                {options.length > 2 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(i)}>X</Button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <Button type="button" variant="outline" size="sm" onClick={addOption}>+ Add Option</Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="anonymous" checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)} className="h-4 w-4 rounded border-input" />
            <Label htmlFor="anonymous">Anonymous voting</Label>
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
          <div className="space-y-2">
            <Label htmlFor="closes">Auto-close after</Label>
            <select id="closes"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={closesIn} onChange={(e) => setClosesIn(e.target.value)}>
              <option value="">Never</option>
              <option value="1">1 hour</option>
              <option value="6">6 hours</option>
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="168">1 week</option>
              <option value="720">30 days</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? 'Creating...' : 'Create Poll'}
      </Button>
    </form>
  );
}
