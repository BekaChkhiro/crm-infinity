import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { supabase } from '@/core/config/client';

interface KanbanColumnData {
  id: string;
  name: string;
  position: number;
  color: string;
  project_id: string;
}

interface KanbanColumnFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column?: KanbanColumnData | null;
  projectId: string;
  onSuccess: () => void;
  maxPosition: number;
}

const DEFAULT_COLORS = [
  '#6b7280', '#ef4444', '#f97316', '#f59e0b', 
  '#eab308', '#84cc16', '#22c55e', '#10b981', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', 
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
];

export function KanbanColumnForm({ 
  open, 
  onOpenChange, 
  column, 
  projectId, 
  onSuccess,
  maxPosition 
}: KanbanColumnFormProps) {
  const [formData, setFormData] = useState({
    name: column?.name || '',
    color: column?.color || DEFAULT_COLORS[0]
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (column) {
      setFormData({
        name: column.name,
        color: column.color
      });
    } else {
      setFormData({
        name: '',
        color: DEFAULT_COLORS[0]
      });
    }
  }, [column]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Column name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      if (column) {
        // Update existing column
        const { error } = await supabase
          .from('kanban_columns')
          .update({
            name: formData.name.trim(),
            color: formData.color
          })
          .eq('id', column.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Column updated successfully"
        });
      } else {
        // Create new column
        const { error } = await supabase
          .from('kanban_columns')
          .insert({
            project_id: projectId,
            name: formData.name.trim(),
            color: formData.color,
            position: maxPosition + 1
          });

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Column created successfully"
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Error saving column:', err);
      toast({
        title: "Error",
        description: `Failed to ${column ? 'update' : 'create'} column`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {column ? 'Edit Column' : 'Add New Column'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Column Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter column name..."
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Column Color</Label>
            <div className="grid grid-cols-8 gap-2">
              {DEFAULT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                    formData.color === color ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Custom:</span>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-8 h-8 rounded border border-border"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (column ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}