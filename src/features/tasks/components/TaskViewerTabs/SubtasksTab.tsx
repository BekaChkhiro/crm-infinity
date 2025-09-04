import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Badge } from '@/shared/components/ui/badge';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Separator } from '@/shared/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { Plus, GripVertical, Edit, Trash2, Check, X, User, AlertCircle, Timer, Target, CheckCircle2 } from 'lucide-react';
import { Task } from '../TaskCard';
import { supabase } from '@/core/config/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SubtasksTabProps {
  parentTask: Task;
  subtasks: Task[];
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  onSubtasksUpdate: () => void;
}

const priorityConfig = {
  'low': { 
    color: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:border-slate-800',
    indicator: 'bg-slate-400',
    icon: Timer
  },
  'medium': { 
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-800',
    indicator: 'bg-blue-500',
    icon: Target
  },
  'high': { 
    color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-800',
    indicator: 'bg-orange-500',
    icon: AlertCircle
  },
  'critical': { 
    color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800',
    indicator: 'bg-red-500',
    icon: AlertCircle
  },
};

// Sortable Subtask Item Component
interface SortableSubtaskItemProps {
  subtask: Task;
  assignee: { id: string; name: string; email?: string } | undefined;
  teamMembers: Array<{ id: string; name: string; email?: string }>;
  isEditing: boolean;
  editTitle: string;
  editAssignee: string;
  editPriority: 'low' | 'medium' | 'high' | 'critical';
  onEditStart: (subtask: Task) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onEditTitleChange: (title: string) => void;
  onEditAssigneeChange: (assignee: string) => void;
  onEditPriorityChange: (priority: 'low' | 'medium' | 'high' | 'critical') => void;
  onStatusToggle: () => void;
  onDelete: () => void;
  getInitials: (name: string) => string;
}

function SortableSubtaskItem({
  subtask,
  assignee,
  teamMembers,
  isEditing,
  editTitle,
  editAssignee,
  editPriority,
  onEditStart,
  onEditSave,
  onEditCancel,
  onEditTitleChange,
  onEditAssigneeChange,
  onEditPriorityChange,
  onStatusToggle,
  onDelete,
  getInitials,
}: SortableSubtaskItemProps) {

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityInfo = priorityConfig[subtask.priority as keyof typeof priorityConfig];
  const PriorityIcon = priorityInfo.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-105' : ''}`}
    >
      <Card className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Checkbox */}
            <Checkbox
              checked={subtask.status === 'done'}
              onCheckedChange={onStatusToggle}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    value={editTitle}
                    onChange={(e) => onEditTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onEditSave();
                      if (e.key === 'Escape') onEditCancel();
                    }}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={editAssignee} onValueChange={onEditAssigneeChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">გამოუნაწილებელი</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={editPriority} onValueChange={onEditPriorityChange}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityConfig).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={onEditSave}
                      className="h-7 text-xs flex-1"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      შენახვა
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onEditCancel}
                      className="h-7 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      გაუქმება
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 
                      className={`font-medium leading-tight ${
                        subtask.status === 'done' 
                          ? 'line-through text-muted-foreground' 
                          : 'text-card-foreground'
                      }`}
                    >
                      {subtask.title}
                    </h4>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEditStart(subtask)}
                        className="h-8 w-8 p-0 hover:bg-muted/50"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onDelete}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Metadata */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`${priorityInfo.color} border text-xs font-medium px-2 py-1 inline-flex items-center gap-1`}
                        variant="outline"
                      >
                        <PriorityIcon className="h-3 w-3" />
                        {subtask.priority}
                      </Badge>
                      {subtask.status === 'done' && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          დასრულებულია
                        </Badge>
                      )}
                    </div>
                    
                    {assignee && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6 ring-2 ring-primary/10">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                            {getInitials(assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground font-medium">
                          {assignee.name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SubtasksTab({ parentTask, subtasks, teamMembers, onSubtasksUpdate }: SubtasksTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskAssignee, setNewSubtaskAssignee] = useState('unassigned');
  const [newSubtaskPriority, setNewSubtaskPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAssignee, setEditAssignee] = useState('unassigned');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [sortedSubtasks, setSortedSubtasks] = useState<Task[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subtaskToDelete, setSubtaskToDelete] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Keep local sorted list in sync with props
  React.useEffect(() => {
    console.log('SubtasksTab received new subtasks props:', subtasks);
    
    // Deep compare subtasks to prevent unnecessary re-renders
    const currentSubtaskIds = sortedSubtasks.map(task => task.id).join(',');
    const newSubtaskIds = subtasks.map(task => task.id).join(',');
    
    // Only resort if the subtasks have actually changed
    if (currentSubtaskIds !== newSubtaskIds || subtasks.some((task, i) => 
      sortedSubtasks[i] && (task.status !== sortedSubtasks[i].status || task.title !== sortedSubtasks[i].title || task.priority !== sortedSubtasks[i].priority || task.assignee_id !== sortedSubtasks[i].assignee_id))) {
      console.log('Subtasks updated, resorting list');
      const sorted = [...subtasks].sort((a, b) => (a.subtask_order || 0) - (b.subtask_order || 0));
      console.log('Setting sorted subtasks:', sorted);
      setSortedSubtasks(sorted);
    }
  }, [subtasks]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeIndex = sortedSubtasks.findIndex(item => item.id === active.id);
    const overIndex = sortedSubtasks.findIndex(item => item.id === over.id);

    if (activeIndex !== -1 && overIndex !== -1) {
      const newOrder = arrayMove(sortedSubtasks, activeIndex, overIndex);
      setSortedSubtasks(newOrder);

      // Update database with new order
      try {
        const updates = newOrder.map((subtask, index) => ({
          id: subtask.id,
          subtask_order: index
        }));

        for (const update of updates) {
          await supabase
            .from('tasks')
            .update({ subtask_order: update.subtask_order })
            .eq('id', update.id);
        }

        onSubtasksUpdate();
      } catch (error: any) {
        console.error('Error updating subtask order:', error);
        toast({
          title: "შეცდომა",
          description: "სუბთასქების მიმდევრობის განახლება ვერ მოხერხდა",
          variant: "destructive"
        });
        // Revert to original order on error
        setSortedSubtasks([...subtasks].sort((a, b) => (a.subtask_order || 0) - (b.subtask_order || 0)));
      }
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim() || !user) return;

    setIsAdding(true);
    try {
      // First, shift all existing subtasks down by incrementing their order
      if (sortedSubtasks.length > 0) {
        // Create updates for all existing subtasks
        const updates = sortedSubtasks.map(subtask => ({
          id: subtask.id,
          subtask_order: (subtask.subtask_order || 0) + 1
        }));

        // Update all existing subtasks order
        for (const update of updates) {
          await supabase
            .from('tasks')
            .update({ subtask_order: update.subtask_order })
            .eq('id', update.id);
        }
      }

      // Now insert the new subtask at order 0 (top position)
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: newSubtaskTitle.trim(),
          project_id: parentTask.project_id,
          parent_task_id: parentTask.id,
          is_subtask: true,
          status: 'todo',
          priority: newSubtaskPriority,
          assignee_id: newSubtaskAssignee === 'unassigned' ? null : newSubtaskAssignee,
          created_by: user.id,
          subtask_order: 0 // Put at the top of the list
        });

      if (error) throw error;

      setNewSubtaskTitle('');
      setNewSubtaskAssignee('unassigned');
      setNewSubtaskPriority('medium');
      onSubtasksUpdate();

      toast({
        title: "წარმატება",
        description: "სუბთასქი წარმატებით დაემატა"
      });
    } catch (error: any) {
      console.error('Error adding subtask:', error);
      toast({
        title: "შეცდომა",
        description: "სუბთასქის დამატება ვერ მოხერხდა",
        variant: "destructive"
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleStatusToggle = async (subtaskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'done' ? 'todo' : 'done';
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', subtaskId);

      if (error) throw error;
      onSubtasksUpdate();

      toast({
        title: "წარმატება",
        description: `სუბთასქი ${newStatus === 'done' ? 'დასრულდა' : 'ხელახლა გაიხსნა'}`
      });
    } catch (error: any) {
      console.error('Error updating subtask status:', error);
      toast({
        title: "შეცდომა",
        description: "სუბთასქის სტატუსის განახლება ვერ მოხერხდა",
        variant: "destructive"
      });
    }
  };

  const handleEditStart = (subtask: Task) => {
    setEditingId(subtask.id);
    setEditTitle(subtask.title);
    setEditAssignee(subtask.assignee_id || 'unassigned');
    setEditPriority(subtask.priority as 'low' | 'medium' | 'high' | 'critical');
  };

  const handleEditSave = async () => {
    if (!editTitle.trim() || !editingId) return;

    // Store values before clearing state
    const saveData = {
      title: editTitle.trim(),
      assignee_id: editAssignee === 'unassigned' ? null : editAssignee,
      priority: editPriority,
      taskId: editingId
    };

    console.log('Saving subtask with data:', saveData);

    // First save to database, THEN update UI
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          title: saveData.title,
          assignee_id: saveData.assignee_id,
          priority: saveData.priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', saveData.taskId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Database update successful:', data);

      // Only update UI after successful database save
      setEditingId(null);
      setEditTitle('');
      setEditAssignee('unassigned');
      setEditPriority('medium');
      
      // Refresh UI with new data
      onSubtasksUpdate();

      toast({
        title: "წარმატება",
        description: "სუბთასქი წარმატებით განახლდა"
      });
    } catch (error: any) {
      console.error('Error updating subtask:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      toast({
        title: "შეცდომა",
        description: `სუბთასქის განახლება ვერ მოხერხდა: ${error.message}`,
        variant: "destructive"
      });
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditTitle('');
    setEditAssignee('unassigned');
    setEditPriority('medium');
  };

  const handleDeleteClick = (subtaskId: string) => {
    setSubtaskToDelete(subtaskId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!subtaskToDelete) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', subtaskToDelete);

      if (error) throw error;
      onSubtasksUpdate();

      toast({
        title: "წარმატება",
        description: "სუბთასქი წარმატებით წაიშალა"
      });
    } catch (error: any) {
      console.error('Error deleting subtask:', error);
      toast({
        title: "შეცდომა",
        description: "სუბთასქის წაშლა ვერ მოხერხდა",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setSubtaskToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setSubtaskToDelete(null);
  };

  return (
    <div className="h-full">
      {/* Add New Subtask Card */}
      <Card className="m-6 mb-4 border-dashed border-2 border-primary/20 hover:border-primary/40 transition-colors">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">Add New Subtask</h3>
            </div>
            
            <div className="space-y-3">
              <Input
                placeholder="What needs to be done?"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                className="text-sm border-2 focus:border-primary"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Assignee</label>
                  <Select value={newSubtaskAssignee} onValueChange={setNewSubtaskAssignee}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Unassigned
                        </div>
                      </SelectItem>
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
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select value={newSubtaskPriority} onValueChange={(value: any) => setNewSubtaskPriority(value)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="h-4 w-4" />
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim() || isAdding}
                className="w-full h-10 font-medium"
              >
                {isAdding ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subtask
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subtasks List */}
      <div className="mx-6 mb-6 space-y-3">
        {sortedSubtasks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12">
              <div className="text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <Target className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-muted-foreground">No subtasks yet</p>
                  <p className="text-sm text-muted-foreground">Break down this task into smaller, manageable pieces</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedSubtasks.map(s => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {sortedSubtasks.map((subtask) => {
                  const assignee = teamMembers.find(m => m.id === subtask.assignee_id);
                  
                  return (
                    <SortableSubtaskItem
                      key={subtask.id}
                      subtask={subtask}
                      assignee={assignee}
                      teamMembers={teamMembers}
                      isEditing={editingId === subtask.id}
                      editTitle={editTitle}
                      editAssignee={editAssignee}
                      editPriority={editPriority}
                      onEditStart={handleEditStart}
                      onEditSave={handleEditSave}
                      onEditCancel={handleEditCancel}
                      onEditTitleChange={setEditTitle}
                      onEditAssigneeChange={setEditAssignee}
                      onEditPriorityChange={setEditPriority}
                      onStatusToggle={() => handleStatusToggle(subtask.id, subtask.status)}
                      onDelete={() => handleDeleteClick(subtask.id)}
                      getInitials={getInitials}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>სუბთასქის წაშლა</AlertDialogTitle>
            <AlertDialogDescription>
              დარწმუნებული ხარ რომ გინდა ამ სუბთასქის წაშლა? ეს მოქმედება შეუცვლელია.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>
              გაუქმება
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              წაშლა
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}