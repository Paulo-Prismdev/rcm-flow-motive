import React from 'react';
import { cn } from '@/lib/utils';

/**
 * How far a step has got, drawn the way a source list draws it: an empty circle for
 * a step that hasn't started, a half-filled circle for one part way or waiting, a
 * tick once it is done, and a dash where the job holds nothing of that kind.
 */
export default function StepGlyph({ state = 'idle', className }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4 flex-shrink-0', className)} aria-hidden="true">
      <circle cx="8" cy="8" r="6.1" fill="none" stroke="currentColor" strokeWidth="1.3" />
      {state === 'partial' && <path d="M8 1.9a6.1 6.1 0 0 1 0 12.2z" fill="currentColor" />}
      {state === 'done' && (
        <path d="M5.3 8.2 7.2 10.1 10.7 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {state === 'na' && <path d="M5.4 8h5.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}