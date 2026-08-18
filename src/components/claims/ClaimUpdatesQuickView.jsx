import React, { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Clock, Calendar, User, MessageSquare, Plus, Star, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import ClaimUpdateForm from './ClaimUpdateForm';
import UpdateDirectionBadges from './UpdateDirectionBadges';

const CopyTextButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 mt-0.5 text-muted-foreground/40 hover:text-primary transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
    </button>
  );
};

const UPDATE_TYPE_COLORS = {
  "Status Change": "bg-purple-500", "Client Communication": "bg-blue-500",
  "Bodyshop Communication": "bg-green-500", "Insurer Communication": "bg-orange-500",
  "Referrer Response": "bg-amber-500", "Action Taken": "bg-indigo-500",
  "Awaiting Information": "bg-yellow-500", "Documentation Received": "bg-teal-500",
  "Parts Update": "bg-pink-500", "Repair Progress": "bg-cyan-500",
  "Quality Check": "bg-emerald-500", "Other": "bg-gray-500"
};

export default function ClaimUpdatesQuickView({ claim, isOpen, onClose }) {
  const claimId = claim?.id;
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['claimUpdates', claimId],
    queryFn: () => base44.entities.ClaimUpdate.filter({ claim_id: claimId }, '-created_date', 500),
    enabled: isOpen && !!claimId,
    staleTime: 0,
  });

  // Clear the unread bodyshop update bubble and mark repair_update_received
  // notifications as read once an internal user opens the updates view
  React.useEffect(() => {
    if (!isOpen || !claimId) return;

    if (claim?.unread_bodyshop_update) {
      base44.entities.Claim.update(claimId, { unread_bodyshop_update: false })
        .then(() => queryClient.invalidateQueries({ queryKey: ['claims'] }))
        .catch(err => console.error('Failed to clear unread bodyshop update flag:', err));
    }

    // Always mark the current user's repair_update_received notifications for
    // this claim as read when they open the updates view — this cleans up any
    // notifications that were created before this auto-read logic existed.
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!me?.email) return;
        const notifs = await base44.entities.Notification.filter({
          user_email: me.email,
          related_item_id: claimId,
          type: 'repair_update_received',
          is_read: false,
        });
        if (notifs.length === 0) return;
        await base44.entities.Notification.bulkUpdate(
          notifs.map(n => ({ id: n.id, is_read: true }))
        );
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      } catch (err) {
        console.error('Failed to mark repair update notifications as read:', err);
      }
    })();
  }, [isOpen, claimId, claim?.unread_bodyshop_update, queryClient]);

  const toggleStarMutation = useMutation({
    mutationFn: async ({ updateId, isStarred }) => {
      return await base44.entities.ClaimUpdate.update(updateId, { starred: !isStarred });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['claimUpdates', claimId] }),
  });

  const handleUpdateCreated = (newStatus, newSecondaryStatus, newTertiaryStatus, updateType, direction) => {
    const now = new Date();
    const closedStatuses = ['Completed', 'Cancelled', 'Total Loss'];
    const effectiveStatus = newStatus || claim?.job_status;
    const isClosedAfterUpdate = closedStatuses.includes(effectiveStatus);
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // General 48hr timer only resets on an Incoming update (any type).
    // Client comm timer only resets on an Outgoing Client Communication.
    const resetGeneral = direction === 'Incoming';
    const resetClientComm = updateType === 'Client Communication' && direction === 'Outgoing';

    const updateData = {
      ...(resetGeneral && !isClosedAfterUpdate && {
        last_updated_at: now.toISOString(),
        next_update_due_at: fortyEightHoursFromNow.toISOString(),
        update_status_flag: 'Green',
      }),
      ...(resetGeneral && isClosedAfterUpdate && {
        update_status_flag: 'Gray',
      }),
    };
    if (resetClientComm) {
      if (isClosedAfterUpdate) {
        updateData.client_comm_status_flag = 'Gray';
      } else {
        updateData.last_client_comm_at = now.toISOString();
        updateData.next_client_comm_due_at = fortyEightHoursFromNow.toISOString();
        updateData.client_comm_status_flag = 'Green';
      }
    }
    // Only modify statuses for an explicit Status Change — a regular update
    // must never alter job_status, secondary_status or tertiary_status.
    if (updateType === 'Status Change') {
      if (newStatus) updateData.job_status = newStatus;
      updateData.secondary_status = newSecondaryStatus || null;
      updateData.tertiary_status = newTertiaryStatus || null;
    }

    base44.entities.Claim.update(claimId, updateData).then(() => {
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claimUpdates', claimId] });
    }).catch(err => console.error('Failed to reset update timer:', err));

    setShowForm(false);
  };

  const topLevelUpdates = updates.filter(u => !u.parent_update_id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-primary" />
            Updates — {claim?.reg || claim?.job_number || 'Claim'}
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            {claim?.client_name || '—'} · {topLevelUpdates.length} update{topLevelUpdates.length !== 1 ? 's' : ''}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {!showForm ? (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />Add New Update
            </Button>
          ) : (
            <ClaimUpdateForm
              claimId={claimId}
              claim={claim}
              currentStatus={claim?.job_status}
              onUpdateCreated={handleUpdateCreated}
              onCancel={() => setShowForm(false)}
            />
          )}

          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground py-8">Loading updates...</div>
          ) : topLevelUpdates.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            </div>
          ) : (
            topLevelUpdates.map(update => {
              const isStatusChange = update.update_type === 'Status Change';
              const replies = updates.filter(u => u.parent_update_id === update.id)
                .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

              return (
                <div
                  key={update.id}
                  className={`border rounded-lg p-3 ${
                    update.starred ? 'ring-2 ring-amber-400 border-amber-400' : ''
                  } ${
                    isStatusChange
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${UPDATE_TYPE_COLORS[update.update_type] || 'bg-gray-500'}`}>
                      {update.update_type}
                    </span>
                    <UpdateDirectionBadges update={update} />
                    {update.starred && (
                      <span className="inline-flex items-center gap-1 text-amber-500 text-[10px] font-semibold">
                        <Star className="w-3 h-3 fill-amber-400" />Flagged
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(update.created_date), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>

                  {update.description && (
                    <div className="flex items-start gap-1.5 mb-2">
                      <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{update.description}</p>
                      <CopyTextButton text={update.description} />
                    </div>
                  )}

                  {update.next_steps && (
                    <div className="text-sm mb-2 mt-2 bg-muted/50 rounded p-2">
                      <p className="font-medium mb-1 text-foreground text-xs uppercase tracking-wide">Next Steps:</p>
                      <p className="text-muted-foreground whitespace-pre-wrap">{update.next_steps}</p>
                    </div>
                  )}

                  {update.due_date_for_next_action && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <Clock className="w-3 h-3" />
                      Due: {format(new Date(update.due_date_for_next_action), 'dd/MM/yyyy')}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-1 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {update.created_by || 'Unknown'}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStarMutation.mutate({ updateId: update.id, isStarred: update.starred })}
                      className={`h-6 px-2 text-xs ${update.starred ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground'}`}
                      title={update.starred ? 'Remove flag' : 'Flag as important'}
                    >
                      <Star className={`w-3 h-3 mr-1 ${update.starred ? 'fill-amber-400' : ''}`} />
                      {update.starred ? 'Flagged' : 'Flag'}
                    </Button>
                  </div>

                  {replies.length > 0 && (
                    <div className="ml-4 mt-3 space-y-2 border-l-2 border-border pl-4">
                      {replies.map(reply => (
                        <div key={reply.id} className="bg-muted/30 border border-border rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {reply.created_by || 'Unknown'}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(reply.created_date), 'dd/MM/yyyy HH:mm')}
                            </span>
                          </div>
                          {reply.description && (
                            <div className="flex items-start gap-1.5">
                              <p className="text-sm text-foreground whitespace-pre-wrap flex-1">{reply.description}</p>
                              <CopyTextButton text={reply.description} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}