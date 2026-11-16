import React from 'react';
import { ExternalLink, Loader2, AlertTriangle, Car, Check } from 'lucide-react';
import { createPageUrl } from '@/utils';

/**
 * What is checked after reading: the vehicle lookup run on each registration,
 * and whether a claim already on the system carries the same registration or
 * reference, so a duplicate is spotted now rather than after the claim is made.
 */
export default function IntakeChecks({ duplicates = [], registrations = [] }) {
  const hasRegistrations = registrations.some((r) => r.reg);
  if (!hasRegistrations && !duplicates.length) return null;

  return (
    <div className="space-y-1.5">
      {registrations.filter((r) => r.reg).map((r) => (
        <div key={r.reg} className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-2.5 py-1.5">
          <Car className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-muted-foreground">{r.label} · {r.reg}</p>
            {r.status === 'loading' && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Looking the vehicle up...
              </p>
            )}
            {r.status === 'found' && (
              <p className="flex items-center gap-1.5 text-xs text-success-fg">
                <Check className="w-3 h-3" /> {r.summary}
              </p>
            )}
            {r.status === 'failed' && <p className="text-xs text-warning-fg">{r.summary || 'No vehicle details came back.'}</p>}
          </div>
        </div>
      ))}

      {duplicates.map((duplicate) => (
        <div key={duplicate.id} className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning-bg px-2.5 py-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-warning-fg mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-warning-fg">
              {duplicate.job_number || 'A claim'} already has {duplicate.reasons.join(' and ')}
              {duplicate.archived ? ' (archived)' : ''}
            </p>
            <p className="text-xs text-warning-fg">
              {[duplicate.reg, duplicate.client_name].filter(Boolean).join(' · ')}
            </p>
          </div>
          <a
            href={createPageUrl(`Claims?id=${duplicate.id}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold border border-warning/30 text-warning-fg hover:bg-warning-bg flex-shrink-0"
          >
            Open <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      ))}
    </div>
  );
}