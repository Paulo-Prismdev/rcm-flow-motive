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
import TaskModal from '../components/tasks/TaskModal';

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

  const isInternalUser = currentUser?.user_type === 'internal' || currentUser?.role === 'admin';

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
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
    },
  });

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
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
    <div className="h-full flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="neomorph p-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold flex items-center gap-2 lg:text-2xl">
              <ListTodo className="w-5 h-5 lg:w-7 lg:h-7 text-accent" />
              My Tasks
            </h1>
            <p className="text-xs text-foreground-muted mt-0.5">
              Track and manage your assigned tasks
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mt-3 lg:mt-4">
          <div className="neomorph-flat p-3 rounded-xl">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-foreground-muted">Active Tasks</div>
          </div>
          <div className={`neomorph-flat p-3 rounded-xl ${stats.overdue > 0 ? 'bg-red-50 border-red-200' : ''}`}>
            <div className={`text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600' : ''}`}>{stats.overdue}</div>
            <div className="text-xs text-foreground-muted">Overdue</div>
          </div>
          <div className={`neomorph-flat p-3 rounded-xl ${stats.today > 0 ? 'bg-orange-50 border-orange-200' : ''}`}>
            <div className={`text-2xl font-bold ${stats.today > 0 ? 'text-orange-600' : ''}`}>{stats.today}</div>
            <div className="text-xs text-foreground-muted">Due Today</div>
          </div>
          <div className="neomorph-flat p-3 rounded-xl">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <div className="text-xs text-foreground-muted">Pending</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="neomorph p-3 lg:p-4 flex-shrink-0">
        <div className="flex flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-muted" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="pl-10 neomorph-inset"
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <select
              value={viewFilter}
              onChange={(e) => setViewFilter(e.target.value)}
              className="neomorph-inset px-3 py-2 rounded-lg border-0 text-sm"
            >
              <option value="my">Assigned to Me</option>
              <option value="created">Created by Me</option>
              {isInternalUser && <option value="all">All Tasks</option>}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="neomorph-inset px-3 py-2 rounded-lg border-0 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="neomorph-inset px-3 py-2 rounded-lg border-0 text-sm"
            >
              <option value="">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <Button
              size="sm"
              onClick={() => setShowCompleted(!showCompleted)}
              className={`neomorph-flat px-3 text-xs ${showCompleted ? 'bg-accent/20' : ''}`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {showCompleted ? 'Hide' : 'Show'} Done
            </Button>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-6">
        {isLoading ? (
          <div className="text-center py-12">Loading tasks...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="neomorph p-12 text-center">
            <ListTodo className="w-12 h-12 mx-auto text-foreground-muted mb-4" />
            <p className="text-foreground-muted mb-2">No tasks found</p>
            <p className="text-sm text-foreground-muted">
              Tasks assigned to you will appear here
            </p>
          </div>
        ) : (
          <>
            {/* Overdue Tasks */}
            {overdueTasks.length > 0 && (
              <div className="neomorph p-4 border-l-4 border-red-500">
                <h2 className="font-bold text-red-600 flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5" />
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
              <div className="neomorph p-4 border-l-4 border-orange-500">
                <h2 className="font-bold text-orange-600 flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5" />
                  Due Today ({todayTasks.length})
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
              <div className="neomorph p-4">
                <h2 className="font-bold flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5" />
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
              <div className="neomorph p-4 opacity-70">
                <h2 className="font-bold flex items-center gap-2 mb-4 text-foreground-muted">
                  <CheckCircle2 className="w-5 h-5" />
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
          className="inline-flex items-center gap-1 text-xs text-accent hover:underline ml-2"
        >
          <ExternalLink className="w-3 h-3" />
          View Claim: {task.claim_job_number || task.claim_reg}
        </Link>
      )}
    </div>
  );
}