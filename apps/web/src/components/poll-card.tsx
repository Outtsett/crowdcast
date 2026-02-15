'use client';

import { useState } from 'react';
import { createClient } from '@crowdcast/supabase/client';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PollResults } from './poll-results';
import { getTimeAgo } from '@/lib/utils';
import Link from 'next/link';

interface PollCardProps {
  poll: {
    id: string;
    question: string;
    description: string | null;
    type: string;
    status: string;
    is_anonymous: boolean;
    total_votes: number;
    total_comments: number;
    category: string | null;
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
  const [votedOptionId, setVotedOptionId] = useState(userVoteOptionId);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleVote = async (optionId: string) => {
    if (hasVoted || !currentUserId || poll.status === 'closed') return;
    setLoading(true);

    const { error } = await supabase
      .from('votes')
      .insert({ poll_id: poll.id, option_id: optionId, user_id: currentUserId });

    if (!error) {
      setHasVoted(true);
      setVotedOptionId(optionId);
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
        {hasVoted || isClosed ? (
          <PollResults
            pollId={poll.id}
            options={poll.options}
            totalVotes={poll.total_votes + (hasVoted && !userVoteOptionId ? 1 : 0)}
            userVoteOptionId={votedOptionId}
          />
        ) : currentUserId ? (
          <div className="space-y-2">
            {poll.options
              .sort((a, b) => a.position - b.position)
              .map((option) => (
                <Button
                  key={option.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 text-sm"
                  onClick={() => handleVote(option.id)}
                  disabled={loading}
                >
                  {option.label}
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
