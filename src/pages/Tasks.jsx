import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ListTodo, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TaskCard from '../components/tasks/TaskCard';
import PageHeader from '@/components/shared/PageHeader';
import TaskModal from '../components/tasks/TaskModal';
import { deleteAndLog } from "@/components/shared/useActivityLogger";
import { askConfirm } from '@/lib/dialogs';

export default function TasksPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [viewFilter, setViewFilter] = useState('my'); // 'my', 'created', 'all'
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isInternalUser = currentUser?.user_type === 'internal';

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['allTasks'],
    queryFn: () => base44.entities.Task.list('-created_date', 1000),
    enabled: !!currentUser,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedTask = await base44.entities.Task.update(id, data);
      
      if (data.status === 'Completed') {
        await base44.entities.Task.update(id, {
          completed_date: new Date().toISOString(),
          completed_by: currentUser?.email
        });
      }
      
      return updatedTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      setEditingTask(null);
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteAndLog("Task", id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
    },
  });

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (await askConfirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id, newStatus) => {
    updateMutation.mutate({ id, data: { status: newStatus } });
  };

  const handleSave = (taskData) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: taskData });
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    // View filter
    if (viewFilter === 'my' && task.assigned_to !== currentUser?.email) return false;
    if (viewFilter === 'created' && task.created_by !== currentUser?.email) return false;

    // Status filter
    if (!showCompleted && (task.status === 'Completed' || task.status === 'Cancelled')) return false;
    if (statusFilter && task.status !== statusFilter) return false;

    // Priority filter
    if (priorityFilter && task.priority !== priorityFilter) return false;

    // Search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        task.title?.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.claim_job_number?.toLowerCase().includes(searchLower) ||
        task.claim_reg?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Group tasks by due status
  const overdueTasks = filteredTasks.filter(t => {
    if (!t.due_date || t.status === 'Completed' || t.status === 'Cancelled') return false;
    return new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
  });

  const todayTasks = filteredTasks.filter(t => {
    if (!t.due_date || t.status === 'Completed' || t.status === 'Cancelled') return false;
    const today = new Date().toISOString().split('T')[0];
    return t.due_date === today;
  });

  const upcomingTasks = filteredTasks.filter(t => {
    if (t.status === 'Completed' || t.status === 'Cancelled') return false;
    if (!t.due_date) return true;
    const today = new Date().toISOString().split('T')[0];
    return t.due_date > today;
  });

  const completedTasks = filteredTasks.filter(t => 
    t.status === 'Completed' || t.status === 'Cancelled'
  );

  const stats = {
    total: tasks.filter(t => t.assigned_to === currentUser?.email && t.status !== 'Completed' && t.status !== 'Cancelled').length,
    overdue: overdueTasks.length,
    today: todayTasks.length,
    pending: tasks.filter(t => t.assigned_to === currentUser?.email && t.status === 'Pending').length,
  };

  return (
    <div className="h-full flex flex-col gap-4 px-3 pt-3 md:px-0 md:pt-0">
      {/* Header */}
      <div className="flex-shrink-0 space-y-3">
        <PageHeader
          icon={ListTodo}
          title="My tasks"
          subtitle="Tasks assigned to you, soonest first"
        />

        {/* Counts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 m-keep-2">
          {[
            { n: stats.total, label: 'Active', tone: '' },
            { n: stats.overdue, label: 'Overdue', tone: stats.overdue > 0 ? 'danger' : '' },
            { n: stats.today, label: 'Due today', tone: stats.today > 0 ? 'warning' : '' },
            { n: stats.pending, label: 'Pending', tone: '' },
          ].map(({ n, label, tone }) => (
            <div key={label} className={`rounded-xl border p-3 shadow-card ${tone === 'danger' ? 'bg-danger-bg border-danger/30' : tone === 'warning' ? 'bg-warning-bg border-warning/30' : 'bg-card border-border'}`}>
              <div className={`text-2xl font-semibold tabular-nums ${tone === 'danger' ? 'text-danger-fg' : tone === 'warning' ? 'text-warning-fg' : 'text-foreground'}`}>{n}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-subtle" aria-hidden="true" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              className="pl-8"
            />
          </div>
          <div className="grid grid-cols-2 lg:flex gap-2 m-keep-2">
            <select
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value)}
              aria-label="Whose tasks"
              className="h-9 rounded-lg border border-input bg-card px-2.5 text-[13px] text-foreground"
            >
              <option value="my">Assigned to me</option>
              <option value="created">Created by me</option>
              {isInternalUser && <option value="all">All tasks</option>}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Status"
              className="h-9 rounded-lg border border-input bg-card px-2.5 text-[13px] text-foreground"
            >
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Priority"
              className="h-9 rounded-lg border border-input bg-card px-2.5 text-[13px] text-foreground"
            >
              <option value="">All priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <Button
              variant="outline"
              onClick={() => setShowCompleted(!showCompleted)}
              aria-pressed={showCompleted}
              className={`h-9 gap-1.5 ${showCompleted ? 'bg-surface-selected' : ''}`}
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              {showCompleted ? 'Hide done' : 'Show done'}
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-6">
        {isLoading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading tasks">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-card p-12 text-center">
            <ListTodo className="w-10 h-10 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground mb-1">No tasks here</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter || priorityFilter ? 'Nothing matches these filters.' : 'Tasks assigned to you will appear here.'}
            </p>
          </div>
        ) : (
          <>
            {/* Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <div className="rounded-xl border border-border border-l-4 border-l-danger bg-card shadow-card p-4">
                <h2 className="text-[15px] font-semibold text-danger-fg flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                  Overdue ({overdueTasks.length})
                </h2>
                <div className="space-y-3">
                  {overdueTasks.map(task => (
                    <TaskCardWithClaim
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Due Today */}
            {todayTasks.length > 0 && (
              <div className="rounded-xl border border-border border-l-4 border-l-warning bg-card shadow-card p-4">
                <h2 className="text-[15px] font-semibold text-warning-fg flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  Due today ({todayTasks.length})
                </h2>
                <div className="space-y-3">
                  {todayTasks.map(task => (
                    <TaskCardWithClaim
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming / No Due Date */}
            {upcomingTasks.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-card p-4">
                <h2 className="text-[15px] font-semibold flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  Upcoming ({upcomingTasks.length})
                </h2>
                <div className="space-y-3">
                  {upcomingTasks.map(task => (
                    <TaskCardWithClaim
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed */}
            {showCompleted && completedTasks.length > 0 && (
              <div className="rounded-xl border border-border bg-card shadow-card p-4 opacity-80">
                <h2 className="text-[15px] font-semibold flex items-center gap-2 mb-3 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Completed ({completedTasks.length})
                </h2>
                <div className="space-y-3">
                  {completedTasks.map(task => (
                    <TaskCardWithClaim
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        onSave={handleSave}
        task={editingTask}
        claimId={editingTask?.claim_id}
        claimJobNumber={editingTask?.claim_job_number}
        claimReg={editingTask?.claim_reg}
      />
    </div>
  );
}

// Task card with link to claim
function TaskCardWithClaim({ task, onEdit, onDelete, onStatusChange }) {
  return (
    <div className="space-y-2">
      <TaskCard
        task={task}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
      />
      {(task.claim_job_number || task.claim_reg) && (
        <Link 
          to={`${createPageUrl('Claims')}?id=${task.claim_id}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-link hover:underline ml-2"
        >
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
          Open claim {task.claim_job_number || task.claim_reg}
        </Link>
      )}
    </div>
  );
}