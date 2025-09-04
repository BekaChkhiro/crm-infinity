import React, { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { Badge } from '@/shared/components/ui/badge';
import { Calendar } from '@/shared/components/ui/calendar';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { 
  Search, 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  Users,
  Flag,
  Clock,
  Tags
} from 'lucide-react';
import { format } from 'date-fns';

export interface TaskFilters {
  search: string;
  assignees: string[];
  priorities: string[];
  statuses: string[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  tags: string[];
  hasFiles: boolean | null;
  hasComments: boolean | null;
  overdue: boolean | null;
}

interface AdvancedTaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  teamMembers: Array<{ id: string; name: string }>;
  availableTags?: string[];
}

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

export function AdvancedTaskFilters({
  filters,
  onFiltersChange,
  teamMembers,
  availableTags = []
}: AdvancedTaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilters = (updates: Partial<TaskFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      assignees: [],
      priorities: [],
      statuses: [],
      dateRange: { from: null, to: null },
      tags: [],
      hasFiles: null,
      hasComments: null,
      overdue: null,
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.assignees.length > 0) count++;
    if (filters.priorities.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.tags.length > 0) count++;
    if (filters.hasFiles !== null) count++;
    if (filters.hasComments !== null) count++;
    if (filters.overdue !== null) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const toggleArrayFilter = (array: string[], value: string, key: keyof TaskFilters) => {
    const newArray = array.includes(value)
      ? array.filter(item => item !== value)
      : [...array, value];
    updateFilters({ [key]: newArray });
  };

  return (
    <div className="flex items-center gap-3">
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => updateFilters({ search: e.target.value })}
          className="pl-9"
        />
      </div>

      {/* Advanced Filters Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative">
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Advanced Filters</h4>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
            {/* Assignees */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Assignees
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="unassigned"
                    checked={filters.assignees.includes('unassigned')}
                    onCheckedChange={() => toggleArrayFilter(filters.assignees, 'unassigned', 'assignees')}
                  />
                  <Label htmlFor="unassigned" className="text-sm">Unassigned</Label>
                </div>
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={member.id}
                      checked={filters.assignees.includes(member.id)}
                      onCheckedChange={() => toggleArrayFilter(filters.assignees, member.id, 'assignees')}
                    />
                    <Label htmlFor={member.id} className="text-sm truncate">
                      {member.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Flag className="h-4 w-4" />
                Priority
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {priorityOptions.map((priority) => (
                  <div key={priority.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={priority.value}
                      checked={filters.priorities.includes(priority.value)}
                      onCheckedChange={() => toggleArrayFilter(filters.priorities, priority.value, 'priorities')}
                    />
                    <Label htmlFor={priority.value} className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${priority.color}`}></div>
                      {priority.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((status) => (
                  <div key={status.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={status.value}
                      checked={filters.statuses.includes(status.value)}
                      onCheckedChange={() => toggleArrayFilter(filters.statuses, status.value, 'statuses')}
                    />
                    <Label htmlFor={status.value} className="text-sm">
                      {status.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Due Date Range
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? format(filters.dateRange.from, 'MMM dd') : 'From'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from || undefined}
                      onSelect={(date) => updateFilters({
                        dateRange: { ...filters.dateRange, from: date || null }
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex-1 justify-start text-left">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.to ? format(filters.dateRange.to, 'MMM dd') : 'To'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to || undefined}
                      onSelect={(date) => updateFilters({
                        dateRange: { ...filters.dateRange, to: date || null }
                      })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Tags */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tags className="h-4 w-4" />
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <div key={tag} className="flex items-center space-x-2">
                      <Checkbox
                        id={`tag-${tag}`}
                        checked={filters.tags.includes(tag)}
                        onCheckedChange={() => toggleArrayFilter(filters.tags, tag, 'tags')}
                      />
                      <Label htmlFor={`tag-${tag}`} className="text-sm">
                        {tag}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Filters */}
            <div className="space-y-3">
              <Label>Additional Options</Label>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-files"
                  checked={filters.hasFiles === true}
                  onCheckedChange={(checked) => 
                    updateFilters({ hasFiles: checked ? true : null })
                  }
                />
                <Label htmlFor="has-files" className="text-sm">Has file attachments</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-comments"
                  checked={filters.hasComments === true}
                  onCheckedChange={(checked) => 
                    updateFilters({ hasComments: checked ? true : null })
                  }
                />
                <Label htmlFor="has-comments" className="text-sm">Has comments</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overdue"
                  checked={filters.overdue === true}
                  onCheckedChange={(checked) => 
                    updateFilters({ overdue: checked ? true : null })
                  }
                />
                <Label htmlFor="overdue" className="text-sm flex items-center gap-2">
                  <Clock className="h-3 w-3 text-red-500" />
                  Overdue tasks only
                </Label>
              </div>
            </div>
          </div>

          <div className="p-4 border-t">
            <Button onClick={() => setIsOpen(false)} className="w-full">
              Apply Filters
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: "{filters.search}"
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ search: '' })}
              />
            </Badge>
          )}
          {filters.assignees.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Assignees: {filters.assignees.length}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ assignees: [] })}
              />
            </Badge>
          )}
          {filters.priorities.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Priority: {filters.priorities.length}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ priorities: [] })}
              />
            </Badge>
          )}
          {filters.statuses.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.statuses.length}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => updateFilters({ statuses: [] })}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}