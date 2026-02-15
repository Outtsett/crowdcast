export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { PollCard } from '@/components/poll-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = 'trending' } = await searchParams;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified),
      options:poll_options(*)
    `)
    .eq('status', 'active')
    .is('community_id', null);

  if (tab === 'trending') {
    query = query.order('trending_score', { ascending: false }).limit(20);
  } else if (tab === 'latest') {
    query = query.order('created_at', { ascending: false }).limit(20);
  } else if (tab === 'following' && user) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    const followingIds = follows?.map((f) => f.following_id) || [];
    if (followingIds.length > 0) {
      query = query.in('creator_id', followingIds);
    }
    query = query.order('created_at', { ascending: false }).limit(20);
  }

  const { data: polls } = await query;

  let userVotes: Record<string, string> = {};
  if (user && polls?.length) {
    const { data: votes } = await supabase
      .from('votes')
      .select('poll_id, option_id')
      .eq('user_id', user.id)
      .in('poll_id', polls.map((p) => p.id));
    votes?.forEach((v) => { userVotes[v.poll_id] = v.option_id; });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Feed</h1>
        <Button asChild>
          <Link href="/create">Create Poll</Link>
        </Button>
      </div>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="trending" asChild>
            <Link href="/?tab=trending">Trending</Link>
          </TabsTrigger>
          <TabsTrigger value="latest" asChild>
            <Link href="/?tab=latest">Latest</Link>
          </TabsTrigger>
          {user && (
            <TabsTrigger value="following" asChild>
              <Link href="/?tab=following">Following</Link>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {polls && polls.length > 0 ? (
          polls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={{
                ...poll,
                creator: poll.creator as any,
                options: (poll.options as any[]) || [],
              }}
              currentUserId={user?.id ?? null}
              userVoteOptionId={userVotes[poll.id] ?? null}
              compact
            />
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">No polls yet. Be the first!</p>
            <Button asChild><Link href="/create">Create a Poll</Link></Button>
          </div>
        )}
      </div>
    </div>
  );
}
