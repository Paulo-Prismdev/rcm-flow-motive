import React from 'react';
import { Button } from '@/components/ui/button';
import { X, CheckCircle } from 'lucide-react';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary' }) {
  if (!isOpen) return null;

  const variantStyles = {
    primary: 'bg-accent hover:bg-accent-hover text-accent-foreground',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    info: 'bg-blue-600 hover:bg-blue-700 text-white',
  };

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="glass-elevated w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-foreground">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="neomorph-flat p-2 hover:bg-surface-hover transition-colors rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="neomorph-inset p-4 mb-6 rounded-lg">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            onClick={onClose}
            className="neomorph-flat px-6 py-2.5 text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            {cancelText}
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-6 py-2.5 text-sm font-medium transition-colors rounded-xl ${variantStyles[variant]}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}