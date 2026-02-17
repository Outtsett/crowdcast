'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PollResults } from './poll-results';
import { getTimeAgo } from '@/lib/utils';
import Link from 'next/link';
import { Lock, Link2, UsersRound } from 'lucide-react';

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    description: string | null;
    type: string;
    status: string;
    is_anonymous: boolean;
    allow_multiple: boolean;
    total_votes: number;
    total_comments: number;
    category: string | null;
    visibility?: string;
    closes_at: string | null;
    created_at: string;
    creator: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
      is_verified: boolean;
    };
    options: {
      id: string;
      label: string;
      image_url: string | null;
      vote_count: number;
      position: number;
    }[];
  };
  currentUserId: string | null;
  userVoteOptionId: string | null;
  compact?: boolean;
}

export function PollCard({ poll, currentUserId, userVoteOptionId, compact }: PollCardProps) {
  const [hasVoted, setHasVoted] = useState(!!userVoteOptionId);
  const [votedOptionIds, setVotedOptionIds] = useState<string[]>(userVoteOptionId ? [userVoteOptionId] : []);
  const [loading, setLoading] = useState(false);

  const handleVote = async (optionId: string) => {
    if (!currentUserId || poll.status === 'closed') return;
    if (!poll.allow_multiple && hasVoted) return;
    if (poll.allow_multiple && votedOptionIds.includes(optionId)) return;
    setLoading(true);

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poll_id: poll.id, option_id: optionId }),
      });

      if (res.ok || res.status === 409) {
        setHasVoted(true);
        setVotedOptionIds(prev => [...prev, optionId]);
      }
    } catch {
      // silent fail — poll results will update via realtime
    }
    setLoading(false);
  };

  const isClosed = poll.status === 'closed' ||
    (poll.closes_at && new Date(poll.closes_at) < new Date());

  const timeAgo = getTimeAgo(poll.created_at);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Link href={`/user/${poll.creator.username}`}>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {poll.creator.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/user/${poll.creator.username}`} className="text-sm font-medium hover:underline">
              {poll.creator.display_name || poll.creator.username}
              {poll.creator.is_verified && <span className="ml-1 text-primary text-xs">&#10003;</span>}
            </Link>
            <p className="text-xs text-muted-foreground">@{poll.creator.username} &middot; {timeAgo}</p>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {poll.visibility && poll.visibility !== 'public' && (
              <Badge variant="outline" className="text-xs gap-1">
                {poll.visibility === 'private' && <Lock className="h-3 w-3" />}
                {poll.visibility === 'unlisted' && <Link2 className="h-3 w-3" />}
                {poll.visibility === 'community' && <UsersRound className="h-3 w-3" />}
                {poll.visibility.charAt(0).toUpperCase() + poll.visibility.slice(1)}
              </Badge>
            )}
            {poll.category && <Badge variant="secondary" className="text-xs">{poll.category}</Badge>}
            {isClosed && <Badge variant="outline" className="text-xs">Closed</Badge>}
          </div>
        </div>
        <Link href={`/poll/${poll.id}`}>
          <h3 className="text-lg font-semibold mt-2 hover:underline leading-tight">{poll.question}</h3>
        </Link>
        {poll.description && !compact && (
          <p className="text-sm text-muted-foreground mt-1">{poll.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {(hasVoted && !poll.allow_multiple) || isClosed ? (
          <PollResults
            pollId={poll.id}
            options={poll.options}
            totalVotes={poll.total_votes + (votedOptionIds.length - (userVoteOptionId ? 1 : 0))}
            userVoteOptionId={votedOptionIds[0] ?? null}
          />
        ) : currentUserId ? (
          <div className="space-y-2">
            {poll.options
              .sort((a, b) => a.position - b.position)
              .map((option) => (
                <Button
                  key={option.id}
                  variant={votedOptionIds.includes(option.id) ? 'default' : 'outline'}
                  className="w-full justify-start h-auto py-3 text-sm"
                  onClick={() => handleVote(option.id)}
                  disabled={loading || votedOptionIds.includes(option.id)}
                >
                  {option.label}
                  {votedOptionIds.includes(option.id) && ' \u2713'}
                </Button>
              ))}
          </div>
        ) : (
          <div className="text-center py-4 space-y-2">
            <p className="text-sm text-muted-foreground">Sign in to vote</p>
            <Button asChild variant="outline" size="sm"><Link href="/login">Sign In</Link></Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground gap-4 pt-0">
        <Link href={`/poll/${poll.id}`} className="hover:underline">
          {poll.total_comments} comment{poll.total_comments !== 1 ? 's' : ''}
        </Link>
        <span>{poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}</span>
        {poll.closes_at && !isClosed && (
          <span>Closes {getTimeAgo(poll.closes_at)}</span>
        )}
      </CardFooter>
    </Card>
  );
}
