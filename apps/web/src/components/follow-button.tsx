'use client';

import { useState } from 'react';
import { createClient } from '@crowdcast/supabase/client';
import { Button } from '@/components/ui/button';

export function FollowButton({
  targetId,
  currentUserId,
  initialIsFollowing,
}: {
  targetId: string;
  currentUserId: string | null;
  initialIsFollowing: boolean;
}) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  if (!currentUserId || currentUserId === targetId) return null;

  const toggle = async () => {
    setLoading(true);
    if (isFollowing) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId).eq('following_id', targetId);
      setIsFollowing(false);
    } else {
      await supabase.from('follows')
        .insert({ follower_id: currentUserId, following_id: targetId });
      setIsFollowing(true);
    }
    setLoading(false);
  };

  return (
    <Button
      variant={isFollowing ? 'outline' : 'default'}
      size="sm"
      onClick={toggle}
      disabled={loading}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
}
