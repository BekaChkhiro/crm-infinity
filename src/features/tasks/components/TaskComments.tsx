import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { MessageSquare, Plus, Filter } from 'lucide-react';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import { CommentForm } from './CommentForm';
import { CommentThread } from './CommentThread';
import { Task } from './TaskCard';

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  content_type: 'plain' | 'markdown';
  reply_to: string | null;
  edited: boolean;
  edited_at: string | null;
  mentions: string[];
  attachments: any[];
  created_at: string;
  depth?: number;
  user_name?: string;
  replies?: Comment[];
}

interface TaskCommentsProps {
  task: Task;
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskComments({ task, teamMembers, isOpen, onClose }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  // We're no longer setting replyingTo here as it's handled at the comment item level
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    
    if (isOpen) {
      fetchComments();
      cleanup = setupRealtimeSubscription();
    }

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [isOpen, task.id]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      // First get comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', task.id)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      // Get unique user IDs from comments
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      
      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Process comments and add user names
      const processedComments = commentsData?.map(comment => {
        const profile = profilesData?.find(p => p.user_id === comment.user_id);
        return {
          ...comment,
          user_name: profile?.display_name || profile?.full_name || 'Unknown User'
        };
      }) || [];

      // Build threaded structure
      const threadedComments = buildCommentTree(processedComments);
      setComments(threadedComments);
    } catch (err: any) {
      console.error('Error fetching comments:', err);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const buildCommentTree = (flatComments: any[]): Comment[] => {
    const commentMap = new Map();
    const rootComments: Comment[] = [];

    // Create a map for quick lookup
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Build the tree structure
    flatComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id);
      
      if (comment.reply_to) {
        const parent = commentMap.get(comment.reply_to);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('task_comments_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${task.id}`
        },
        (payload) => {
          console.log('Comment change received:', payload);
          fetchComments(); // Refresh comments on any change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCommentSubmit = async (commentData: {
    comment: string;
    content_type: 'plain' | 'markdown';
    mentions: string[];
    attachments: any[];
    reply_to?: string | null;
  }) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: task.id,
          user_id: user?.id,
          comment: commentData.comment,
          content_type: commentData.content_type,
          mentions: commentData.mentions,
          attachments: commentData.attachments,
          reply_to: commentData.reply_to || null
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment added successfully"
      });

      setShowCommentForm(false);
      // Optimistically refresh comments immediately
      fetchComments();
    } catch (err: any) {
      console.error('Error adding comment:', err);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive"
      });
    }
  };

  const handleEditComment = async (commentId: string, newContent: string, mentions: string[]) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .update({
          comment: newContent,
          mentions,
          edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment updated successfully"
      });
    } catch (err: any) {
      console.error('Error updating comment:', err);
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive"
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Comment deleted successfully"
      });
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments
            </CardTitle>
            <Badge variant="secondary">
              {comments.reduce((count, comment) => {
                const countReplies = (c: Comment): number => {
                  return 1 + (c.replies?.reduce((sum, reply) => sum + countReplies(reply), 0) || 0);
                };
                return count + countReplies(comment);
              }, 0)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
            >
              <Filter className="h-4 w-4 mr-1" />
              {filter === 'all' ? 'Show All' : 'Show Unread'}
            </Button>
            <Button
              size="sm"
              onClick={() => setShowCommentForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Comment
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ×
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Comment Form */}
        {showCommentForm && (
          <CommentForm
            onSubmit={handleCommentSubmit}
            onCancel={() => setShowCommentForm(false)}
            teamMembers={teamMembers}
            placeholder="Write a comment..."
          />
        )}

        {/* Comments List */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No comments yet</p>
            <p className="text-sm">Be the first to comment on this task</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                currentUserId={user?.id || ''}
                teamMembers={teamMembers}
                onReply={(commentId) => handleCommentSubmit({
                  comment: '',  // This won't be used since we're handling the form submit at the CommentItem level
                  content_type: 'plain',
                  mentions: [],
                  attachments: [],
                  reply_to: commentId
                })}
                onEdit={handleEditComment}
                onDelete={handleDeleteComment}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}