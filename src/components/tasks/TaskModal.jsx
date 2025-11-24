import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, User, Flag, Save, X } from "lucide-react";

export default function TaskModal({ isOpen, onClose, onSave, task, claimId, claimJobNumber, claimReg }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    assigned_to_name: '',
    priority: 'Medium',
    due_date: '',
    status: 'Pending'
  });

  const { data: users = [] } = useQuery({
    queryKey: ['internalUsers'],
    queryFn: async () => {
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => u.user_type === 'internal' || u.role === 'admin');
    },
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assigned_to: task.assigned_to || '',
        assigned_to_name: task.assigned_to_name || '',
        priority: task.priority || 'Medium',
        due_date: task.due_date || '',
        status: task.status || 'Pending'
      });
    } else {
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        assigned_to_name: '',
        priority: 'Medium',
        due_date: '',
        status: 'Pending'
      });
    }
  }, [task, isOpen]);

  const handleUserChange = (email) => {
    const user = users.find(u => u.email === email);
    setFormData({
      ...formData,
      assigned_to: email,
      assigned_to_name: user?.full_name || ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const taskData = {
      ...formData,
      claim_id: claimId,
      claim_job_number: claimJobNumber,
      claim_reg: claimReg
    };
    
    onSave(taskData);
  };

  const priorityColors = {
    Low: 'bg-gray-100 text-gray-700',
    Medium: 'bg-blue-100 text-blue-700',
    High: 'bg-orange-100 text-orange-700',
    Urgent: 'bg-red-100 text-red-700'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title..."
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task details..."
              className="mt-1 h-24"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assigned_to">
                <User className="w-4 h-4 inline mr-1" />
                Assign To
              </Label>
              <select
                id="assigned_to"
                value={formData.assigned_to}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full mt-1 neomorph-inset px-3 py-2 rounded-lg border-0 text-sm"
              >
                <option value="">Unassigned</option>
                {users.map(user => (
                  <option key={user.id} value={user.email}>
                    {user.full_name || user.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="due_date">
                <Calendar className="w-4 h-4 inline mr-1" />
                Due Date
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                <Flag className="w-4 h-4 inline mr-1" />
                Priority
              </Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {['Low', 'Medium', 'High', 'Urgent'].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p })}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      formData.priority === p 
                        ? priorityColors[p] + ' ring-2 ring-offset-1 ring-current' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {task && (
              <div>
                <Label>Status</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full mt-1 neomorph-inset px-3 py-2 rounded-lg border-0 text-sm"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" className="bg-accent text-accent-foreground">
              <Save className="w-4 h-4 mr-2" />
              {task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}