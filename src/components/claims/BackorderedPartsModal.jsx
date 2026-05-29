import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Package, CheckCircle2, Circle, Trash2, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export default function BackorderedPartsModal({ claim, currentUser, isOpen, onClose, onSendEmail }) {
  const queryClient = useQueryClient();
  const [copiedLink, setCopiedLink] = useState(false);

  const { data: backorderedParts = [], isLoading } = useQuery({
    queryKey: ['backorderedParts', claim.id],
    queryFn: () => base44.entities.BackorderedPart.filter({ claim_id: claim.id }),
    enabled: isOpen,
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
        <div className="mb-6">
          <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Backordered Parts</h2>
          {backorderedParts.length > 0 && (
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              {pendingCount} pending · {receivedCount} received
            </p>
          )}
        </div>

        {/* Link sharing area */}
        <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-[13px] text-gray-600 dark:text-gray-400 mb-2">Send this link to the repairer to report backordered parts:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={formUrl}
              className="flex-1 text-xs px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 truncate"
            />
            <Button size="sm" variant="outline" onClick={copyLink} className="flex-shrink-0 gap-1.5 h-9">
              {copiedLink ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied' : 'Copy'}
            </Button>
            {onSendEmail && (
              <Button size="sm" variant="outline" onClick={onSendEmail} className="flex-shrink-0 gap-1.5 h-9">
                Send via Email
              </Button>
            )}
          </div>
        </div>

        {/* Parts List */}
        <div className="overflow-y-auto max-h-[50vh] pb-4">
          {isLoading ? (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400 text-sm">Loading...</div>
          ) : backorderedParts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No backordered parts reported yet.</p>
              <p className="text-xs mt-1 opacity-70">Send the link above to the repairer to log parts.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {backorderedParts.map((part) => (
                <div
                  key={part.id}
                  className={`border rounded-lg p-4 transition-all ${
                    part.received_by_repairer
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                      : 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
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
                      <p className={`font-medium text-sm ${part.received_by_repairer ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {part.part_description}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {part.part_number && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Part #: {part.part_number}</span>
                        )}
                        {part.supplier_name && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Supplier: {part.supplier_name}</span>
                        )}
                        {part.expected_arrival_date && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Expected: {format(new Date(part.expected_arrival_date), 'dd/MM/yyyy')}
                          </span>
                        )}
                        {part.submitted_by_name && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">Reported by: {part.submitted_by_name}</span>
                        )}
                      </div>
                      {part.additional_notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">{part.additional_notes}</p>
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
                      className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors h-9"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}