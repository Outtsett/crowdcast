export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { PollCard } from '@/components/poll-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: community } = await supabase
    .from('communities')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!community) notFound();

  let isMember = false;
  let memberRole: string | null = null;
  if (user) {
    const { data } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', community.id)
      .eq('user_id', user.id)
      .maybeSingle();
    isMember = !!data;
    memberRole = data?.role ?? null;
  }

  const { data: polls } = await supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified),
      options:poll_options(*)
    `)
    .eq('community_id', community.id)
    .order('created_at', { ascending: false })
    .limit(20);

  let userVotes: Record<string, string> = {};
  if (user && polls?.length) {
    const { data: votes } = await supabase
      .from('votes')
      .select('poll_id, option_id')
      .eq('user_id', user.id)
      .in('poll_id', polls.map((p) => p.id));
    votes?.forEach((v) => { userVotes[v.poll_id] = v.option_id; });
  }

  const { data: rules } = await supabase
    .from('community_rules')
    .select('*')
    .eq('community_id', community.id)
    .order('position');

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{community.name}</h1>
            <p className="text-muted-foreground">/{community.slug}</p>
          </div>
          {user && !isMember && (
            <form action="/api/community/join" method="POST">
              <input type="hidden" name="communityId" value={community.id} />
              <Button>Join Community</Button>
            </form>
          )}
          {isMember && <Badge variant="default">{memberRole}</Badge>}
        </div>
        {community.description && <p>{community.description}</p>}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{community.member_count} members</span>
          <span>{community.poll_count} polls</span>
          {community.category && <Badge variant="secondary">{community.category}</Badge>}
        </div>
      </div>

      {rules && rules.length > 0 && (
        <details className="border rounded-lg p-4">
          <summary className="font-medium cursor-pointer">Community Rules</summary>
          <ol className="mt-2 space-y-2 list-decimal list-inside text-sm">
            {rules.map((rule: any) => (
              <li key={rule.id}><strong>{rule.title}</strong>: {rule.description}</li>
            ))}
          </ol>
        </details>
      )}

      {isMember && (
        <Button asChild>
          <Link href={`/create?community=${community.id}`}>Create Poll in {community.name}</Link>
        </Button>
      )}

      <div className="space-y-4">
        {polls && polls.length > 0 ? (
          polls.map((poll) => (
            <PollCard key={poll.id}
              poll={{ ...poll, creator: poll.creator as any, options: (poll.options as any[]) || [] }}
              currentUserId={user?.id ?? null}
              userVoteOptionId={userVotes[poll.id] ?? null}
              compact />
          ))
        ) : (
          <p className="text-center text-muted-foreground py-8">No polls in this community yet.</p>
        )}
      </div>
    </div>
  );
}
