'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@crowdcast/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { X, UserPlus, Check, Clock, XCircle } from 'lucide-react';

interface Invite {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  user?: { username: string; display_name: string };
}

export function PollInviteManager({ pollId }: { pollId: string }) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; display_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadInvites();
  }, [pollId]);

  const loadInvites = async () => {
    const { data } = await supabase
      .from('poll_invites')
      .select('*, user:profiles!user_id(username, display_name)')
      .eq('poll_id', pollId)
      .order('created_at', { ascending: false });
    setInvites((data as any[]) || []);
  };

  const searchUsers = async (query: string) => {
    setSearch(query);
    if (query.length < 2) { setSearchResults([]); return; }
    const existingIds = invites.map(i => i.user_id);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(5);
    setSearchResults(
      (data || []).filter(u => !existingIds.includes(u.id))
    );
  };

  const inviteUser = async (userId: string) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('poll_invites').insert({
      poll_id: pollId,
      user_id: userId,
      invited_by: user.id,
    });

    setSearch('');
    setSearchResults([]);
    await loadInvites();
    setLoading(false);
  };

  const removeInvite = async (inviteId: string) => {
    await supabase.from('poll_invites').delete().eq('id', inviteId);
    setInvites(prev => prev.filter(i => i.id !== inviteId));
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <Check className="h-3.5 w-3.5 text-green-500" />;
      case 'declined': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default: return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Manage Invites
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Input
            placeholder="Search users to invite..."
            value={search}
            onChange={(e) => searchUsers(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => inviteUser(user.id)}
                  disabled={loading}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {user.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.display_name || user.username}</span>
                  <span className="text-muted-foreground">@{user.username}</span>
                  <UserPlus className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        {invites.length > 0 ? (
          <div className="space-y-2">
            {invites.map((invite) => {
              const u = invite.user as any;
              return (
                <div key={invite.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {(u?.username || '??').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium flex-1">
                    {u?.display_name || u?.username || 'Unknown'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {statusIcon(invite.status)}
                    <Badge variant="outline" className="text-xs capitalize">{invite.status}</Badge>
                  </div>
                  <button
                    onClick={() => removeInvite(invite.id)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No one invited yet. Search for users above to invite them.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
