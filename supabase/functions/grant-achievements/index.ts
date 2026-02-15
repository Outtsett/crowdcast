// Supabase Edge Function: Check and grant achievements
// Called after votes, poll creation, follows, etc.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { user_id, event_type } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), { status: 400 });
    }

    const granted: string[] = [];

    // Get all achievements and user's existing ones
    const [{ data: allAchievements }, { data: userAchievements }] = await Promise.all([
      supabase.from('achievements').select('*'),
      supabase.from('user_achievements').select('achievement_id').eq('user_id', user_id),
    ]);

    const earnedIds = new Set(userAchievements?.map((ua: any) => ua.achievement_id) || []);
    const achievementsBySlug: Record<string, any> = {};
    allAchievements?.forEach((a: any) => { achievementsBySlug[a.slug] = a; });

    const tryGrant = async (slug: string) => {
      const achievement = achievementsBySlug[slug];
      if (!achievement || earnedIds.has(achievement.id)) return;

      await supabase.from('user_achievements').insert({
        user_id,
        achievement_id: achievement.id,
      });

      // Award XP
      await supabase.rpc('increment_xp', { user_id_input: user_id, xp_amount: achievement.xp_reward });

      granted.push(slug);

      // Create notification
      await supabase.from('notifications').insert({
        user_id,
        type: 'achievement',
        title: `Achievement unlocked: ${achievement.name}`,
        body: achievement.description,
        data: { achievement_id: achievement.id, icon: achievement.icon },
      });
    };

    // Check poll creation achievements
    if (event_type === 'poll_created' || !event_type) {
      const { count: pollCount } = await supabase
        .from('polls')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user_id);

      if (pollCount && pollCount >= 1) await tryGrant('first_poll');
      if (pollCount && pollCount >= 10) await tryGrant('ten_polls');
    }

    // Check vote achievements
    if (event_type === 'vote' || !event_type) {
      const { count: voteCount } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id);

      if (voteCount && voteCount >= 1) await tryGrant('first_vote');
      if (voteCount && voteCount >= 100) await tryGrant('hundred_votes');
    }

    // Check community achievements
    if (event_type === 'community_created' || !event_type) {
      const { count: communityCount } = await supabase
        .from('communities')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', user_id);

      if (communityCount && communityCount >= 1) await tryGrant('first_community');
    }

    // Check follower achievements
    if (event_type === 'new_follower' || !event_type) {
      const { count: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user_id);

      if (followerCount && followerCount >= 1) await tryGrant('first_follower');
      if (followerCount && followerCount >= 100) await tryGrant('hundred_followers');
    }

    // Check streak achievements
    if (event_type === 'vote' || !event_type) {
      const { data: streak } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('user_id', user_id)
        .single();

      if (streak) {
        if (streak.current_streak >= 7) await tryGrant('streak_7');
        if (streak.current_streak >= 30) await tryGrant('streak_30');
        if (streak.current_streak >= 100) await tryGrant('streak_100');
      }
    }

    // Check comment achievements
    if (event_type === 'comment' || !event_type) {
      const { count: commentCount } = await supabase
        .from('poll_comments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id);

      if (commentCount && commentCount >= 50) await tryGrant('commenter');
    }

    // Check viral poll achievement
    if (event_type === 'vote' || !event_type) {
      const { data: viralPolls } = await supabase
        .from('polls')
        .select('id')
        .eq('creator_id', user_id)
        .gte('total_votes', 1000)
        .limit(1);

      if (viralPolls && viralPolls.length > 0) await tryGrant('viral_poll');
    }

    return new Response(JSON.stringify({ granted }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
