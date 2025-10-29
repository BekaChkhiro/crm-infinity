import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/components/ui/form';
import { Task } from './TaskCard';
import { FolderOpen, Calendar, User, Star, Clock, Paperclip, DollarSign } from 'lucide-react';
import { useGlobalTaskEdit } from '@/contexts/GlobalTaskEditContext';
import { FileUpload, FileUploadItem } from '@/components/ui/file-upload';
import { createStatusMapping } from '@/features/kanban/utils/statusMapping';

const taskFormSchema = z.object({
  title: z.string().min(1, 'სათაური აუცილებელია').max(255, 'სათაური უნდა იყოს 255 სიმბოლოზე ნაკლები'),
  description: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  assignee_id: z.string().optional(),
  due_date: z.string().refine((val) => {
    if (!val) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(val);
    return dueDate >= today;
  }, 'დასრულების თარიღი არ შეიძლება იყოს წარსულში'),
  project_id: z.string().optional(),
  budget: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    },
    z.number().min(0, 'ბიუჯეტი უნდა იყოს დადებითი რიცხვი').nullable().optional()
  ),
});

type TaskFormData = z.infer<typeof taskFormSchema>;

interface Project {
  id: string;
  name: string;
}

interface TaskFormProps {
  open: boolean | "embedded";
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskFormData & { files?: FileUploadItem[] }) => void;
  task?: Task | null;
  teamMembers?: Array<{ id: string; name: string }>;
  loading?: boolean;
  projects?: Array<Project>;
  defaultProjectId?: string;
  kanbanColumns?: Array<{ id: string; name: string; color: string }>;
  projectStatuses?: Array<{ id: string; name: string; color: string }>;
}

export function TaskForm({ open, onOpenChange, onSubmit, task, teamMembers = [], loading = false, projects = [], defaultProjectId, kanbanColumns = [], projectStatuses = [] }: TaskFormProps) {
  const { setMode } = useGlobalTaskEdit();
  const [uploadedFiles, setUploadedFiles] = React.useState<FileUploadItem[]>([]);
  
  // Debug: log projectStatuses when component renders
  React.useEffect(() => {
    console.log('TaskForm projectStatuses:', projectStatuses);
  }, [projectStatuses]);
  
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      notes: task?.notes || '',
      status: task?.status || 'To Do', // Use fixed default here, will be updated by useEffect
      priority: task?.priority || 'medium',
      assignee_id: task?.assignee_id || 'unassigned',
      due_date: task?.due_date || '',
      project_id: task?.project_id || defaultProjectId || '',
      budget: task?.budget || null,
    },
  });

  React.useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || '',
        notes: task.notes || '',
        status: task.status,
        priority: task.priority,
        assignee_id: task.assignee_id || 'unassigned',
        due_date: task.due_date || '',
        project_id: task.project_id,
        budget: task.budget || null,
      });
      setUploadedFiles([]);
    } else {
      // Only reset when creating new task and projectStatuses are available
      const defaultStatus = projectStatuses.length > 0 ? projectStatuses[0].name : 'To Do';
      form.reset({
        title: '',
        description: '',
        notes: '',
        status: defaultStatus,
        priority: 'medium',
        assignee_id: 'unassigned',
        due_date: '',
        project_id: defaultProjectId || '',
        budget: null,
      });
      setUploadedFiles([]);
    }
  }, [task, projectStatuses.length]); // Use length instead of the whole array to prevent unnecessary re-renders

  const handleSubmit = (data: TaskFormData) => {
    onSubmit({ ...data, files: uploadedFiles });
    if (!task) {
      form.reset();
      setUploadedFiles([]);
    }
  };

  const handleFilesChange = (files: FileUploadItem[]) => {
    setUploadedFiles(files);
  };

  // Keyboard shortcut handlers
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && typeof open === 'boolean') {
        if (e.key === 'Escape') {
          onOpenChange(false);
        } else if (e.ctrlKey && e.key === 'Enter') {
          form.handleSubmit(handleSubmit)();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange, form, handleSubmit]);

  // If open is boolean and true, render as a dialog
  if (typeof open === 'boolean') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] p-0 max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                {task ? <Clock className="h-4 w-4 text-blue-600" /> : <Star className="h-4 w-4 text-blue-600" />}
              </div>
              {task ? 'დავალების რედაქტირება' : 'ახალი დავალების შექმნა'}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 py-4 overflow-y-auto flex-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      სათაური *
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="შეიყვანეთ დავალების სათაური" 
                        {...field} 
                        autoFocus 
                        className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">აღწერა</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="შეიყვანეთ დავალების აღწერა (არასავალდებულო)"
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium">შენიშვნები</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="შეიყვანეთ შენიშვნები ამ დავალებაზე (არასავალდებულო)"
                        className="min-h-[80px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="აირჩიეთ სტატუსი" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projectStatuses.length > 0 ? (
                            projectStatuses.map((status) => (
                              <SelectItem key={status.id} value={status.name}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: status.color }}
                                  />
                                  {status.name}
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            // Fallback to default statuses if no project statuses available
                            <>
                              <SelectItem value="To Do">To Do</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Review">Review</SelectItem>
                              <SelectItem value="Done">Done</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>პრიორიტეტი</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="აირჩიეთ პრიორიტეტი" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">დაბალი</SelectItem>
                          <SelectItem value="medium">საშუალო</SelectItem>
                          <SelectItem value="high">მაღალი</SelectItem>
                          <SelectItem value="critical">კრიტიკული</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Project Selection */}
              {!task && projects.length > 0 && (
                <FormField
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>პროექტი *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="აირჩიეთ პროექტი" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                {project.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="assignee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>პასუხისმგებელი</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="აირჩიეთ პასუხისმგებელი" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">გამოუნაწილებელი</SelectItem>
                          {teamMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>დასრულების თარიღი</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ბიუჯეტი
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => {
                              const value = e.target.value === '' ? null : parseFloat(e.target.value);
                              field.onChange(value);
                            }}
                            className="pl-6"
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            ₾
                          </span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* File Upload Section */}
              <div className="space-y-3">
                <FormLabel className="text-sm font-medium flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  ფაილების დაბმა
                </FormLabel>
                <FileUpload
                  onFilesChange={handleFilesChange}
                  maxFiles={5}
                  maxSize={10 * 1024 * 1024} // 10MB
                  accept="*/*"
                  multiple
                  disabled={loading}
                />
              </div>

                <DialogFooter className="px-0 pt-4 border-t bg-gray-50">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                    className="transition-all duration-200 hover:bg-gray-100"
                  >
                    გაუქმება
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 transition-all duration-200"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        შენახვა...
                      </div>
                    ) : (
                      task ? 'დავალების განახლება' : 'დავალების შექმნა'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise, render as a standalone form (for embedding)
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="შეიყვანეთ დავალების სახელწოდება" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="შეიყვანეთ დავალების აღწერა (არასავალდებულო)"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>შენიშვნები</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="შეიყვანეთ შენიშვნები ამ დავალებაზე (არასავალდებულო)"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {projectStatuses.length > 0 ? (
                      projectStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.name}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: status.color }}
                            />
                            {status.name}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="To Do">To Do</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Review">Review</SelectItem>
                        <SelectItem value="Done">Done</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="assignee_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assignee</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  Budget
                </FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                      className="pl-6"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      ₾
                    </span>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* File Upload Section for embedded form */}
        <div className="space-y-3">
          <FormLabel className="text-sm font-medium flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            ფაილების დაბმა
          </FormLabel>
          <FileUpload
            onFilesChange={handleFilesChange}
            maxFiles={5}
            maxSize={10 * 1024 * 1024} // 10MB
            accept="*/*"
            multiple
            disabled={loading}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setMode && setMode('view')}
            disabled={loading}
          >
            გაუქმება
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'შენახვა...' : 'დავალების განახლება'}
          </Button>
        </div>
      </form>
    </Form>
  );
}