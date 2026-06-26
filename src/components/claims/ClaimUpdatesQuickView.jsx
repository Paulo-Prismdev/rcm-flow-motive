import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Clock, Calendar, User, MessageSquare, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import ClaimUpdateForm from './ClaimUpdateForm';

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

  const handleUpdateCreated = (newStatus, newSecondaryStatus) => {
    const now = new Date();
    const closedStatuses = ['Completed', 'Cancelled', 'Total Loss'];
    const effectiveStatus = newStatus || claim?.job_status;
    const isClosedAfterUpdate = closedStatuses.includes(effectiveStatus);
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const updateData = {
      ...(!isClosedAfterUpdate && {
        last_updated_at: now.toISOString(),
        next_update_due_at: fortyEightHoursFromNow.toISOString(),
        update_status_flag: 'Green',
      }),
      ...(isClosedAfterUpdate && {
        update_status_flag: 'Gray',
      }),
    };
    if (newStatus) updateData.job_status = newStatus;
    if (newSecondaryStatus !== undefined) updateData.secondary_status = newSecondaryStatus;

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
                    isStatusChange
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'
                      : 'bg-card border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${UPDATE_TYPE_COLORS[update.update_type] || 'bg-gray-500'}`}>
                      {update.update_type}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(update.created_date), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </div>

                  {update.description && (
                    <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{update.description}</p>
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

                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                    <User className="w-3 h-3" />
                    {update.created_by || 'Unknown'}
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
                            <p className="text-sm text-foreground whitespace-pre-wrap">{reply.description}</p>
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