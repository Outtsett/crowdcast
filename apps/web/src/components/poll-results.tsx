'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@crowdcast/supabase/client';

interface PollOption {
  id: string;
  label: string;
  image_url: string | null;
  vote_count: number;
  position: number;
}

export function PollResults({
  pollId,
  options: initialOptions,
  totalVotes: initialTotal,
  userVoteOptionId,
}: {
  pollId: string;
  options: PollOption[];
  totalVotes: number;
  userVoteOptionId: string | null;
}) {
  const [options, setOptions] = useState(initialOptions);
  const [totalVotes, setTotalVotes] = useState(initialTotal);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`poll:${pollId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'poll_options',
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as unknown as PollOption;
            setOptions((prev) =>
              prev.map((o) => (o.id === updated.id ? { ...o, vote_count: updated.vote_count } : o))
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'polls',
          filter: `id=eq.${pollId}`,
        },
        (payload) => {
          if (payload.new && typeof (payload.new as Record<string, unknown>).total_votes === 'number') {
            setTotalVotes((payload.new as Record<string, unknown>).total_votes as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pollId, supabase]);

  return (
    <div className="space-y-3">
      {options
        .sort((a, b) => a.position - b.position)
        .map((option) => {
          const pct = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;
          const isUserVote = option.id === userVoteOptionId;

          return (
            <div key={option.id} className="relative">
              <div
                className="absolute inset-0 rounded-lg bg-primary/10 transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
              <div className={`relative flex items-center justify-between rounded-lg border p-3 ${
                isUserVote ? 'border-primary ring-1 ring-primary/20' : 'border-border'
              }`}>
                <span className="font-medium text-sm">
                  {option.label}
                  {isUserVote && <span className="ml-2 text-xs text-primary font-normal">Your vote</span>}
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {pct.toFixed(1)}% ({option.vote_count})
                </span>
              </div>
            </div>
          );
        })}
      <p className="text-sm text-muted-foreground text-center pt-1">
        {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
