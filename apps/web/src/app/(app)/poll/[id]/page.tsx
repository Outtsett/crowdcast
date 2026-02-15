export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { PollCard } from '@/components/poll-card';
import { Comments } from '@/components/comments';
import { Reactions } from '@/components/reactions';
import { Separator } from '@/components/ui/separator';
import { notFound } from 'next/navigation';

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

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <PollCard
        poll={{
          ...poll,
          creator: poll.creator as any,
          options: (poll.options as any[]) || [],
        }}
        currentUserId={user?.id ?? null}
        userVoteOptionId={userVoteOptionId}
      />

      <Reactions
        pollId={id}
        currentUserId={user?.id ?? null}
        initialReactions={reactionCounts}
        userReactions={userReactions}
      />

      <Separator />

      <Comments
        pollId={id}
        currentUserId={user?.id ?? null}
        initialComments={topLevel}
      />
    </div>
  );
}
