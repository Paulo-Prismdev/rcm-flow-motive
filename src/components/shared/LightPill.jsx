import React from 'react';
import { cn } from '@/lib/utils';
import { lightPill } from './trafficLight';

/** The status word as a solid pill: white text on red and green, dark on amber. */
export default function LightPill({ lightKey, children, className }) {
  if (!children) return null;
  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold',
        lightPill(lightKey),
        className
      )}
    >
      {children}
    </span>
  );
}