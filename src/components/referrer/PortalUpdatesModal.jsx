import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Loader2, Send, User } from 'lucide-react';

/**
 * The claim's update feed as a portal user sees it: every shared update, newest first,
 * and a box to send one of their own. Sending goes through the server, which files it
 * against this claim only and lets the team know. Portal users can't edit or delete
 * updates, change statuses or see who staff tagged.
 */
export default function PortalUpdatesModal({ claimId, updates = [], isOpen, onClose }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const send = useMutation({
    mutationFn: async (description) => {
      const res = await base44.functions.invoke('portalClaimAction', {
        claim_id: claimId, action: 'post_update', description,
      });
      return res.data?.update;
    },
    onSuccess: () => {
      setText('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['portalClaimDetail', claimId] });
    },
    onError: (e) => setError(e?.response?.data?.error || 'Your update could not be sent. Please try again.'),
  });

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) { setError('Please write your update.'); return; }
    send.mutate(value);
  };

  const topLevel = updates.filter((u) => !u.parent_update_id);
  const repliesTo = (id) => updates.filter((u) => u.parent_update_id === id);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Updates</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-2">
          <label htmlFor="portal-update" className="text-xs font-semibold text-muted-foreground">Send an update to the team</label>
          <Textarea
            id="portal-update"
            value={text}
            onChange={(e) => { setText(e.target.value); if (error) setError(''); }}
            placeholder="Type your update or question…"
            className="min-h-[80px]"
            aria-invalid={!!error}
            aria-describedby={error ? 'portal-update-error' : undefined}
          />
          {error && <p id="portal-update-error" className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={send.isPending} className="gap-1.5">
              {send.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {send.isPending ? 'Sending…' : 'Send update'}
            </Button>
          </div>
        </form>

        <div className="flex-1 overflow-y-auto space-y-3 mt-2 pr-1">
          {topLevel.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No updates yet.</p>
          ) : topLevel.map((u) => (
            <div key={u.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground mb-1.5">
                <span className="font-semibold text-foreground">{u.update_type || 'Update'}</span>
                <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{u.created_by || 'RCM Automotive'}</span>
                {u.created_date && (
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(u.created_date), 'dd/MM/yyyy HH:mm')}</span>
                )}
              </div>
              {u.description && <p className="text-sm whitespace-pre-wrap">{u.description}</p>}
              {u.next_steps && <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap"><span className="font-semibold">Next steps:</span> {u.next_steps}</p>}
              {repliesTo(u.id).map((r) => (
                <div key={r.id} className="mt-2 ml-4 border-l-2 border-border pl-3">
                  <p className="text-[11px] text-muted-foreground mb-0.5">
                    {r.created_by || 'RCM Automotive'}{r.created_date ? ` · ${format(new Date(r.created_date), 'dd/MM/yyyy HH:mm')}` : ''}
                  </p>
                  {r.description && <p className="text-sm whitespace-pre-wrap">{r.description}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
