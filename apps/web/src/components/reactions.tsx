'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-client';
import { cn } from '@/lib/utils';

const REACTIONS = [
  { type: 'like', emoji: '\u{1F44D}', label: 'Like' },
  { type: 'fire', emoji: '\u{1F525}', label: 'Fire' },
  { type: 'thinking', emoji: '\u{1F914}', label: 'Thinking' },
  { type: 'laugh', emoji: '\u{1F602}', label: 'Laugh' },
  { type: 'surprise', emoji: '\u{1F62E}', label: 'Surprise' },
] as const;

interface ReactionCount {
  reaction: string;
  count: number;
}

export function Reactions({
  pollId,
  currentUserId,
  initialReactions,
  userReactions: initialUserReactions,
}: {
  pollId: string;
  currentUserId: string | null;
  initialReactions: ReactionCount[];
  userReactions: string[];
}) {
  const [reactions, setReactions] = useState<ReactionCount[]>(initialReactions);
  const [userReactions, setUserReactions] = useState<string[]>(initialUserReactions);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const toggleReaction = async (reactionType: string) => {
    if (!currentUserId || loading) return;
    setLoading(true);

    const hasReacted = userReactions.includes(reactionType);

    if (hasReacted) {
      await supabase.from('poll_reactions')
        .delete()
        .eq('poll_id', pollId)
        .eq('user_id', currentUserId)
        .eq('reaction', reactionType);

      setUserReactions(prev => prev.filter(r => r !== reactionType));
      setReactions(prev => prev.map(r =>
        r.reaction === reactionType ? { ...r, count: Math.max(0, r.count - 1) } : r
      ));
    } else {
      await supabase.from('poll_reactions')
        .insert({ poll_id: pollId, user_id: currentUserId, reaction: reactionType });

      setUserReactions(prev => [...prev, reactionType]);
      setReactions(prev => {
        const existing = prev.find(r => r.reaction === reactionType);
        if (existing) {
          return prev.map(r => r.reaction === reactionType ? { ...r, count: r.count + 1 } : r);
        }
        return [...prev, { reaction: reactionType, count: 1 }];
      });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTIONS.map(({ type, emoji, label }) => {
        const count = reactions.find(r => r.reaction === type)?.count || 0;
        const active = userReactions.includes(type);

        return (
          <button
            key={type}
            onClick={() => toggleReaction(type)}
            disabled={!currentUserId || loading}
            title={label}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs border transition-colors',
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:bg-accent text-muted-foreground',
              !currentUserId && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
