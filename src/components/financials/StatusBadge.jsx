import React from 'react';
import { cn } from '@/lib/utils';

/** Status in this design is a small dot and a plain label — never a filled card. */
const DOTS = {
  done: 'bg-green-500',
  waiting: 'bg-amber-500',
  action: 'bg-red-500',
  idle: 'bg-mac-muted',
};

export default function StatusBadge({ tone = 'idle', children, className }) {
  if (!children) return null;
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] text-mac-muted', className)}>
      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', DOTS[tone] || DOTS.idle)} />
      {children}
    </span>
  );
}