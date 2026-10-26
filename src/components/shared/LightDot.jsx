import React from 'react';
import { cn } from '@/lib/utils';
import { lightDot } from './trafficLight';

/** The status dot: a solid 12px circle beside a document's or an invoice's name. */
export default function LightDot({ lightKey, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-3 w-3 flex-shrink-0 rounded-full', lightDot(lightKey), className)}
    />
  );
}