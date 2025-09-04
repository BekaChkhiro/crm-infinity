import React, { useState, useMemo } from 'react';
import Calendar from 'react-calendar';
import { format, isSameDay, parseISO, isValid, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ka } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Task } from './TaskCard';
import { cn } from '@/shared/utils/utils';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, Flag } from 'lucide-react';
import 'react-calendar/dist/Calendar.css';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface TasksCalendarViewProps {
  tasks: Task[];
  teamMembers: Array<{ id: string; name: string }>;
  onTaskEdit: (task: Task) => void;
  onTaskClick?: (taskId: string) => void;
}

export function TasksCalendarView({ tasks, teamMembers, onTaskEdit, onTaskClick }: TasksCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Value>(new Date());

  // Group tasks by date
  const tasksByDate = useMemo(() => {
    const grouped: { [key: string]: Task[] } = {};
    
    tasks.forEach(task => {
      if (!task.due_date) return;
      
      try {
        const dueDate = parseISO(task.due_date);
        if (isValid(dueDate)) {
          const dateKey = format(dueDate, 'yyyy-MM-dd');
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push(task);
        }
      } catch (error) {
        console.error('Error parsing task due date:', error);
      }
    });
    
    return grouped;
  }, [tasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate || Array.isArray(selectedDate)) return [];
    
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate[dateKey] || [];
  }, [selectedDate, tasksByDate]);

  // Get tasks for today
  const todayTasks = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    return tasksByDate[todayKey] || [];
  }, [tasksByDate]);

  // Simple minimalist tile content
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayTasks = tasksByDate[dateKey];
      
      if (dayTasks && dayTasks.length > 0) {
        const hasHighPriority = dayTasks.some(t => t.priority === 'high');
        
        return (
          <div className="flex justify-center mt-1">
            <div 
              className={cn(
                "w-2 h-2 rounded-full",
                hasHighPriority ? "bg-red-500" : "bg-blue-500"
              )}
              title={`${dayTasks.length} თასქი`}
            />
          </div>
        );
      }
    }
    return null;
  };

  // Custom tile class names for styling
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayTasks = tasksByDate[dateKey];
      
      const classes = [];
      
      if (dayTasks && dayTasks.length > 0) {
        classes.push('has-tasks');
      }
      
      if (isSameDay(date, new Date())) {
        classes.push('today');
      }
      
      return classes.join(' ');
    }
    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'text-green-600';
      case 'in-progress': return 'text-blue-600';
      case 'review': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Simple Calendar Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          კალენდარი
        </h2>
        <div className="text-sm text-muted-foreground">
          🔴 მაღალი პრიორიტეტი • 🔵 სტანდარტული
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
            <style dangerouslySetInnerHTML={{__html: `
              .react-calendar {
                width: 100%;
                background: transparent;
                border: none;
                font-family: inherit;
              }
              .react-calendar__tile {
                max-width: 100%;
                padding: 0.5rem;
                background: none;
                text-align: center;
                line-height: 1.2;
                font-size: 0.875rem;
                border-radius: 8px;
                border: none;
                transition: all 0.15s ease;
                min-height: 50px;
                position: relative;
                color: hsl(var(--foreground));
              }
              .react-calendar__tile:hover {
                background-color: hsl(var(--muted) / 0.5);
                transform: scale(1.02);
              }
              .react-calendar__tile--active {
                background: hsl(var(--primary)) !important;
                color: hsl(var(--primary-foreground));
                font-weight: 600;
              }
              .react-calendar__tile.has-tasks {
                background-color: hsl(var(--muted) / 0.3);
              }
              .react-calendar__tile.today {
                background-color: hsl(var(--accent));
                color: hsl(var(--accent-foreground));
                font-weight: 600;
              }
              .react-calendar__navigation {
                display: flex;
                margin-bottom: 1.5rem;
                align-items: center;
              }
              .react-calendar__navigation button {
                min-width: 40px;
                background: none;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                padding: 0.5rem;
                margin: 0 4px;
                transition: all 0.15s ease;
                color: hsl(var(--foreground));
              }
              .react-calendar__navigation button:hover {
                background-color: hsl(var(--muted));
              }
              .react-calendar__navigation__label {
                font-weight: 600 !important;
                font-size: 1.1rem !important;
              }
              .react-calendar__month-view__weekdays {
                text-transform: none;
                font-weight: 600;
                font-size: 0.75rem;
                color: hsl(var(--muted-foreground));
                margin-bottom: 0.5rem;
              }
              .react-calendar__month-view__weekdays__weekday {
                padding: 0.75rem 0.5rem;
              }
            `}} />
            <Calendar
              onChange={setSelectedDate}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              locale="ka-GE"
              navigationLabel={({ date }) => 
                format(date, 'MMMM yyyy', { locale: ka })
              }
              prevLabel={<ChevronLeft className="h-4 w-4" />}
              nextLabel={<ChevronRight className="h-4 w-4" />}
              prev2Label={null}
              next2Label={null}
            />
          </CardContent>
        </Card>
      </div>

        {/* Task Details Panel */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Selected Date Info */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="text-center">
                  <h3 className="font-semibold text-lg">
                    {selectedDate && !Array.isArray(selectedDate) 
                      ? format(selectedDate, 'd MMMM', { locale: ka })
                      : 'დღეს'
                    }
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDateTasks.length} თასქი
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Task List */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <ScrollArea className="h-96">
                  {selectedDateTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        ამ დღეს თასქები არ არის
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateTasks.map(task => (
                        <div 
                          key={task.id} 
                          className="p-3 rounded-lg bg-muted/30 hover:bg-muted hover:scale-[1.02] transition-all duration-200 cursor-pointer border border-transparent hover:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                          onClick={() => onTaskClick?.(task.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onTaskClick?.(task.id);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`თასქის დეტალების ნახვა: ${task.title}`}
                          title="დააწვეთ დეტალების სანახავად"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-medium text-sm leading-tight flex-1">
                                {task.title}
                              </h4>
                              <div className="text-xs text-muted-foreground">👁️</div>
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1">
                                <Flag className={cn("h-3 w-3", getPriorityColor(task.priority))} />
                                <span className="capitalize">{task.priority}</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <div className={cn("w-2 h-2 rounded-full", 
                                  task.status === 'done' ? 'bg-green-500' :
                                  task.status === 'in-progress' ? 'bg-blue-500' :
                                  task.status === 'review' ? 'bg-orange-500' : 'bg-gray-500'
                                )} />
                                <span className="capitalize">{task.status}</span>
                              </div>

                              {task.assignee_id && (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">
                                    {teamMembers.find(m => m.id === task.assignee_id)?.name?.split(' ')[0] || 'Unknown'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}