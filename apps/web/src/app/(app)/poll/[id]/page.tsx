export const dynamic = 'force-dynamic';
import type { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase-server';
import { PollCard } from '@/components/poll-card';
import { Comments } from '@/components/comments';
import { Reactions } from '@/components/reactions';
import { PollInviteManager } from './invite-manager';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';
import { Lock, Link2, UsersRound, Globe as GlobeIcon } from 'lucide-react';
import { VoteGlobe } from '@/components/vote-globe';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: poll } = await supabase
    .from('polls')
    .select('question, category, creator:profiles!creator_id(username)')
    .eq('id', id)
    .single();

  if (!poll) return { title: 'Poll Not Found' };

  const creator = (poll.creator as any)?.username || 'someone';
  return {
    title: poll.question,
    description: `Vote on "${poll.question}" by @${creator} on Crowdcast${poll.category ? ` \u2014 ${poll.category}` : ''}`,
    openGraph: {
      title: poll.question,
      description: `Cast your vote \u2014 asked by @${creator}`,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: poll.question,
      description: `Cast your vote \u2014 asked by @${creator}`,
    },
  };
}

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: poll } = await supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified),
      options:poll_options(*)
    `)
    .eq('id', id)
    .single();

  if (!poll) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  // Access control for visibility (RLS already handles it, but show friendly message)
  const isOwner = user?.id === (poll.creator as any)?.id;

  const visibilityInfo = {
    public: { label: 'Public', icon: 'Globe' },
    private: { label: 'Private', icon: 'Lock' },
    unlisted: { label: 'Unlisted', icon: 'Link2' },
    community: { label: 'Community Only', icon: 'UsersRound' },
  }[poll.visibility || 'public'] || { label: 'Public', icon: 'Globe' };

  let userVoteOptionId: string | null = null;
  if (user) {
    const { data: vote } = await supabase
      .from('votes')
      .select('option_id')
      .eq('poll_id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    userVoteOptionId = vote?.option_id ?? null;
  }

  // Fetch reactions
  const { data: reactionRows } = await supabase
    .from('poll_reactions')
    .select('reaction')
    .eq('poll_id', id);

  const reactionCounts: { reaction: string; count: number }[] = [];
  const countMap: Record<string, number> = {};
  reactionRows?.forEach(r => { countMap[r.reaction] = (countMap[r.reaction] || 0) + 1; });
  Object.entries(countMap).forEach(([reaction, count]) => reactionCounts.push({ reaction, count }));

  let userReactions: string[] = [];
  if (user) {
    const { data } = await supabase
      .from('poll_reactions')
      .select('reaction')
      .eq('poll_id', id)
      .eq('user_id', user.id);
    userReactions = data?.map(r => r.reaction) || [];
  }

  // Fetch comments with replies
  const { data: rawComments } = await supabase
    .from('poll_comments')
    .select('*, user:profiles!user_id(id, username, display_name, avatar_url)')
    .eq('poll_id', id)
    .order('created_at', { ascending: false });

  // Organize into threaded comments
  const topLevel: any[] = [];
  const repliesMap: Record<string, any[]> = {};
  rawComments?.forEach(c => {
    const comment = { ...c, user: c.user as any, replies: [] };
    if (c.parent_id) {
      if (!repliesMap[c.parent_id]) repliesMap[c.parent_id] = [];
      repliesMap[c.parent_id].push(comment);
    } else {
      topLevel.push(comment);
    }
  });
  topLevel.forEach(c => { c.replies = repliesMap[c.id] || []; });

  // Fetch vote locations for globe
  const { data: voteLocations } = await supabase
    .from('poll_vote_locations' as any)
    .select('*')
    .eq('poll_id', id);

  const locations = (voteLocations || []).map((v: any) => ({
    lat: v.lat,
    lng: v.lng,
    vote_count: v.vote_count,
    country_code: v.country_code,
  }));

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {poll.visibility && poll.visibility !== 'public' && (
        <div className="flex items-center gap-2">
          {poll.visibility === 'private' && <Lock className="h-4 w-4 text-muted-foreground" />}
          {poll.visibility === 'unlisted' && <Link2 className="h-4 w-4 text-muted-foreground" />}
          {poll.visibility === 'community' && <UsersRound className="h-4 w-4 text-muted-foreground" />}
          <Badge variant="outline" className="text-xs">{visibilityInfo.label} Poll</Badge>
        </div>
      )}

      <PollCard
        poll={{
          ...poll,
          creator: poll.creator as any,
          options: (poll.options as any[]) || [],
        }}
        currentUserId={user?.id ?? null}
        userVoteOptionId={userVoteOptionId}
      />

      {/* Invite manager for private polls \u2014 only visible to poll owner */}
      {isOwner && poll.visibility === 'private' && (
        <PollInviteManager pollId={id} />
      )}

      <Reactions
        pollId={id}
        currentUserId={user?.id ?? null}
        initialReactions={reactionCounts}
        userReactions={userReactions}
      />

      {/* Vote globe \u2014 shows where votes came from */}
      {locations.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <GlobeIcon className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Where votes came from</h2>
            </div>
            <div className="flex justify-center">
              <VoteGlobe locations={locations} width={400} height={400} />
            </div>
          </div>
        </>
      )}

      <Separator />

      <Comments
        pollId={id}
        currentUserId={user?.id ?? null}
        initialComments={topLevel}
      />
    </div>
  );
}
