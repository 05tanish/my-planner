import React, { useEffect, useState } from 'react';
import {
  Plus, Search, Calendar, CheckCircle2, Circle,
  Trash2, Edit2, Loader2, ArrowRight, ChevronLeft, ChevronRight,
  CalendarArrowUp
} from 'lucide-react';
import { api } from '../lib/api';
import type { Task, TaskPriority, TaskStatus, TaskScope } from '../types';
import { TASK_PRIORITIES, TASK_SCOPES, TASK_STATUSES } from '../lib/constants';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '../components/ui/dialog';
import { cn } from '../lib/utils';

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function PlannerPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Date navigation (used when scope === DAILY)
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateString(new Date()));

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedScope, setSelectedScope] = useState<TaskScope | 'ALL'>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('');

  // Multi-select for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals
  const [isOpen, setIsOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [scope, setScope] = useState<TaskScope>('DAILY');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');

  const fetchTasks = async () => {
    try {
      const params: Record<string, string> = {
        page: '1',
        limit: '200',
      };
      if (search) params.search = search;
      if (selectedScope !== 'ALL') params.scope = selectedScope;
      if (selectedPriority) params.priority = selectedPriority;
      // When daily scope, filter by selected date
      if (selectedScope === 'DAILY') params.date = selectedDate;

      const res = await api.get('/planner', { params });
      setTasks(res.data.data.tasks || []);
    } catch (err) {
      toast.error('Failed to fetch tasks');
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchTasks().finally(() => setLoading(false));
  }, [search, selectedScope, selectedPriority, selectedDate]);

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setStatus('TODO');
    setScope(selectedScope === 'ALL' ? 'DAILY' : selectedScope as TaskScope);
    setCategory('');
    setDueDate(selectedDate);
    setIsOpen(true);
  };

  const handleOpenEditModal = (t: Task) => {
    setEditingTask(t);
    setTitle(t.title);
    setDescription(t.description || '');
    setPriority(t.priority);
    setStatus(t.status);
    setScope(t.scope);
    setCategory(t.category || '');
    setDueDate(t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : '');
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Task title is required');

    const payload = {
      title,
      description: description || undefined,
      priority,
      status,
      scope,
      category: category || undefined,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    };

    try {
      if (editingTask) {
        await api.patch(`/planner/${editingTask.id}`, payload);
        toast.success('Task updated');
      } else {
        await api.post('/planner', payload);
        toast.success('Task created');
      }
      setIsOpen(false);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/planner/${id}`);
      toast.success('Task deleted');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleMoveToNextDay = async (id: string) => {
    try {
      await api.patch(`/planner/${id}/next-day`);
      toast.success('Task moved to tomorrow');
      fetchTasks();
    } catch (err) {
      toast.error('Failed to move task');
    }
  };

  const handleBulkMoveToNextDay = async () => {
    if (selectedIds.size === 0) return toast.error('Select tasks first');
    try {
      await api.post('/planner/bulk-next-day', { ids: Array.from(selectedIds) });
      toast.success(`${selectedIds.size} task(s) moved to tomorrow`);
      setSelectedIds(new Set());
      fetchTasks();
    } catch (err) {
      toast.error('Failed to move tasks');
    }
  };

  const toggleSelectTask = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleToggleStatus = async (task: Task) => {
    const nextStatusMap: Record<TaskStatus, TaskStatus> = {
      TODO: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      DONE: 'TODO',
      CANCELLED: 'TODO',
    };
    const nextStatus = nextStatusMap[task.status];
    try {
      await api.patch(`/planner/${task.id}`, { status: nextStatus });
      toast.success(`Task status changed to ${nextStatus.replace('_', ' ')}`);
      fetchTasks();
    } catch (err) {
      toast.error('Failed to update task status');
    }
  };

  const getPriorityColor = (p: TaskPriority) => {
    return {
      LOW: 'text-muted-foreground bg-secondary/80 border-border',
      MEDIUM: 'text-primary bg-primary/10 border-primary/20',
      HIGH: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
      URGENT: 'text-rose-400 bg-rose-400/10 border-rose-400/20'
    }[p];
  };

  // Date navigation helpers
  const navigateDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toLocalDateString(d));
  };

  const isToday = selectedDate === toLocalDateString(new Date());

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = toLocalDateString(new Date());
    const yesterday = toLocalDateString(new Date(Date.now() - 86400000));
    const tomorrow = toLocalDateString(new Date(Date.now() + 86400000));
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    if (dateStr === tomorrow) return 'Tomorrow';
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Group tasks by status for columns
  const todoTasks = tasks.filter(t => t.status === 'TODO');
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter(t => t.status === 'DONE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Daily Planner</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track your daily, weekly, and monthly tasks and priorities</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkMoveToNextDay}
              className="text-amber-500 border-amber-500/50 hover:bg-amber-500/10"
            >
              <CalendarArrowUp className="w-4 h-4 mr-2" />
              Move {selectedIds.size} to Tomorrow
            </Button>
          )}
          {selectedIds.size > 0 && (
            <Button variant="ghost" onClick={() => setSelectedIds(new Set())} className="text-muted-foreground">
              Clear
            </Button>
          )}
          <Button onClick={handleOpenAddModal} className="w-full sm:w-auto bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        </div>
      </div>

      {/* Scope quick filter tabs */}
      <div className="flex gap-1 bg-secondary/30 p-1 border border-border rounded-lg max-w-md">
        {(['ALL', 'DAILY', 'WEEKLY', 'MONTHLY'] as const).map(sc => (
          <button
            key={sc}
            onClick={() => setSelectedScope(sc)}
            className={cn(
              'flex-1 py-1.5 rounded-md text-xs font-semibold capitalize transition-all',
              (selectedScope === sc)
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {sc.toLowerCase()}
          </button>
        ))}
      </div>

      {/* Date Navigation — visible only for DAILY scope */}
      {selectedScope === 'DAILY' && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-lg px-4 py-3">
          <button
            onClick={() => navigateDate(-1)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 flex items-center justify-center gap-3">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              {formatDateLabel(selectedDate)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>

          <button
            onClick={() => navigateDate(1)}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(toLocalDateString(new Date()))}
              className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 rounded-md transition-colors"
            >
              Today
            </button>
          )}

          <input
            type="date"
            value={selectedDate}
            onChange={e => e.target.value && setSelectedDate(e.target.value)}
            className="text-xs bg-secondary border border-border text-foreground rounded-md px-2 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
            title="Jump to date"
          />
        </div>
      )}

      {/* Search and Priority filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center bg-card border border-border p-4 rounded-lg">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-secondary/30"
          />
        </div>
        <select
          value={selectedPriority}
          onChange={e => setSelectedPriority(e.target.value)}
          className="bg-secondary border border-border text-foreground text-sm rounded-md px-3 h-10 outline-none hover:bg-secondary/80 transition-colors cursor-pointer w-full md:w-48"
        >
          <option value="">All Priorities</option>
          {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Kanban Board columns */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: TODO */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To Do ({todoTasks.length})</span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[60vh] p-1 scrollbar-thin">
              {todoTasks.map(t => <TaskCard key={t.id} task={t} onToggle={handleToggleStatus} onEdit={handleOpenEditModal} onDelete={handleDelete} onMoveToNextDay={handleMoveToNextDay} isSelected={selectedIds.has(t.id)} onSelect={toggleSelectTask} getPriorityColor={getPriorityColor} />)}
              {todoTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">No tasks to do.</p>}
            </div>
          </div>

          {/* Column 2: IN PROGRESS */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In Progress ({inProgressTasks.length})</span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[60vh] p-1 scrollbar-thin">
              {inProgressTasks.map(t => <TaskCard key={t.id} task={t} onToggle={handleToggleStatus} onEdit={handleOpenEditModal} onDelete={handleDelete} onMoveToNextDay={handleMoveToNextDay} isSelected={selectedIds.has(t.id)} onSelect={toggleSelectTask} getPriorityColor={getPriorityColor} />)}
              {inProgressTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">No tasks in progress.</p>}
            </div>
          </div>

          {/* Column 3: DONE */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border pb-2 px-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Completed ({doneTasks.length})</span>
            </div>
            <div className="space-y-3 overflow-y-auto max-h-[60vh] p-1 scrollbar-thin">
              {doneTasks.map(t => <TaskCard key={t.id} task={t} onToggle={handleToggleStatus} onEdit={handleOpenEditModal} onDelete={handleDelete} onMoveToNextDay={handleMoveToNextDay} isSelected={selectedIds.has(t.id)} onSelect={toggleSelectTask} getPriorityColor={getPriorityColor} />)}
              {doneTasks.length === 0 && <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">No tasks completed yet.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Task Title *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Design placement revision templates" className="bg-secondary" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Task details..."
                rows={3}
                className="w-full p-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as TaskPriority)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {TASK_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Scope</label>
                <select
                  value={scope}
                  onChange={e => setScope(e.target.value as TaskScope)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {TASK_SCOPES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Category</label>
                <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. DSA, Placement, AI" className="bg-secondary" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-secondary" />
              </div>
            </div>

            {editingTask && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as TaskStatus)}
                  className="w-full h-10 px-3 bg-secondary border border-border rounded-md text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  {TASK_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground">
                {editingTask ? 'Save Changes' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  onToggle: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onMoveToNextDay: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string) => void;
  getPriorityColor: (p: TaskPriority) => string;
}

function TaskCard({ task, onToggle, onEdit, onDelete, onMoveToNextDay, isSelected, onSelect, getPriorityColor }: TaskCardProps) {
  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-3 flex flex-col gap-2.5 group hover:border-primary/40 transition-colors',
        isSelected ? 'border-amber-400/60 bg-amber-400/5' : 'border-border'
      )}
    >
      <div className="flex items-start gap-2.5">
        {/* Checkbox for multi-select */}
        <button
          onClick={() => onSelect(task.id)}
          className={cn(
            'shrink-0 mt-0.5 w-4 h-4 rounded border transition-colors',
            isSelected
              ? 'bg-amber-400 border-amber-400'
              : 'border-border hover:border-primary bg-transparent'
          )}
          title="Select for bulk action"
        />
        <button
          onClick={() => onToggle(task)}
          className="text-muted-foreground hover:text-primary transition-colors shrink-0 mt-0.5"
          title="Toggle status"
        >
          {task.status === 'DONE' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 fill-emerald-400/10" />
          ) : task.status === 'IN_PROGRESS' ? (
            <ArrowRight className="w-4 h-4 text-primary animate-pulse" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn(
            'text-xs font-semibold text-foreground leading-tight',
            task.status === 'DONE' && 'line-through text-muted-foreground font-normal'
          )}>
            {task.title}
          </p>
          {task.description && (
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-normal">{task.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 pt-2 text-[10px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="outline" className={cn('text-[9px] py-0 px-1.5 uppercase', getPriorityColor(task.priority))}>
            {task.priority}
          </Badge>
          {task.category && (
            <span className="bg-secondary px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">{task.category}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {task.dueDate && (
            <span className="text-muted-foreground flex items-center gap-0.5 mr-1 font-mono">
              <Calendar className="w-2.5 h-2.5" />
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
            <button
              onClick={() => onMoveToNextDay(task.id)}
              className="p-1 hover:bg-amber-500/10 rounded text-muted-foreground hover:text-amber-500"
              title="Move to next day"
            >
              <CalendarArrowUp className="w-3 h-3" />
            </button>
            <button onClick={() => onEdit(task)} className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={() => onDelete(task.id)} className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
