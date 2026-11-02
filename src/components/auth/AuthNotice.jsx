import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const TONES = {
  danger: { cls: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200', Icon: AlertCircle, role: 'alert' },
  warning: { cls: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200', Icon: AlertCircle, role: 'alert' },
  success: { cls: 'bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-200', Icon: CheckCircle2, role: 'status' },
  info: { cls: 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200', Icon: Info, role: 'status' },
};

// A short message above a form. Errors are announced to screen readers as they appear.
export default function AuthNotice({ tone = 'danger', children, className = '' }) {
  const { cls, Icon, role } = TONES[tone] || TONES.danger;
  return (
    <div role={role} className={`${cls} mb-4 flex items-start gap-2.5 rounded-lg p-3 text-sm ${className}`}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
