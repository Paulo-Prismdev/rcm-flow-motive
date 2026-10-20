import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ClipboardCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useToast } from '@/components/ui/use-toast';
import ExcessModeField from '@/components/shared/ExcessModeField';
import { logExcessChange } from '@/components/shared/logExcessChange';

/**
 * £0 on the excess has always meant "waived", but on a claim allocated before
 * the excess was known it may really mean "not known yet". This lists the open
 * claims still holding £0 so each one can be checked and, where it is really
 * unknown, set to TBC on authority — which takes it off this list. Nothing is
 * changed automatically.
 */
const OPEN_ZERO_EXCESS = {
  policy_excess: 0,
  archived: { $ne: true },
  claim_complete_date: { $in: [null, ''] },
  cancellation_date: { $in: [null, ''] },
  job_status: { $nin: ['Cancelled'] },
};

const LIST_FIELDS = ['job_number', 'reg', 'client_name', 'claim_type', 'job_status', 'secondary_status', 'date_received', 'insurer', 'policy_excess', 'excess_tbc'];

export default function ExcessReviewTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [savingId, setSavingId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['excessReviewZero'],
    queryFn: () => base44.entities.Claim.filter(OPEN_ZERO_EXCESS, { sort: '-created_date', limit: 200, fields: LIST_FIELDS }),
  });
  const claims = data?.items || [];

  const change = async (claim, patch) => {
    setSavingId(claim.id);
    // Logged first, against the claim as it stands, so the history reads the change.
    await logExcessChange(claim, patch);
    await base44.entities.Claim.update(claim.id, patch);
    await queryClient.invalidateQueries({ queryKey: ['excessReviewZero'] });
    setSavingId(null);
    toast({
      title: `${claim.job_number || 'Claim'} — excess updated`,
      description: patch.excess_tbc === true ? 'Now TBC on authority: the excess invoices wait for the Final Authority.' : 'Now entered as a figure.',
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-start gap-2">
          <ClipboardCheck className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">Claims holding a £0 excess</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              £0 has always been read as <span className="font-semibold text-foreground">Waived</span> — nothing payable — and
              existing claims are left exactly as they are. Where the excess was really never known, set it to{' '}
              <span className="font-semibold text-foreground">TBC on authority</span> and the claim leaves this list.
            </p>
            <p className="text-[11px] font-semibold text-foreground mt-1">
              {isLoading ? 'Checking claims…' : `${claims.length} open claim${claims.length === 1 ? '' : 's'} to check`}
            </p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs">Loading the claims…</span>
        </div>
      ) : claims.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-xs text-muted-foreground">No open claim holds a £0 excess — nothing to check.</p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
          {claims.map((claim) => (
            <div key={claim.id} className="p-3 flex flex-col md:flex-row md:items-start gap-3 md:gap-5">
              <div className="md:w-56 flex-shrink-0 min-w-0">
                <Link
                  to={`${createPageUrl('Claims')}?id=${claim.id}`}
                  className="text-sm font-semibold text-primary hover:underline m-ellipsis block"
                >
                  {claim.job_number || 'Claim'}
                </Link>
                <p className="text-[11px] text-muted-foreground m-ellipsis">{claim.reg || 'No registration'}</p>
                <p className="text-[11px] text-muted-foreground m-ellipsis">{claim.client_name || 'No client'}</p>
              </div>

              <div className="md:w-44 flex-shrink-0 min-w-0">
                <p className="text-[11px] text-muted-foreground m-ellipsis">{claim.claim_type || 'Claim type not set'}</p>
                <p className="text-[11px] text-muted-foreground m-ellipsis">{claim.secondary_status || claim.job_status || '—'}</p>
                <p className="text-[11px] text-muted-foreground m-ellipsis">{claim.insurer || '—'}</p>
              </div>

              <div className="flex-1 min-w-0">
                {savingId === claim.id ? (
                  <div className="flex items-center gap-2 text-muted-foreground py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[11px]">Saving…</span>
                  </div>
                ) : (
                  <ExcessModeField claim={claim} onChange={(patch) => change(claim, patch)} compact />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}