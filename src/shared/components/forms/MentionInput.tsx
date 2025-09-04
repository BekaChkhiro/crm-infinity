import React, { useState, forwardRef, useRef, useImperativeHandle } from 'react';
import { Textarea } from '@/shared/components/ui/textarea';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { AtSign } from 'lucide-react';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onMentionSelect: (userId: string, userName: string) => void;
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  placeholder?: string;
  rows?: number;
}

export const MentionInput = forwardRef<HTMLTextAreaElement, MentionInputProps>(
  ({ value, onChange, onMentionSelect, teamMembers, placeholder, rows = 4 }, ref) => {
    const [showMentions, setShowMentions] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => textareaRef.current!);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;
      
      onChange(newValue);
      
      // Check for @ mentions
      const textBeforeCursor = newValue.substring(0, cursorPos);
      const atIndex = textBeforeCursor.lastIndexOf('@');
      
      if (atIndex !== -1) {
        const textAfterAt = textBeforeCursor.substring(atIndex + 1);
        
        // Only show mentions if @ is at start or after whitespace
        const charBeforeAt = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
        
        if (/\s/.test(charBeforeAt) || atIndex === 0) {
          if (textAfterAt.includes(' ')) {
            setShowMentions(false);
          } else {
            setMentionSearch(textAfterAt);
            setShowMentions(true);
            
            // Calculate position for mention dropdown
            const textarea = textareaRef.current;
            if (textarea) {
              const rect = textarea.getBoundingClientRect();
              const lines = textBeforeCursor.split('\n');
              const currentLine = lines.length - 1;
              const charInLine = lines[currentLine].length;
              
              setMentionPosition({
                top: rect.top + (currentLine * 20) + 30,
                left: rect.left + (charInLine * 8)
              });
            }
          }
        } else {
          setShowMentions(false);
        }
      } else {
        setShowMentions(false);
      }
    };

    const handleMentionClick = (member: { id: string; name: string }) => {
      onMentionSelect(member.id, member.name);
      setShowMentions(false);
      setMentionSearch('');
    };

    const filteredMembers = teamMembers.filter(member =>
      member.name.toLowerCase().includes(mentionSearch.toLowerCase())
    );

    const getInitials = (name: string) => {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    return (
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          rows={rows}
          className="resize-none"
        />
        
        {showMentions && filteredMembers.length > 0 && (
          <Card className="absolute z-50 w-64 shadow-lg" style={{
            top: mentionPosition.top,
            left: mentionPosition.left
          }}>
            <CardContent className="p-2">
              <div className="text-xs text-muted-foreground mb-2 flex items-center">
                <AtSign className="h-3 w-3 mr-1" />
                Mention someone
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {filteredMembers.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => handleMentionClick(member)}
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {member.name}
                      </div>
                      {member.email && (
                        <div className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }
);