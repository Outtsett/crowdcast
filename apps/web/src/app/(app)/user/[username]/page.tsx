export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { PollCard } from '@/components/poll-card';
import { FollowButton } from '@/components/follow-button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { notFound } from 'next/navigation';

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();

  if (!profile) notFound();

  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ]);

  let isFollowing = false;
  if (user && user.id !== profile.id) {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle();
    isFollowing = !!data;
  }

  const { data: polls } = await supabase
    .from('polls')
    .select(`
      *,
      creator:profiles!creator_id(id, username, display_name, avatar_url, is_verified),
      options:poll_options(*)
    `)
    .eq('creator_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: achievements } = await supabase
    .from('user_achievements')
    .select('*, achievement:achievements(*)')
    .eq('user_id', profile.id);

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
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-2xl">{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
            {profile.is_verified && <Badge variant="default">Verified</Badge>}
            <Badge variant="outline">Lv. {profile.level}</Badge>
          </div>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-2">{profile.bio}</p>}
          {profile.location && <p className="text-sm text-muted-foreground mt-1">{profile.location}</p>}
          <div className="flex gap-4 mt-3 text-sm">
            <span><strong>{followerCount ?? 0}</strong> followers</span>
            <span><strong>{followingCount ?? 0}</strong> following</span>
            <span><strong>{profile.xp}</strong> XP</span>
          </div>
        </div>
        <FollowButton
          targetId={profile.id}
          currentUserId={user?.id ?? null}
          initialIsFollowing={isFollowing}
        />
      </div>

      {achievements && achievements.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-2">Badges</h2>
          <div className="flex flex-wrap gap-2">
            {achievements.map((ua: any) => (
              <Badge key={ua.id} variant="secondary" title={ua.achievement?.description}>
                {ua.achievement?.icon} {ua.achievement?.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Polls</h2>
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
            <p className="text-muted-foreground">No polls yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
