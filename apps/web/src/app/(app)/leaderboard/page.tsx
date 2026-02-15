export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default async function LeaderboardPage() {
  const supabase = await createServerClient();

  const { data: topUsers } = await supabase
    .from('profiles')
    .select('id, username, display_name, xp, level, is_verified')
    .order('xp', { ascending: false })
    .limit(50);

  const { data: topStreaks } = await supabase
    .from('streaks')
    .select('*, profile:profiles!user_id(username, display_name)')
    .order('current_streak', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Leaderboard</h1>

      <Card>
        <CardHeader><CardTitle>Top Users by XP</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topUsers?.map((u, i) => (
              <Link key={u.id} href={`/user/${u.username}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                <span className="text-lg font-bold text-muted-foreground w-8 text-center">
                  {i + 1}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{u.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <span className="font-medium text-sm">
                    {u.display_name || u.username}
                    {u.is_verified && <span className="ml-1 text-primary text-xs">&#10003;</span>}
                  </span>
                </div>
                <Badge variant="outline">Lv. {u.level}</Badge>
                <span className="text-sm text-muted-foreground tabular-nums">{u.xp} XP</span>
              </Link>
            ))}
            {(!topUsers || topUsers.length === 0) && (
              <p className="text-muted-foreground text-center py-4">No users yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {topStreaks && topStreaks.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Longest Active Streaks</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topStreaks.map((s: any, i: number) => (
                <div key={s.id} className="flex items-center gap-3 p-2">
                  <span className="text-lg font-bold text-muted-foreground w-8 text-center">{i + 1}</span>
                  <span className="flex-1 text-sm font-medium">
                    {s.profile?.display_name || s.profile?.username}
                  </span>
                  <span className="text-sm">{s.current_streak} day streak</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
