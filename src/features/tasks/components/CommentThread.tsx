import React from 'react';
import { CommentItem } from './CommentItem';

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
  user_name?: string;
  replies?: Comment[];
}

interface CommentThreadProps {
  comment: Comment;
  currentUserId: string;
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, newContent: string, mentions: string[]) => void;
  onDelete: (commentId: string) => void;
  depth?: number;
}

export function CommentThread({
  comment,
  currentUserId,
  teamMembers,
  onReply,
  onEdit,
  onDelete,
  depth = 0
}: CommentThreadProps) {
  const maxDepth = 5; // Maximum nesting depth

  return (
    <div className="space-y-3">
      <CommentItem
        comment={comment}
        currentUserId={currentUserId}
        teamMembers={teamMembers}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        depth={depth}
      />
      
      {/* Render replies with increased depth */}
      {comment.replies && comment.replies.length > 0 && (
        <div className={`ml-6 space-y-3 ${depth >= maxDepth ? 'border-l-2 border-muted pl-4' : ''}`}>
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              teamMembers={teamMembers}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}