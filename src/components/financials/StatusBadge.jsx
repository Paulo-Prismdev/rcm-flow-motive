import React from 'react';
import { cn } from '@/lib/utils';
import { lightDot } from '@/components/shared/trafficLight';

/** The light's own colours: status in this design is a dot, never a filled card. */
const DOTS = {
  done: lightDot('green'),
  waiting: lightDot('amber'),
  action: lightDot('red'),
  idle: lightDot('grey'),
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