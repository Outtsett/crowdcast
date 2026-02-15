// Supabase Edge Function: Update voting streaks
// Called after each vote, or on a daily cron to reset broken streaks

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json().catch(() => ({}));
    const userId = body.user_id;

    if (userId) {
      // Single user update (called after a vote)
      await updateUserStreak(supabase, userId);
      return new Response(JSON.stringify({ updated: userId }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Bulk update: reset streaks for users who didn't vote yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: brokenStreaks } = await supabase
      .from('streaks')
      .select('user_id')
      .gt('current_streak', 0)
      .lt('last_vote_date', yesterdayStr);

    if (brokenStreaks && brokenStreaks.length > 0) {
      for (const streak of brokenStreaks) {
        await supabase
          .from('streaks')
          .update({ current_streak: 0 })
          .eq('user_id', streak.user_id);
      }
    }

    return new Response(
      JSON.stringify({ reset: brokenStreaks?.length || 0 }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function updateUserStreak(supabase: any, userId: string) {
  const today = new Date().toISOString().split('T')[0];

  const { data: streak } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!streak) {
    // Create new streak record
    await supabase.from('streaks').insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_vote_date: today,
    });
    return;
  }

  if (streak.last_vote_date === today) {
    return; // Already voted today
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak: number;
  if (streak.last_vote_date === yesterdayStr) {
    newStreak = streak.current_streak + 1;
  } else {
    newStreak = 1; // Streak broken
  }

  const longestStreak = Math.max(newStreak, streak.longest_streak);

  await supabase
    .from('streaks')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_vote_date: today,
    })
    .eq('user_id', userId);
}
