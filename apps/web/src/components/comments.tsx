'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getTimeAgo } from '@/lib/utils';
import Link from 'next/link';

interface Comment {
  id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  likes_count: number;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

export function Comments({
  pollId,
  currentUserId,
  initialComments,
}: {
  pollId: string;
  currentUserId: string | null;
  initialComments: Comment[];
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Realtime comments
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${pollId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'poll_comments',
        filter: `poll_id=eq.${pollId}`,
      }, async (payload) => {
        const { data: comment } = await supabase
          .from('poll_comments')
          .select('*, user:profiles!user_id(id, username, display_name, avatar_url)')
          .eq('id', (payload.new as any).id)
          .single();
        if (comment) {
          const formatted = { ...comment, user: comment.user as any } as Comment;
          if (formatted.parent_id) {
            setComments(prev => prev.map(c =>
              c.id === formatted.parent_id
                ? { ...c, replies: [...(c.replies || []), formatted] }
                : c
            ));
          } else {
            setComments(prev => [formatted, ...prev]);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pollId, supabase]);

  const submitComment = async (parentId?: string) => {
    if (!currentUserId) return;
    const body = parentId ? replyText : newComment;
    if (!body.trim()) return;
    setLoading(true);

    const { error } = await supabase.from('poll_comments').insert({
      poll_id: pollId,
      user_id: currentUserId,
      body: body.trim(),
      parent_id: parentId || null,
    });

    if (!error) {
      if (parentId) {
        setReplyText('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }
    }
    setLoading(false);
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`flex gap-3 ${isReply ? 'ml-10 mt-3' : 'mt-4'}`}>
      <Link href={`/user/${comment.user.username}`}>
        <Avatar className="h-7 w-7 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {comment.user.username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/user/${comment.user.username}`} className="text-sm font-medium hover:underline">
            {comment.user.display_name || comment.user.username}
          </Link>
          <span className="text-xs text-muted-foreground">{getTimeAgo(comment.created_at)}</span>
        </div>
        <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.body}</p>
        <div className="flex gap-3 mt-1">
          <button className="text-xs text-muted-foreground hover:text-foreground">
            {comment.likes_count > 0 ? `${comment.likes_count} likes` : 'Like'}
          </button>
          {!isReply && currentUserId && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
            >
              Reply
            </button>
          )}
        </div>
        {replyingTo === comment.id && (
          <div className="flex gap-2 mt-2">
            <input
              className="flex-1 text-sm rounded-md border border-input bg-background px-3 py-1.5"
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment(comment.id)}
            />
            <Button size="sm" onClick={() => submitComment(comment.id)} disabled={loading}>
              Reply
            </Button>
          </div>
        )}
        {comment.replies?.map(reply => renderComment(reply, true))}
      </div>
    </div>
  );

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Comments</h3>
      {currentUserId ? (
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
          />
          <Button onClick={() => submitComment()} disabled={loading || !newComment.trim()}>
            Post
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">Sign in</Link> to comment
        </p>
      )}
      <div>
        {comments.length > 0 ? (
          comments.map(c => renderComment(c))
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">No comments yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}
