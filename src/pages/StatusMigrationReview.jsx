import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader, CheckCircle2, AlertTriangle, RotateCcw, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  JOURNEY_STATUSES,
  SECONDARY_STATUSES,
  TERTIARY_STATUSES,
  EXCEPTION_JOURNEY_STATUSES,
  isExceptionJourney,
  suggestMapping,
} from '@/components/shared/claimStatusV2';

function StatusSelect({ value, onChange, options, placeholder, disabled }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className="input h-9 text-xs min-h-0"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => {
        const name = typeof opt === 'string' ? opt : opt.name;
        const suffix = typeof opt === 'object' && EXCEPTION_JOURNEY_STATUSES.includes(name) ? '  (exception)' : '';
        return (
          <option key={name} value={name}>
            {name}{suffix}
          </option>
        );
      })}
    </select>
  );
}

export default function StatusMigrationReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['claims', 'status-migration'],
    queryFn: () => base44.entities.Claim.list('-created_date', 1000),
  });

  // Open (non-archived, non-draft) claims only
  const openClaims = useMemo(
    () => claims.filter((c) => !c.archived && !c.draft),
    [claims]
  );

  // Per-claim editable mapping state: { [claimId]: { journey_status, secondary_status, tertiary_status } }
  const [edits, setEdits] = useState({});

  useEffect(() => {
    if (!openClaims.length) return;
    setEdits((prev) => {
      const next = { ...prev };
      openClaims.forEach((c) => {
        if (!next[c.id]) {
          // Prefer already-migrated values if present, else suggest from legacy
          const hasMigrated = c.journey_status || c.secondary_status || c.tertiary_status;
          next[c.id] = hasMigrated
            ? {
                journey_status: c.journey_status || null,
                secondary_status: c.secondary_status || null,
                tertiary_status: c.tertiary_status || null,
              }
            : suggestMapping(c);
        }
      });
      return next;
    });
  }, [openClaims]);

  const isUnchanged = (claim) => {
    const e = edits[claim.id];
    if (!e) return true;
    const sameJourney = (e.journey_status || null) === (claim.journey_status || null);
    const sameSecondary = (e.secondary_status || null) === (claim.secondary_status || null);
    const sameTertiary = (e.tertiary_status || null) === (claim.tertiary_status || null);
    return sameJourney && sameSecondary && sameTertiary;
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => base44.entities.Claim.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'status-migration'] });
    },
  });

  const bulkMutation = useMutation({
    mutationFn: async (updates) => base44.entities.Claim.bulkUpdate(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims', 'status-migration'] });
    },
  });

  const buildPayload = (e) => {
    const exception = isExceptionJourney(e.journey_status);
    return {
      journey_status: e.journey_status,
      secondary_status: exception ? null : e.secondary_status,
      tertiary_status: exception ? null : e.tertiary_status,
    };
  };

  const applyOne = async (claim) => {
    const e = edits[claim.id];
    if (!e || !e.journey_status) {
      toast({ title: 'Select a journey status first', variant: 'destructive' });
      return;
    }
    try {
      await updateMutation.mutateAsync({ id: claim.id, data: buildPayload(e) });
      toast({ title: 'Updated', description: claim.job_number });
    } catch (err) {
      toast({ title: 'Failed', variant: 'destructive' });
    }
  };

  const applyAll = async () => {
    const ready = openClaims
      .filter((c) => !isUnchanged(c) && edits[c.id]?.journey_status)
      .map((c) => ({ id: c.id, ...buildPayload(edits[c.id]) }));
    if (!ready.length) {
      toast({ title: 'Nothing to apply', description: 'All open claims already match.' });
      return;
    }
    try {
      await bulkMutation.mutateAsync(ready);
      toast({ title: `Applied to ${ready.length} claims`, description: 'Legacy job_status left intact for rollback.' });
    } catch (err) {
      toast({ title: 'Bulk apply failed', variant: 'destructive' });
    }
  };

  const resetAll = () => {
    const next = {};
    openClaims.forEach((c) => { next[c.id] = suggestMapping(c); });
    setEdits(next);
    toast({ title: 'Reset to best-guess mapping' });
  };

  const pendingCount = openClaims.filter((c) => !isUnchanged(c)).length;

  return (
    <div className="h-full overflow-y-auto space-y-4 p-4 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Status Migration Review</h1>
          <p className="text-sm text-muted-foreground">
            Review the best-guess mapping of each open claim's legacy status into the new
            <strong> Client Journey Status</strong> + <strong>Secondary Status</strong> (group) + <strong>Tertiary Status</strong> (info). Correct any row, then apply.
            Legacy <code>job_status</code> is never touched — rollback by disabling the v2 flag.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetAll} className="flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reset to best-guess
          </Button>
          <Button size="sm" onClick={applyAll} disabled={bulkMutation.isPending || !pendingCount} className="flex items-center gap-1.5">
            {bulkMutation.isPending ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Apply all ({pendingCount})
          </Button>
        </div>
      </div>

      <div className="neomorph p-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Staging:</strong> This tool is live but the new status UI is disabled until the v2 flag is switched on.
            Applying here only populates the new fields so they're ready when you go live.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader className="w-6 h-6 animate-spin" /></div>
      ) : openClaims.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No open claims to migrate.</p>
      ) : (
        <div className="space-y-2">
          {openClaims.map((claim) => {
            const e = edits[claim.id];
            if (!e) return null;
            const exception = isExceptionJourney(e.journey_status);
            const changed = !isUnchanged(claim);
            return (
              <div key={claim.id} className={`neomorph-flat p-3 ${changed ? 'ring-1 ring-primary/30' : ''}`}>
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Identity */}
                  <div className="lg:w-56 shrink-0">
                    <div className="font-semibold text-sm">{claim.job_number || '—'}</div>
                    <div className="text-xs text-muted-foreground">
                      {claim.reg && <span className="font-medium">{claim.reg} · </span>}
                      {[claim.vehicle_make, claim.vehicle_model].filter(Boolean).join(' ') || claim.make_model || '—'}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-muted">Old: {claim.job_status || '—'}</span>
                      {claim.secondary_status && <span className="px-1.5 py-0.5 rounded bg-muted">Old sec: {claim.secondary_status}</span>}
                    </div>
                  </div>

                  {/* New mapping — three single-selects */}
                  <div className="flex-1 grid md:grid-cols-3 gap-3 items-start">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">Client Journey Status</label>
                      <StatusSelect
                        value={e.journey_status}
                        onChange={(v) => setEdits((s) => ({ ...s, [claim.id]: { ...s[claim.id], journey_status: v } }))}
                        options={JOURNEY_STATUSES}
                        placeholder="— Select journey —"
                      />
                      {exception && (
                        <span className="block text-[10px] text-amber-600 mt-1">Exception — banner override</span>
                      )}
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Secondary Status {exception && '(not used)'}
                      </label>
                      <StatusSelect
                        value={e.secondary_status}
                        disabled={exception}
                        onChange={(v) => setEdits((s) => ({ ...s, [claim.id]: { ...s[claim.id], secondary_status: v } }))}
                        options={SECONDARY_STATUSES}
                        placeholder="— Select group —"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                        Tertiary Status {exception && '(not used)'}
                      </label>
                      <StatusSelect
                        value={e.tertiary_status}
                        disabled={exception}
                        onChange={(v) => setEdits((s) => ({ ...s, [claim.id]: { ...s[claim.id], tertiary_status: v } }))}
                        options={TERTIARY_STATUSES}
                        placeholder="— Select info —"
                      />
                    </div>
                  </div>

                  {/* Action */}
                  <div className="lg:w-28 shrink-0 flex lg:flex-col gap-2 items-end">
                    <Button
                      size="sm"
                      variant={changed ? 'default' : 'outline'}
                      disabled={!changed || updateMutation.isPending || !e.journey_status}
                      onClick={() => applyOne(claim)}
                      className="flex items-center gap-1.5 w-full justify-center"
                    >
                      <ArrowRight className="w-3.5 h-3.5" /> Apply
                    </Button>
                    {claim.journey_status && (
                      <span className="text-[10px] text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> migrated
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}