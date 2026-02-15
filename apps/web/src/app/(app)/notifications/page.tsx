export const dynamic = 'force-dynamic';
import { createServerClient } from '@/lib/supabase-server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { redirect } from 'next/navigation';

export default async function NotificationsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  // Mark all as read
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notifications</h1>
      <div className="space-y-2">
        {notifications && notifications.length > 0 ? (
          notifications.map((n) => (
            <Card key={n.id} className={n.is_read ? 'opacity-60' : ''}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                </div>
                {!n.is_read && <Badge variant="default" className="text-xs">New</Badge>}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-center text-muted-foreground py-12">No notifications yet.</p>
        )}
      </div>
    </div>
  );
}
