export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { PollCard } from '@/components/poll-card';
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
    </div>
  );
}
