import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Check, X, Edit2, Calendar, User, Star, Flag } from 'lucide-react';
import { format } from 'date-fns';

interface InlineEditableFieldProps {
  value: any;
  type: 'text' | 'textarea' | 'select' | 'date' | 'user' | 'status' | 'priority';
  label?: string;
  options?: Array<{ value: string; label: string; icon?: React.ReactNode; color?: string }>;
  teamMembers?: Array<{ id: string; name: string; email?: string }>;
  isEditing: boolean;
  onChange: (value: any) => void;
  onSave: (value: any) => Promise<void>;
  onCancel: () => void;
  onEdit: () => void;
  placeholder?: string;
  className?: string;
  displayValue?: string;
  validator?: (value: any) => string | null;
  instantSave?: boolean; // New prop to control instant save behavior
}

export function InlineEditableField({
  value,
  type,
  label,
  options = [],
  teamMembers = [],
  isEditing,
  onChange,
  onSave,
  onCancel,
  onEdit,
  placeholder,
  className = '',
  displayValue,
  validator,
  instantSave = false
}: InlineEditableFieldProps) {
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      setEditValue(value);
      // Focus input after render
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
        if (textareaRef.current) textareaRef.current.focus();
      }, 0);
    }
  }, [isEditing, value]);

  const handleSave = async () => {
    if (validator) {
      const validationError = validator(editValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsSaving(true);
    setError(null);
    
    try {
      await onSave(editValue);
      onChange(editValue);
    } catch (err: any) {
      setError(err.message || 'შენახვისას მოხდა შეცდომა');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setError(null);
    onCancel();
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (type !== 'textarea') {
        // For non-textarea fields: Enter saves and exits
        e.preventDefault();
        try {
          await handleSave();
          onCancel();
        } catch (error) {
          // Error handling is done in handleSave
        }
      } else {
        // For textarea: Enter saves and exits, Shift+Enter adds new line
        if (!e.shiftKey) {
          e.preventDefault();
          try {
            await handleSave();
            onCancel();
          } catch (error) {
            // Error handling is done in handleSave
          }
        }
        // If Shift+Enter, allow default behavior (new line)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = async () => {
    // Auto-save on blur if value changed
    if (editValue !== value && !isSaving) {
      try {
        await handleSave();
        // Exit edit mode after successful save for all field types
        onCancel(); // This exits edit mode
      } catch (error) {
        // Error handling is done in handleSave
      }
    }
  };

  const handleSelectChange = async (newValue: any) => {
    setEditValue(newValue);
    
    // Validate first
    if (validator) {
      const validationError = validator(newValue);
      if (validationError) {
        setError(validationError);
        return;
      }
    }
    
    setError(null);
    onChange(newValue);
    
    // Auto-save immediately for select fields
    try {
      await onSave(newValue);
      // Exit edit mode after successful save for instant save fields
      if (instantSave || type === 'user' || type === 'select') {
        onCancel(); // This exits edit mode
      }
    } catch (error) {
      // Error handling is done in the save function
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const renderViewMode = () => {
    switch (type) {
      case 'user':
        if (!value || value === 'unassigned') {
          return (
            <Badge variant="outline" className="text-muted-foreground">
              გამოუნაწილებელი
            </Badge>
          );
        }
        const assignee = teamMembers.find(member => member.id === value);
        if (assignee) {
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6 ring-2 ring-primary/10">
                <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                  {getInitials(assignee.name)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{assignee.name}</span>
            </div>
          );
        }
        return <span className="text-muted-foreground">უცნობი მომხმარებელი</span>;

      case 'status':
        const statusOption = options.find(opt => opt.value === value);
        return statusOption ? (
          <Badge className={statusOption.color} variant="outline">
            <div className="flex items-center gap-2">
              {statusOption.icon}
              {statusOption.label}
            </div>
          </Badge>
        ) : <span>{value}</span>;

      case 'priority':
        const priorityOption = options.find(opt => opt.value === value);
        return priorityOption ? (
          <Badge className={priorityOption.color} variant="outline">
            <div className="flex items-center gap-2">
              {priorityOption.icon}
              {priorityOption.label}
            </div>
          </Badge>
        ) : <span>{value}</span>;

      case 'date':
        return value ? (
          <span className="font-medium">
            {format(new Date(value), 'MMM dd, yyyy')}
          </span>
        ) : (
          <span className="text-muted-foreground">თარიღი მითითებული არ არის</span>
        );

      case 'textarea':
        return value ? (
          <p className="whitespace-pre-wrap leading-relaxed">
            {value}
          </p>
        ) : (
          <span className="text-muted-foreground italic">აღწერა არ არის</span>
        );

      default:
        return (
          <span className={value ? '' : 'text-muted-foreground italic'}>
            {displayValue || value || placeholder || 'მნიშვნელობა არ არის'}
          </span>
        );
    }
  };

  const renderEditMode = () => {
    switch (type) {
      case 'textarea':
        return (
          <Textarea
            ref={textareaRef}
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="min-h-[80px] resize-none"
            disabled={isSaving}
          />
        );

      case 'select':
        return (
          <Select 
            value={editValue || ''} 
            onValueChange={handleSelectChange}
            disabled={isSaving}
          >
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'user':
        return (
          <Select 
            value={editValue || 'unassigned'} 
            onValueChange={handleSelectChange}
            disabled={isSaving}
          >
            <SelectTrigger>
              <SelectValue placeholder="აირჩიეთ პასუხისმგებელი" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">გამოუნაწილებელი</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    {member.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'date':
        return (
          <Input
            ref={inputRef}
            type="date"
            value={editValue || ''}
            onChange={async (e) => {
              const newValue = e.target.value;
              setEditValue(newValue);
              
              // Validate first
              if (validator) {
                const validationError = validator(newValue);
                if (validationError) {
                  setError(validationError);
                  return;
                }
              }
              
              setError(null);
              onChange(newValue);
              
              // Auto-save immediately on date change
              try {
                await onSave(newValue);
                // Exit edit mode after successful save
                onCancel();
              } catch (error) {
                // Error handling is done in the save function
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
          />
        );

      default:
        return (
          <Input
            ref={inputRef}
            value={editValue || ''}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isSaving}
          />
        );
    }
  };

  if (!isEditing) {
    return (
      <div 
        className={`group cursor-pointer hover:bg-muted/30 rounded-md p-2 -m-2 transition-colors ${className}`}
        onClick={onEdit}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            {renderViewMode()}
          </div>
          <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity ml-2 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {renderEditMode()}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {isSaving && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          შენახვა...
        </div>
      )}
      {/* Show cancel button only for textarea fields */}
      {type === 'textarea' && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
            className="h-7 px-2 text-xs opacity-70 hover:opacity-100"
          >
            <X className="h-3 w-3 mr-1" />
            გაუქმება
          </Button>
        </div>
      )}
    </div>
  );
}