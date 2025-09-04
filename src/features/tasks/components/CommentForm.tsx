import React, { useState, useRef } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { 
  Bold, 
  Italic, 
  Link, 
  List, 
  AtSign, 
  Paperclip, 
  Eye, 
  Send,
  X 
} from 'lucide-react';
import { MentionInput } from '@/shared/components/forms/MentionInput';

interface CommentFormProps {
  onSubmit: (data: {
    comment: string;
    content_type: 'plain' | 'markdown';
    mentions: string[];
    attachments: any[];
    reply_to?: string | null;
  }) => void;
  onCancel: () => void;
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  replyTo?: string | null;
  placeholder?: string;
  initialValue?: string;
}

export function CommentForm({ 
  onSubmit, 
  onCancel, 
  teamMembers, 
  replyTo, 
  placeholder = "Write a comment...",
  initialValue = ""
}: CommentFormProps) {
  const [content, setContent] = useState(initialValue);
  const [contentType, setContentType] = useState<'plain' | 'markdown'>('plain');
  const [mentions, setMentions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        comment: content.trim(),
        content_type: contentType,
        mentions,
        attachments,
        reply_to: replyTo
      });
      
      // Reset form
      setContent('');
      setMentions([]);
      setAttachments([]);
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertFormatting = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    
    const newContent = 
      content.substring(0, start) + 
      before + selectedText + after + 
      content.substring(end);
    
    setContent(newContent);
    setContentType('markdown');
    
    // Focus and set cursor position
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + before.length + selectedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  const handleMentionSelect = (userId: string, userName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = content.substring(0, cursorPos);
    const textAfterCursor = content.substring(cursorPos);
    
    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = content.substring(0, lastAtIndex);
      const newContent = beforeAt + `@${userName} ` + textAfterCursor;
      
      setContent(newContent);
      setMentions(prev => [...prev.filter(id => id !== userId), userId]);
      
      // Set cursor after the mention
      setTimeout(() => {
        const newPosition = lastAtIndex + userName.length + 2;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }
  };

  const renderPreview = () => {
    if (contentType === 'plain') {
      return (
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      );
    }

    // Basic markdown rendering for preview
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');

    return (
      <div 
        className="prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {replyTo && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Replying to comment</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onCancel()}
                className="h-5 w-5 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}

          <Tabs value={contentType === 'markdown' ? 'write' : 'write'} className="w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {contentType === 'markdown' && (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('**', '**')}
                      className="h-7 w-7 p-0"
                    >
                      <Bold className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('*', '*')}
                      className="h-7 w-7 p-0"
                    >
                      <Italic className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('[', '](url)')}
                      className="h-7 w-7 p-0"
                    >
                      <Link className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => insertFormatting('- ')}
                      className="h-7 w-7 p-0"
                    >
                      <List className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              
              <TabsList className="grid w-auto grid-cols-2">
                <TabsTrigger value="write">Write</TabsTrigger>
                <TabsTrigger value="preview" disabled={!content.trim()}>
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="write" className="mt-3">
              <MentionInput
                ref={textareaRef}
                value={content}
                onChange={setContent}
                onMentionSelect={handleMentionSelect}
                teamMembers={teamMembers}
                placeholder={placeholder}
                rows={4}
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-3">
              <div className="min-h-[100px] p-3 border rounded-md bg-muted/30">
                {content.trim() ? renderPreview() : (
                  <span className="text-muted-foreground">Nothing to preview</span>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Mentions Display */}
          {mentions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Mentioning:</span>
              {mentions.map(userId => {
                const member = teamMembers.find(m => m.id === userId);
                return member ? (
                  <Badge key={userId} variant="secondary" className="text-xs">
                    <AtSign className="h-3 w-3 mr-1" />
                    {member.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setContentType(contentType === 'plain' ? 'markdown' : 'plain')}
              >
                {contentType === 'plain' ? 'Enable Formatting' : 'Disable Formatting'}
              </Button>
              
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
              >
                <Paperclip className="h-4 w-4 mr-1" />
                Attach File
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!content.trim() || isSubmitting}
              >
                <Send className="h-4 w-4 mr-1" />
                {isSubmitting ? 'Posting...' : replyTo ? 'Reply' : 'Comment'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}