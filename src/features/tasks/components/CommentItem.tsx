import React, { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { 
  Reply, 
  Edit, 
  Trash2, 
  MoreHorizontal, 
  AtSign,
  Clock 
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/shared/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { CommentForm } from './CommentForm';

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
}

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  onReply: (commentId: string) => void;
  onEdit: (commentId: string, newContent: string, mentions: string[]) => void;
  onDelete: (commentId: string) => void;
  depth?: number;
}

export function CommentItem({
  comment,
  currentUserId,
  teamMembers,
  onReply,
  onEdit,
  onDelete,
  depth = 0
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const isOwner = comment.user_id === currentUserId;
  const canReply = depth < 5; // Limit reply depth

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const renderContent = () => {
    if (comment.content_type === 'markdown') {
      // Basic markdown rendering
      let html = comment.comment
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ul class="list-disc list-inside">$1</ul>')
        .replace(/\n/g, '<br>');

      // Highlight mentions
      if (comment.mentions && comment.mentions.length > 0) {
        comment.mentions.forEach(userId => {
          const member = teamMembers.find(m => m.id === userId);
          if (member) {
            const mentionRegex = new RegExp(`@${member.name}\\b`, 'g');
            html = html.replace(mentionRegex, `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">@${member.name}</span>`);
          }
        });
      }

      return (
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    // Plain text with mention highlighting
    let content = comment.comment;
    if (comment.mentions && comment.mentions.length > 0) {
      comment.mentions.forEach(userId => {
        const member = teamMembers.find(m => m.id === userId);
        if (member) {
          const mentionRegex = new RegExp(`@${member.name}\\b`, 'g');
          content = content.replace(mentionRegex, `@${member.name}`);
        }
      });
    }

    return <p className="whitespace-pre-wrap">{content}</p>;
  };

  const handleEditSubmit = (data: {
    comment: string;
    content_type: 'plain' | 'markdown';
    mentions: string[];
  }) => {
    onEdit(comment.id, data.comment, data.mentions);
    setIsEditing(false);
  };

  const handleReplySubmit = (data: {
    comment: string;
    content_type: 'plain' | 'markdown';
    mentions: string[];
    attachments: any[];
  }) => {
    // Add the reply_to parameter to link this comment to the parent
    onReply(comment.id);
    setShowReplyForm(false);
  };

  if (isEditing) {
    return (
      <Card className={`${depth > 0 ? 'ml-2' : ''}`}>
        <CardContent className="p-4">
          <CommentForm
            onSubmit={handleEditSubmit}
            onCancel={() => setIsEditing(false)}
            teamMembers={teamMembers}
            placeholder="Edit your comment..."
            initialValue={comment.comment}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={`${depth > 0 ? 'ml-2 border-l-4 border-l-muted' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs">
                {getInitials(comment.user_name || 'U')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">
                  {comment.user_name || 'Unknown User'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
                {comment.edited && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    <Edit className="h-2.5 w-2.5 mr-1" />
                    Edited
                  </Badge>
                )}
                {comment.mentions && comment.mentions.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    <AtSign className="h-2.5 w-2.5 mr-1" />
                    {comment.mentions.length}
                  </Badge>
                )}
              </div>
              
              <div className="text-sm">
                {renderContent()}
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                {canReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowReplyForm(!showReplyForm)}
                    className="h-7 px-2 text-xs"
                  >
                    <Reply className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                )}
                
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit className="h-3 w-3 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                onDelete(comment.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inline reply form */}
      {showReplyForm && (
        <div className="mt-2 ml-8">
          <CommentForm
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReplyForm(false)}
            teamMembers={teamMembers}
            placeholder={`Reply to ${comment.user_name}...`}
            replyTo={comment.id}
          />
        </div>
      )}
    </>
  );
}