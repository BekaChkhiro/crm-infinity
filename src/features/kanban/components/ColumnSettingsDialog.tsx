import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { GripVertical, Edit, Trash2, Plus } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { supabase } from '@/core/config/client';

interface KanbanColumn {
  id: string;
  name: string;
  position: number;
  color: string;
  status_value: string;
  project_id: string;
}

interface ColumnSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

const PREDEFINED_STATUSES = [
  'To Do',
  'In Progress', 
  'Review',
  'Testing',
  'Done',
  'Blocked',
  'Backlog',
  'Archive'
];

const DEFAULT_COLORS = [
  '#6b7280', '#ef4444', '#f97316', '#f59e0b', 
  '#eab308', '#84cc16', '#22c55e', '#10b981', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', 
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
];

export function ColumnSettingsDialog({ 
  open, 
  onOpenChange, 
  projectId, 
  onSuccess 
}: ColumnSettingsDialogProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchColumns();
    }
  }, [open, projectId]);

  const fetchColumns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (error) throw error;
      setColumns(data || []);
    } catch (err: unknown) {
      console.error('Error fetching columns:', err);
      toast({
        title: "Error",
        description: "Failed to load columns",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateColumn = (columnId: string, updates: Partial<KanbanColumn>) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, ...updates } : col
    ));
  };

  const addNewColumn = () => {
    const newColumn: KanbanColumn = {
      id: 'temp-' + Date.now(),
      name: 'New Column',
      position: Math.max(0, ...columns.map(c => c.position)) + 1,
      color: DEFAULT_COLORS[columns.length % DEFAULT_COLORS.length],
      status_value: 'New Column',
      project_id: projectId
    };
    setColumns(prev => [...prev, newColumn]);
  };

  const removeColumn = (columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));
  };

  const reorderColumns = (fromIndex: number, toIndex: number) => {
    const newColumns = [...columns];
    const [moved] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, moved);
    
    // Update positions
    newColumns.forEach((col, index) => {
      col.position = index;
    });
    
    setColumns(newColumns);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Delete removed columns (temp IDs that were deleted)
      const existingColumns = columns.filter(col => !col.id.startsWith('temp-'));
      const newColumns = columns.filter(col => col.id.startsWith('temp-'));

      // Update existing columns
      for (const column of existingColumns) {
        const { error } = await supabase
          .from('kanban_columns')
          .update({
            name: column.name,
            position: column.position,
            color: column.color,
            status_value: column.status_value
          })
          .eq('id', column.id);

        if (error) throw error;
      }

      // Insert new columns
      for (const column of newColumns) {
        const { error } = await supabase
          .from('kanban_columns')
          .insert({
            project_id: projectId,
            name: column.name,
            position: column.position,
            color: column.color,
            status_value: column.status_value
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Column settings saved successfully"
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Error saving columns:', err);
      toast({
        title: "Error", 
        description: "Failed to save column settings",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kanban Column Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure your kanban columns and map them to task statuses. You can reorder, customize, and control how tasks are organized.
          </p>

          <div className="space-y-3">
            {columns.map((column, index) => (
              <Card key={column.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: column.color }}
                    />
                    <span className="font-medium">{column.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      Position {column.position}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeColumn(column.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor={`name-${column.id}`}>Column Name</Label>
                      <Input
                        id={`name-${column.id}`}
                        value={column.name}
                        onChange={(e) => updateColumn(column.id, { name: e.target.value })}
                        placeholder="Column name"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`status-${column.id}`}>Task Status Value</Label>
                      <Select
                        value={column.status_value}
                        onValueChange={(value) => updateColumn(column.id, { status_value: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PREDEFINED_STATUSES.map(status => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                          <SelectItem value={column.name}>
                            Custom: {column.name}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {DEFAULT_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-6 h-6 rounded-full border transition-all hover:scale-110 ${
                              column.color === color ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => updateColumn(column.id, { color })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button onClick={addNewColumn} className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add New Column
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}