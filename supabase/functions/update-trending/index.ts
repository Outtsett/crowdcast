// Supabase Edge Function: Update trending scores for all active polls
// Run on a cron schedule (e.g., every 5 minutes)
// Score = (votes_in_last_hour * 10) + (comments_last_hour * 5) + (reactions_last_hour * 2) - age_penalty

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Get all active polls
    const { data: polls } = await supabase
      .from('polls')
      .select('id, created_at, total_votes, total_comments')
      .eq('status', 'active');

    if (!polls || polls.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pollIds = polls.map(p => p.id);

    // Count recent votes per poll
    const { data: recentVotes } = await supabase
      .from('votes')
      .select('poll_id')
      .in('poll_id', pollIds)
      .gte('created_at', oneHourAgo);

    const votesByPoll: Record<string, number> = {};
    recentVotes?.forEach(v => {
      votesByPoll[v.poll_id] = (votesByPoll[v.poll_id] || 0) + 1;
    });

    // Count recent comments per poll
    const { data: recentComments } = await supabase
      .from('poll_comments')
      .select('poll_id')
      .in('poll_id', pollIds)
      .gte('created_at', oneHourAgo);

    const commentsByPoll: Record<string, number> = {};
    recentComments?.forEach(c => {
      commentsByPoll[c.poll_id] = (commentsByPoll[c.poll_id] || 0) + 1;
    });

    // Count recent reactions per poll
    const { data: recentReactions } = await supabase
      .from('poll_reactions')
      .select('poll_id')
      .in('poll_id', pollIds)
      .gte('created_at', oneHourAgo);

    const reactionsByPoll: Record<string, number> = {};
    recentReactions?.forEach(r => {
      reactionsByPoll[r.poll_id] = (reactionsByPoll[r.poll_id] || 0) + 1;
    });

    // Calculate and update scores
    let updated = 0;
    for (const poll of polls) {
      const hoursSinceCreation = (Date.now() - new Date(poll.created_at).getTime()) / (1000 * 60 * 60);
      const agePenalty = Math.log2(hoursSinceCreation + 2); // logarithmic decay

      const recentVoteCount = votesByPoll[poll.id] || 0;
      const recentCommentCount = commentsByPoll[poll.id] || 0;
      const recentReactionCount = reactionsByPoll[poll.id] || 0;

      const score = (
        (recentVoteCount * 10) +
        (recentCommentCount * 5) +
        (recentReactionCount * 2) +
        Math.log2(poll.total_votes + 1) * 2 // baseline from total engagement
      ) / agePenalty;

      await supabase
        .from('polls')
        .update({ trending_score: Math.round(score * 100) / 100 })
        .eq('id', poll.id);

      updated++;
    }

    // Auto-close expired polls
    await supabase
      .from('polls')
      .update({ status: 'closed' })
      .eq('status', 'active')
      .lte('closes_at', new Date().toISOString())
      .not('closes_at', 'is', null);

    return new Response(JSON.stringify({ updated, closed: 'expired polls closed' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
