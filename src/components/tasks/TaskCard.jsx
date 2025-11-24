import React from 'react';
import { Button } from "@/components/ui/button";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  User, 
  Calendar,
  Edit,
  Trash2,
  Play,
  Flag
} from "lucide-react";

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, compact = false }) {
  const priorityStyles = {
    Low: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' },
    Medium: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    High: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
    Urgent: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' }
  };

  const statusStyles = {
    Pending: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
    'In Progress': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Play },
    Completed: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    Cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: Clock }
  };

  const getDueDateDisplay = () => {
    if (!task.due_date) return null;
    
    const dueDate = new Date(task.due_date);
    const isOverdue = isPast(dueDate) && !isToday(dueDate) && task.status !== 'Completed' && task.status !== 'Cancelled';
    const isDueToday = isToday(dueDate);
    const isDueTomorrow = isTomorrow(dueDate);
    const daysUntil = differenceInDays(dueDate, new Date());

    let label = format(dueDate, 'dd MMM yyyy');
    let style = 'text-foreground-muted';

    if (task.status === 'Completed' || task.status === 'Cancelled') {
      style = 'text-gray-400';
    } else if (isOverdue) {
      label = `Overdue (${format(dueDate, 'dd MMM')})`;
      style = 'text-red-600 font-medium';
    } else if (isDueToday) {
      label = 'Due Today';
      style = 'text-orange-600 font-medium';
    } else if (isDueTomorrow) {
      label = 'Due Tomorrow';
      style = 'text-amber-600 font-medium';
    } else if (daysUntil <= 3) {
      label = `Due in ${daysUntil} days`;
      style = 'text-amber-600';
    }

    return { label, style, isOverdue };
  };

  const dueInfo = getDueDateDisplay();
  const priority = priorityStyles[task.priority] || priorityStyles.Medium;
  const status = statusStyles[task.status] || statusStyles.Pending;
  const StatusIcon = status.icon;

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border ${task.status === 'Completed' ? 'opacity-60' : ''} ${dueInfo?.isOverdue ? 'border-red-300 bg-red-50' : 'neomorph-flat'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${priority.bg} ${priority.text}`}>
                {task.priority}
              </span>
              <h4 className={`font-medium text-sm truncate ${task.status === 'Completed' ? 'line-through' : ''}`}>
                {task.title}
              </h4>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs">
              {task.assigned_to_name && (
                <span className="flex items-center gap-1 text-foreground-muted">
                  <User className="w-3 h-3" />
                  {task.assigned_to_name}
                </span>
              )}
              {dueInfo && (
                <span className={`flex items-center gap-1 ${dueInfo.style}`}>
                  {dueInfo.isOverdue && <AlertTriangle className="w-3 h-3" />}
                  <Calendar className="w-3 h-3" />
                  {dueInfo.label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {task.status !== 'Completed' && task.status !== 'Cancelled' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStatusChange(task.id, 'Completed')}
                className="h-7 w-7 p-0 text-green-600 hover:bg-green-100"
                title="Mark Complete"
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(task)}
              className="h-7 w-7 p-0"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border transition-all ${task.status === 'Completed' ? 'opacity-60' : ''} ${dueInfo?.isOverdue ? 'border-red-300 bg-red-50/50' : 'neomorph-flat hover:shadow-md'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${priority.bg} ${priority.text}`}>
              <Flag className="w-3 h-3 inline mr-1" />
              {task.priority}
            </span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
              <StatusIcon className="w-3 h-3 inline mr-1" />
              {task.status}
            </span>
          </div>
          
          <h3 className={`font-semibold text-base mb-1 ${task.status === 'Completed' ? 'line-through text-gray-500' : ''}`}>
            {task.title}
          </h3>
          
          {task.description && (
            <p className="text-sm text-foreground-muted mb-3 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm flex-wrap">
            {task.assigned_to_name && (
              <span className="flex items-center gap-1.5 text-foreground-muted">
                <User className="w-4 h-4" />
                {task.assigned_to_name}
              </span>
            )}
            {dueInfo && (
              <span className={`flex items-center gap-1.5 ${dueInfo.style}`}>
                {dueInfo.isOverdue && <AlertTriangle className="w-4 h-4" />}
                <Calendar className="w-4 h-4" />
                {dueInfo.label}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          {task.status === 'Pending' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusChange(task.id, 'In Progress')}
              className="h-8 px-2 text-blue-600 hover:bg-blue-100"
              title="Start Task"
            >
              <Play className="w-4 h-4" />
            </Button>
          )}
          {task.status !== 'Completed' && task.status !== 'Cancelled' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusChange(task.id, 'Completed')}
              className="h-8 px-2 text-green-600 hover:bg-green-100"
              title="Complete"
            >
              <CheckCircle2 className="w-4 h-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(task)}
            className="h-8 px-2"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(task.id)}
            className="h-8 px-2 text-red-500 hover:bg-red-100"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}