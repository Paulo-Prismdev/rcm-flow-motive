import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary' }) {
  const variantStyles = {
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    success: 'bg-success hover:bg-success text-on-solid',
    danger: 'bg-danger hover:bg-danger text-on-solid',
    info: 'bg-info hover:bg-info text-on-solid',
  };

  const iconColor = {
    primary: 'text-primary',
    success: 'text-success-fg',
    danger: 'text-danger-fg',
    info: 'text-info-fg',
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent
        className="max-w-sm !animate-none"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', animation: 'none' }}
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-danger-bg flex items-center justify-center flex-shrink-0">
              <AlertTriangle className={cn('w-4 h-4', iconColor[variant] || iconColor.primary)} />
            </div>
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 leading-relaxed">
            {message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            className={cn(variantStyles[variant] || variantStyles.primary)}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}