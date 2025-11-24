import React, { useState } from 'react';
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, ListTodo, CheckCircle2 } from "lucide-react";
import TaskModal from './TaskModal';
import TaskCard from './TaskCard';

export default function ClaimTasksSection({ claimId, claimJobNumber, claimReg }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['claimTasks', claimId],
    queryFn: () => base44.entities.Task.filter({ claim_id: claimId }, '-created_date'),
    enabled: !!claimId,
  });

  const createMutation = useMutation({
    mutationFn: async (taskData) => {
      const task = await base44.entities.Task.create(taskData);
      
      // Send notification to assigned user
      if (taskData.assigned_to && taskData.assigned_to !== currentUser?.email) {
        await base44.entities.Notification.create({
          user_email: taskData.assigned_to,
          title: 'New Task Assigned',
          message: `You have been assigned a new task: "${taskData.title}" for claim ${claimJobNumber || claimReg}`,
          link: `/claims?id=${claimId}`,
          is_read: false
        });
      }
      
      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claimTasks', claimId] });
      setIsModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updatedTask = await base44.entities.Task.update(id, data);
      
      // If task is being completed, add completed info
      if (data.status === 'Completed' && !editingTask?.completed_date) {
        await base44.entities.Task.update(id, {
          completed_date: new Date().toISOString(),
          completed_by: currentUser?.email
        });
      }
      
      return updatedTask;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claimTasks', claimId] });
      setEditingTask(null);
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claimTasks', claimId] });
    },
  });

  const handleSave = (taskData) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data: taskData });
    } else {
      createMutation.mutate(taskData);
    }
  };

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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const pendingTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled');
  const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'Cancelled');

  return (
    <div className="neomorph-flat p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ListTodo className="w-5 h-5 text-gold" />
          <h3 className="font-bold">Tasks</h3>
          {pendingTasks.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-medium">
              {pendingTasks.length} pending
            </span>
          )}
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="neomorph-flat px-3 py-2 text-sm"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Task
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-foreground-muted">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 neomorph-inset rounded-lg">
          <ListTodo className="w-10 h-10 mx-auto text-foreground-muted mb-2" />
          <p className="text-foreground-muted text-sm">No tasks yet</p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="mt-3 neomorph-flat px-4 py-2 text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create First Task
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div className="space-y-2">
              {pendingTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  compact
                />
              ))}
            </div>
          )}

          {/* Completed Tasks Toggle */}
          {completedTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                {showCompleted ? 'Hide' : 'Show'} {completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}
              </button>
              
              {showCompleted && (
                <div className="mt-2 space-y-2">
                  {completedTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSave}
        task={editingTask}
        claimId={claimId}
        claimJobNumber={claimJobNumber}
        claimReg={claimReg}
      />
    </div>
  );
}