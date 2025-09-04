import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { Task } from './TaskCard';
import 'react-calendar/dist/Calendar.css';

interface ProjectCalendarProps {
  projectId: string;
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function ProjectCalendar({ projectId, tasks, onTaskClick }: ProjectCalendarProps) {
  const [date, setDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);


  const handleTaskClick = (taskId: string) => {
    if (onTaskClick) {
      onTaskClick(taskId);
    }
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => 
      task.due_date && isSameDay(new Date(task.due_date), date)
    );
  };


  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayTasks = getTasksForDate(date);
      
      if (dayTasks.length > 0) {
        return (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex space-x-1">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm"></div>
            {dayTasks.length > 1 && (
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full shadow-sm"></div>
            )}
            {dayTasks.length > 2 && (
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full shadow-sm"></div>
            )}
          </div>
        );
      }
    }
    return null;
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dayTasks = getTasksForDate(date);
      const hasTasks = dayTasks.length > 0;
      const isToday = isSameDay(date, new Date());
      
      return `${hasTasks ? 'has-events' : ''} ${isToday ? 'today' : ''}`;
    }
    return '';
  };

  const handleDateClick = (value: Date) => {
    setSelectedDate(value);
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5" />
          <h2 className="text-lg font-semibold">პროექტის კალენდარი</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-4">
              <style>{`
                .react-calendar {
                  width: 100%;
                  background: transparent;
                  border: none;
                  font-family: inherit;
                  border-radius: 0.5rem;
                }
                .react-calendar__navigation {
                  display: flex;
                  height: 3rem;
                  margin-bottom: 1rem;
                  background: hsl(var(--card));
                  border-radius: 0.5rem;
                  padding: 0.5rem;
                }
                .react-calendar__navigation button {
                  color: hsl(var(--foreground));
                  background: transparent;
                  border: none;
                  font-size: 1rem;
                  padding: 0.5rem 1rem;
                  border-radius: 0.375rem;
                  font-weight: 500;
                  transition: all 0.2s ease;
                }
                .react-calendar__navigation button:enabled:hover,
                .react-calendar__navigation button:enabled:focus {
                  background: hsl(var(--accent));
                  transform: translateY(-1px);
                }
                .react-calendar__navigation button:disabled {
                  opacity: 0.5;
                }
                .react-calendar__navigation__label {
                  font-weight: 600;
                  font-size: 1.1rem;
                  color: hsl(var(--primary));
                }
                .react-calendar__month-view__weekdays {
                  text-align: center;
                  text-transform: uppercase;
                  font-weight: 600;
                  font-size: 0.75rem;
                  color: hsl(var(--muted-foreground));
                  margin-bottom: 0.5rem;
                }
                .react-calendar__month-view__weekdays__weekday {
                  padding: 0.75rem 0.25rem;
                  background: hsl(var(--secondary));
                  border-radius: 0.375rem;
                  margin: 0 0.125rem;
                }
                .react-calendar__tile {
                  position: relative;
                  height: 4rem;
                  border: 1px solid hsl(var(--border));
                  background: hsl(var(--background));
                  color: hsl(var(--foreground));
                  border-radius: 0.375rem;
                  margin: 0.125rem;
                  transition: all 0.2s ease;
                  font-weight: 500;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
                }
                .react-calendar__tile:enabled:hover,
                .react-calendar__tile:enabled:focus {
                  background: hsl(var(--accent));
                  transform: translateY(-2px);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                .react-calendar__tile--active {
                  background: hsl(var(--primary));
                  color: hsl(var(--primary-foreground));
                  border-color: hsl(var(--primary));
                  transform: translateY(-1px);
                  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                }
                .react-calendar__tile.today {
                  background: hsl(var(--secondary));
                  color: hsl(var(--secondary-foreground));
                  border-color: hsl(var(--primary));
                  border-width: 2px;
                  font-weight: 600;
                }
                .react-calendar__tile.has-events {
                  background: linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--accent)) 100%);
                  border-color: hsl(var(--primary));
                  border-width: 1.5px;
                }
                .react-calendar__tile--neighboringMonth {
                  color: hsl(var(--muted-foreground));
                  opacity: 0.5;
                }
                .react-calendar__tile abbr {
                  text-decoration: none;
                  font-weight: inherit;
                }
              `}</style>
              <Calendar
                onChange={(value) => setDate(value as Date)}
                value={date}
                onClickDay={handleDateClick}
                tileContent={tileContent}
                tileClassName={tileClassName}
                selectRange={false}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {selectedDate && (
            <Card className="shadow-lg border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-primary">
                  {format(selectedDate, 'MMMM dd, yyyy')}
                </CardTitle>
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                    {selectedDateTasks.length} თასქი
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedDateTasks.map((task) => (
                  <div 
                    key={task.id} 
                    className={`p-3 rounded-lg border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-950/30 transition-all duration-200 group ${
                      onTaskClick ? 'cursor-pointer hover:shadow-md' : ''
                    }`}
                    onClick={() => handleTaskClick(task.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm text-orange-700 dark:text-orange-300 group-hover:text-orange-800 dark:group-hover:text-orange-200">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center text-xs text-muted-foreground mt-2">
                          <Clock className="h-3 w-3 mr-1" />
                          Task Due Date
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant="outline" className="text-xs border-orange-200 text-orange-600 dark:border-orange-800 dark:text-orange-400">
                          {task.priority === 'high' ? 'High' :
                           task.priority === 'medium' ? 'Medium' :
                           task.priority === 'low' ? 'Low' : task.priority}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {task.status === 'todo' ? 'To Do' :
                           task.status === 'in-progress' ? 'In Progress' :
                           task.status === 'review' ? 'Review' :
                           task.status === 'done' ? 'Done' : task.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
                
                {selectedDateTasks.length === 0 && (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      ამ დღეს თასქები არ არის
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}