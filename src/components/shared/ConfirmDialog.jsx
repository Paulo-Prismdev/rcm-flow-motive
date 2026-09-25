import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary' }) {
  if (!isOpen) return null;

  const variantStyles = {
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
  };

  const iconColor = {
    primary: 'text-primary',
    success: 'text-green-600',
    danger: 'text-red-600',
    info: 'text-blue-600',
  };

  return createPortal(
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-card border border-border rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className={`w-4 h-4 ${iconColor[variant] || iconColor.primary}`} />
            </div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="px-5 pb-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-5 pb-5 justify-end">
          <Button
            onClick={onClose}
            variant="outline"
            className="min-w-[80px]"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
            }}
            className={`min-w-[80px] ${variantStyles[variant] || variantStyles.primary}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}