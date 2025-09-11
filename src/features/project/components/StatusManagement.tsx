import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { GripVertical, Edit, Trash2, Plus, Settings } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { supabase } from '@/core/config/client';

interface ProjectStatus {
  id: string;
  name: string;
  position: number;
  color: string;
  project_id: string;
  is_default?: boolean;
}

interface StatusManagementProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
}

const DEFAULT_COLORS = [
  '#6b7280', '#ef4444', '#f97316', '#f59e0b', 
  '#eab308', '#84cc16', '#22c55e', '#10b981', 
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', 
  '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
];

const DEFAULT_STATUSES = [
  { name: 'To Do', color: '#6b7280', position: 0 },
  { name: 'In Progress', color: '#0ea5e9', position: 1 },
  { name: 'Review', color: '#f59e0b', position: 2 },
  { name: 'Done', color: '#22c55e', position: 3 }
];

export function StatusManagement({ 
  open, 
  onOpenChange, 
  projectId, 
  onSuccess 
}: StatusManagementProps) {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchStatuses();
    }
  }, [open, projectId]);

  const fetchStatuses = async () => {
    try {
      setLoading(true);
      
      // First check if project_statuses table exists, if not use defaults
      const { data, error } = await supabase
        .from('project_statuses')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (error) {
        // If table doesn't exist or is empty, create default statuses
        console.log('No existing statuses, using defaults');
        const defaultStatuses = DEFAULT_STATUSES.map((status, index) => ({
          id: `temp-${index}`,
          name: status.name,
          position: status.position,
          color: status.color,
          project_id: projectId
        }));
        setStatuses(defaultStatuses);
      } else if (data.length === 0) {
        // Project exists but no statuses defined, use defaults
        const defaultStatuses = DEFAULT_STATUSES.map((status, index) => ({
          id: `temp-${index}`,
          name: status.name,
          position: status.position,
          color: status.color,
          project_id: projectId
        }));
        setStatuses(defaultStatuses);
      } else {
        setStatuses(data);
      }
    } catch (err: unknown) {
      console.error('Error fetching statuses:', err);
      toast({
        title: "შეცდომა",
        description: "სტატუსების ჩატვირთვა ვერ მოხერხდა",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (statusId: string, updates: Partial<ProjectStatus>) => {
    setStatuses(prev => prev.map(status => 
      status.id === statusId ? { ...status, ...updates } : status
    ));
  };

  const addNewStatus = () => {
    const newStatus: ProjectStatus = {
      id: 'temp-' + Date.now(),
      name: 'ახალი სტატუსი',
      position: Math.max(0, ...statuses.map(s => s.position)) + 1,
      color: DEFAULT_COLORS[statuses.length % DEFAULT_COLORS.length],
      project_id: projectId
    };
    setStatuses(prev => [...prev, newStatus]);
  };

  const removeStatus = (statusId: string) => {
    setStatuses(prev => prev.filter(status => status.id !== statusId));
  };

  const reorderStatuses = (fromIndex: number, toIndex: number) => {
    const newStatuses = [...statuses];
    const [moved] = newStatuses.splice(fromIndex, 1);
    newStatuses.splice(toIndex, 0, moved);
    
    // Update positions
    newStatuses.forEach((status, index) => {
      status.position = index;
    });
    
    setStatuses(newStatuses);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Create table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS project_statuses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          color VARCHAR(7) NOT NULL DEFAULT '#6b7280',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(project_id, name),
          UNIQUE(project_id, position)
        );
      `;

      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: createTableQuery
      });

      // If we can't create the table via RPC, try direct operations
      if (createError) {
        console.log('Table creation via RPC failed, continuing with operations');
      }

      // Delete all existing statuses for this project
      await supabase
        .from('project_statuses')
        .delete()
        .eq('project_id', projectId);

      // Insert new statuses
      const statusesToInsert = statuses.map(status => ({
        project_id: projectId,
        name: status.name,
        position: status.position,
        color: status.color
      }));

      const { error: insertError } = await supabase
        .from('project_statuses')
        .insert(statusesToInsert);

      if (insertError) throw insertError;

      toast({
        title: "წარმატება",
        description: "სტატუსები წარმატებით შენახულია"
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error('Error saving statuses:', err);
      toast({
        title: "შეცდომა", 
        description: "სტატუსების შენახვა ვერ მოხერხდა",
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
            <DialogTitle>იტვირთება...</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>სტატუსების მართვა</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            აკონფიგურირეთ თქვენი პროექტის სტატუსები. კანბან კოლუმნები ავტომატურად შეიქმნება ამ სტატუსების მიხედვით.
          </p>

          <div className="space-y-3">
            {statuses.map((status, index) => (
              <Card key={status.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="font-medium">{status.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      პოზიცია {status.position}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStatus(status.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`name-${status.id}`}>სტატუსის სახელი</Label>
                      <Input
                        id={`name-${status.id}`}
                        value={status.name}
                        onChange={(e) => updateStatus(status.id, { name: e.target.value })}
                        placeholder="სტატუსის სახელი"
                      />
                    </div>

                    <div>
                      <Label>ფერი</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {DEFAULT_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-6 h-6 rounded-full border transition-all hover:scale-110 ${
                              status.color === color ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => updateStatus(status.id, { color })}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button onClick={addNewStatus} className="w-full" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            ახალი სტატუსის დამატება
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            გაუქმება
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'ინახება...' : 'ცვლილებების შენახვა'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}