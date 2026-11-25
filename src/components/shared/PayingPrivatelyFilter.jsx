import React from 'react';
import { PoundSterling } from 'lucide-react';

// Every claims list (staff, client, referrer and repairer portals) shows all jobs in
// one list; this button narrows it to privately paying jobs.
export const isPrivateJob = (c) => c?.claim_type === 'Paying Privately' || c?.claim_type === '3rd Party Paying Privately';

export default function PayingPrivatelyFilter({ active, onChange, count = 0 }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      aria-pressed={active}
      title="Show only privately paying jobs (client or third party paying)"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${
        active ? 'bg-info-bg border-info/30 text-info-fg' : 'border-border text-muted-foreground hover:bg-card hover:border-input'
      }`}
    >
      <PoundSterling className="w-3.5 h-3.5" aria-hidden="true" />
      Paying Privately
      <span className="opacity-70">{count}</span>
    </button>
  );
}
