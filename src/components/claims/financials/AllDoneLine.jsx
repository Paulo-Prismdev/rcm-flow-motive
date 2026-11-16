import React from 'react';
import { Check } from 'lucide-react';

/**
 * The single closing line, under the last step, once every step is done — it
 * takes the place of the next-step prompt rather than sitting in a banner of its
 * own at the top.
 */
export default function AllDoneLine() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-l-4 border-success/30 bg-success-bg px-3 py-2.5">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-success/20">
        <Check className="h-3 w-3 text-success-fg" strokeWidth={3} />
      </span>
      <p className="text-xs font-semibold text-success-fg">
        All done — nothing left to do on this job's invoicing.
      </p>
    </div>
  );
}