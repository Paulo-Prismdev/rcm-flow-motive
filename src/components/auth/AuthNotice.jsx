import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

const TONES = {
  danger: { cls: 'bg-danger-bg text-danger-fg', Icon: AlertCircle, role: 'alert' },
  warning: { cls: 'bg-warning-bg text-warning-fg', Icon: AlertCircle, role: 'alert' },
  success: { cls: 'bg-success-bg text-success-fg', Icon: CheckCircle2, role: 'status' },
  info: { cls: 'bg-info-bg text-info-fg', Icon: Info, role: 'status' },
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
