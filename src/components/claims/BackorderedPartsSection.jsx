import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, CheckCircle2, Circle, Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function BackorderedPartsSection({ claim, currentUser, onSendEmail }) {
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: backorderedParts = [], isLoading } = useQuery({
    queryKey: ['backorderedParts', claim.id],
    queryFn: () => base44.entities.BackorderedPart.filter({ claim_id: claim.id }),
  });

  const markReceivedMutation = useMutation({
    mutationFn: ({ partId, received }) =>
      base44.entities.BackorderedPart.update(partId, {
        received_by_repairer: received,
        received_date: received ? new Date().toISOString().split('T')[0] : '',
        received_by_user: received ? currentUser?.email : '',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backorderedParts', claim.id] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (partId) => base44.entities.BackorderedPart.delete(partId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['backorderedParts', claim.id] }),
  });

  const appOrigin = window.location.hostname.includes('base44.app')
    ? `https://${window.location.hostname.replace(/^preview-sandbox--/, '')}`
    : window.location.origin;
  const formUrl = `${appOrigin}/backorder-form?claim=${claim.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const pendingCount = backorderedParts.filter(p => !p.received_by_repairer).length;
  const receivedCount = backorderedParts.filter(p => p.received_by_repairer).length;

  return (
    <div className="neomorph-flat p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-gold" />
          <h3 className="font-bold">Backordered Parts</h3>
          {backorderedParts.length > 0 && (
            <div className="flex gap-1.5">
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                  {pendingCount} pending
                </span>
              )}
              {receivedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                  {receivedCount} received
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Link sharing area */}
      <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 dark:bg-black/10">
        <p className="text-xs text-foreground-muted mb-2">Send this link to the repairer to report backordered parts:</p>
        <div className="flex gap-2">
          <input
            readOnly
            value={formUrl}
            className="flex-1 text-xs px-3 py-2 rounded-lg bg-white/10 border border-border text-foreground-muted truncate"
          />
          <Button size="sm" variant="outline" onClick={copyLink} className="flex-shrink-0 gap-1.5">
            {copiedLink ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied!' : 'Copy'}
          </Button>
          {onSendEmail && (
            <Button size="sm" variant="outline" onClick={onSendEmail} className="flex-shrink-0 gap-1.5">
              Send via Email
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-6 text-foreground-muted text-sm">Loading...</div>
      ) : backorderedParts.length === 0 ? (
        <div className="text-center py-8 text-foreground-muted">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No backordered parts reported yet.</p>
          <p className="text-xs mt-1 opacity-70">Send the link above to the repairer to log parts.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {backorderedParts.map((part) => (
            <div
              key={part.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                part.received_by_repairer
                  ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                  : 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800'
              }`}
            >
              <button
                onClick={() => markReceivedMutation.mutate({ partId: part.id, received: !part.received_by_repairer })}
                disabled={markReceivedMutation.isPending}
                className="mt-0.5 flex-shrink-0"
                title={part.received_by_repairer ? 'Mark as not received' : 'Mark as received'}
              >
                {part.received_by_repairer
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <Circle className="w-5 h-5 text-amber-500" />
                }
              </button>

              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${part.received_by_repairer ? 'line-through text-foreground-muted' : 'text-foreground'}`}>
                  {part.part_description}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {part.part_number && (
                    <span className="text-xs text-foreground-muted">Part #: {part.part_number}</span>
                  )}
                  {part.supplier_name && (
                    <span className="text-xs text-foreground-muted">Supplier: {part.supplier_name}</span>
                  )}
                  {part.expected_arrival_date && (
                    <span className="text-xs text-foreground-muted">
                      Expected: {format(new Date(part.expected_arrival_date), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {part.submitted_by_name && (
                    <span className="text-xs text-foreground-muted">Reported by: {part.submitted_by_name}</span>
                  )}
                </div>
                {part.additional_notes && (
                  <p className="text-xs text-foreground-muted mt-1 italic">{part.additional_notes}</p>
                )}
                {part.received_by_repairer && part.received_date && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                    ✓ Received {format(new Date(part.received_date), 'dd/MM/yyyy')}
                  </p>
                )}
              </div>

              <button
                onClick={() => {
                  if (window.confirm('Remove this part from the list?')) {
                    deleteMutation.mutate(part.id);
                  }
                }}
                className="flex-shrink-0 text-foreground-muted hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}