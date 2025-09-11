import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/core/config/client';
import { useToast } from '@/shared/hooks/use-toast';

interface UseTaskAutoSaveProps {
  taskId: string;
  onTaskUpdate: () => void;
  debounceMs?: number;
}

export function useTaskAutoSave({ 
  taskId, 
  onTaskUpdate, 
  debounceMs = 500 
}: UseTaskAutoSaveProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();
  const debounceRef = useRef<NodeJS.Timeout>();

  const saveField = useCallback(async (field: string, value: any): Promise<void> => {
    if (!taskId) throw new Error('Task ID is required');

    setIsSaving(true);
    
    try {
      // Prepare the update object
      const updateData: Record<string, any> = {
        [field]: value === 'unassigned' ? null : value,
        updated_at: new Date().toISOString()
      };

      // Special handling for different field types
      if (field === 'due_date' && value) {
        updateData[field] = new Date(value).toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      setLastSaved(new Date());
      onTaskUpdate();
      
      // Signal other components that task was updated
      localStorage.setItem('taskUpdated', Date.now().toString());
      
      // Show subtle success toast
      toast({
        title: "შეინახა",
        description: "ცვლილებები წარმატებით შეინახა",
        duration: 1500,
      });
      
    } catch (error: any) {
      console.error(`Error updating ${field}:`, error);
      throw new Error(error.message || `შეცდომა ${field}-ის განახლებისას`);
    } finally {
      setIsSaving(false);
    }
  }, [taskId, onTaskUpdate, toast]);

  const debouncedSave = useCallback((field: string, value: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Clear existing timeout
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      setIsSaving(true);

      // Set new timeout
      debounceRef.current = setTimeout(async () => {
        try {
          await saveField(field, value);
          resolve();
        } catch (error) {
          reject(error);
        } finally {
          setIsSaving(false);
        }
      }, debounceMs);
    });
  }, [saveField, debounceMs]);

  const immediateSave = useCallback(async (field: string, value: any): Promise<void> => {
    // Clear any pending debounced saves
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    return saveField(field, value);
  }, [saveField]);

  // Validation functions
  const validators = {
    title: (value: string) => {
      if (!value?.trim()) return 'სათაური აუცილებელია';
      if (value.length > 255) return 'სათაური უნდა იყოს 255 სიმბოლოზე ნაკლები';
      return null;
    },
    
    description: (value: string) => {
      if (value && value.length > 2000) return 'აღწერა უნდა იყოს 2000 სიმბოლოზე ნაკლები';
      return null;
    },
    
    notes: (value: string) => {
      if (value && value.length > 5000) return 'შენიშვნები უნდა იყოს 5000 სიმბოლოზე ნაკლები';
      return null;
    },
    
    due_date: (value: string) => {
      if (!value) return null;
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) return 'დასრულების თარიღი არ შეიძლება იყოს წარსულში';
      return null;
    },
    
    priority: (value: string) => {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(value)) return 'არასწორი პრიორიტეტი';
      return null;
    },
    
    status: (value: string) => {
      const validStatuses = ['todo', 'in-progress', 'review', 'done'];
      if (!validStatuses.includes(value)) return 'არასწორი სტატუსი';
      return null;
    }
  };

  return {
    isSaving,
    lastSaved,
    saveField: immediateSave,
    debouncedSave,
    validators
  };
}