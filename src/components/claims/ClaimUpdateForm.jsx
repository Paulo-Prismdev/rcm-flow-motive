import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X, Clock, Mail, Plus, AtSign, ChevronDown } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import StatusChangeFields from "@/components/shared/StatusChangeFields";
import { buildStatusChangeClaimUpdate, isUpdateTrackingClosed } from "@/components/shared/claimStatusUpdate";

const UPDATE_TYPES = [
  "Status Change", "Client Communication", "Bodyshop Communication", "Insurer Communication",
  "Referrer Response", "Action Taken", "Awaiting Information", "Documentation Received",
  "Parts Update", "Repair Progress", "Quality Check", "Other"
];

export default function ClaimUpdateForm({
  claimId,
  claim,
  currentStatus,
  replyToId = null,
  onUpdateCreated,
  onCancel,
  onDirtyChange,
}) {
  const queryClient = useQueryClient();

  const [newUpdate, setNewUpdate] = useState({
    update_type: 'Other', description: '', next_steps: '', due_date_for_next_action: '',
    new_journey: claim?.journey_status || claim?.job_status || currentStatus || '',
    new_secondary_status: claim?.secondary_status || '',
    new_tertiary_status: claim?.tertiary_status || ''
  });
  const [sendEmail, setSendEmail] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(null);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const isDirty =
    !!newUpdate.description?.trim() ||
    !!newUpdate.next_steps?.trim() ||
    !!newUpdate.due_date_for_next_action ||
    taggedUsers.length > 0 ||
    selectedEmails.length > 0 ||
    sendEmail ||
    (newUpdate.update_type === 'Status Change' &&
      (newUpdate.new_journey !== (claim?.journey_status || claim?.job_status || currentStatus || '') ||
        (newUpdate.new_secondary_status || '') !== (claim?.secondary_status || '') ||
        (newUpdate.new_tertiary_status || '') !== (claim?.tertiary_status || '')));

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: allUsers = [] } = useQuery({ queryKey: ['allUsers'], queryFn: () => base44.entities.User.list(), staleTime: 5 * 60 * 1000 });

  const isReferrer = currentUser?.user_type === 'referrer' || currentUser?.user_type === 'client' || (currentUser?.linked_referrer_id && !currentUser?.user_type?.includes('internal'));
  const canChangeStatus = !isReferrer;

  const getDisplayName = (user) => user?.display_name || user?.full_name || user?.email || 'Unknown';

  const createUpdateMutation = useMutation({
    mutationFn: async (updateData) => {
      let created;
      if (updateData.update_type === 'Status Change') {
        const claimUpdate = buildStatusChangeClaimUpdate(claim, {
          journey: updateData.new_journey, secondary: updateData.new_secondary_status, tertiary: updateData.new_tertiary_status
        }, updateData.update_type);
        if (Object.keys(claimUpdate).length > 0) {
          await base44.entities.Claim.update(claimId, claimUpdate);
        }
        created = await base44.entities.ClaimUpdate.create({
          update_type: 'Status Change', description: updateData.description, next_steps: updateData.next_steps,
          due_date_for_next_action: updateData.due_date_for_next_action, claim_id: claimId,
          parent_update_id: updateData.parent_update_id, tagged_user_ids: updateData.tagged_user_ids,
          ...(currentUser?.company_id && { company_id: currentUser.company_id })
        });
      } else {
        created = await base44.entities.ClaimUpdate.create({ ...updateData, claim_id: claimId, ...(currentUser?.company_id && { company_id: currentUser.company_id }) });
      }
      // Client Communication updates reset the dedicated 48-hour client
      // communication tracker (separate from the general update timer).
      // Always set last_client_comm_at so the tracker is correct even if the
      // claim is later reopened (status changed away from invoiced/cancelled).
      if (updateData.update_type === 'Client Communication') {
        const now = new Date();
        const closed = isUpdateTrackingClosed({ job_status: claim?.journey_status || claim?.job_status, invoice_status: claim?.invoice_status });
        const commUpdate = {
          last_client_comm_at: now.toISOString(),
          next_client_comm_due_at: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
          client_comm_status_flag: closed ? 'Gray' : 'Green',
        };
        await base44.entities.Claim.update(claimId, commUpdate);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claimUpdates', claimId] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      if (onUpdateCreated) onUpdateCreated(newUpdate.new_journey || null, newUpdate.new_secondary_status || null, newUpdate.new_tertiary_status || null, newUpdate.update_type);
      resetForm();
    },
    onError: (error) => setSubmitError(error?.message || 'Failed to create update'),
  });

  const resetForm = () => {
    setNewUpdate({ update_type: 'Other', description: '', next_steps: '', due_date_for_next_action: '', new_journey: claim?.journey_status || claim?.job_status || currentStatus || '', new_secondary_status: claim?.secondary_status || '', new_tertiary_status: claim?.tertiary_status || '' });
    setSendEmail(false); setSelectedEmails([]); setTaggedUsers([]); setSubmitError(''); setShowFollowUp(false);
    if (onCancel) onCancel();
  };

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setNewUpdate({ ...newUpdate, description: value });

    const cursorPosition = e.target.selectionStart;
    const textUpToCursor = value.substring(0, cursorPosition);
    const mentionMatch = textUpToCursor.match(/@([a-zA-Z0-9_]+)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setMentionPosition(cursorPosition);
      setShowMentionPopup(true);
    } else {
      setShowMentionPopup(false);
      setMentionQuery('');
    }
  };

  const insertMention = (user) => {
    const textBeforeMention = newUpdate.description.substring(0, mentionPosition - mentionQuery.length - 1);
    const textAfterMention = newUpdate.description.substring(mentionPosition);
    const newText = `${textBeforeMention}@${getDisplayName(user)} ${textAfterMention}`;
    setNewUpdate({ ...newUpdate, description: newText });
    setTaggedUsers(prev => prev.includes(user.id) ? prev : [...prev, user.id]);
    setShowMentionPopup(false);
    setMentionQuery('');
  };

  const toggleUserTag = (userId) => {
    setTaggedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (isReferrer && newUpdate.update_type === 'Status Change') { setSubmitError('Referrers cannot change status'); return; }
    if (isReferrer && (newUpdate.next_steps || newUpdate.due_date_for_next_action)) { setSubmitError('Referrers cannot set follow-ups'); return; }
    if (newUpdate.update_type !== 'Status Change' && !newUpdate.description.trim()) { setSubmitError('Please enter a description'); return; }

    // Block true completion (cancelled or invoiced) while a starred/flagged
    // update exists. Returning the vehicle / total loss does NOT count as
    // completion here — those still require invoicing, so a status change to
    // "Returned to Customer" should go through without the block.
    if (newUpdate.update_type === 'Status Change' && newUpdate.new_journey &&
        isUpdateTrackingClosed({ job_status: newUpdate.new_journey, invoice_status: claim?.invoice_status })) {
      try {
        const existing = await base44.entities.ClaimUpdate.filter({ claim_id: claimId }, '-created_date', 500);
        if (existing.some(u => u.starred && !u.parent_update_id)) {
          setSubmitError('This claim has a flagged (starred) update that must be resolved before it can be marked as complete. Please remove the star from the flagged update in the Updates history first.');
          return;
        }
      } catch (err) {
        // If the check fails, allow the change to proceed
      }
    }

    let finalDescription = newUpdate.description;
    if (newUpdate.update_type === 'Status Change' && !finalDescription.trim()) {
      const parts = [];
      if (newUpdate.new_journey) parts.push(`Journey → ${newUpdate.new_journey}`);
      if (newUpdate.new_secondary_status) parts.push(`Secondary → ${newUpdate.new_secondary_status}`);
      if (newUpdate.new_tertiary_status) parts.push(`Tertiary → ${newUpdate.new_tertiary_status}`);
      finalDescription = parts.length ? `Status updated: ${parts.join(' · ')}` : 'Status updated';
    }
    if (sendEmail && selectedEmails.length > 0) {
      const mailtoLink = `mailto:${selectedEmails.join(',')}?subject=${encodeURIComponent(`Claim Update: ${claim?.reg}`)}&body=${encodeURIComponent(finalDescription)}`;
      window.open(mailtoLink, '_blank');
      finalDescription = `${finalDescription}\n\n[Emailed to: ${selectedEmails.join(', ')}]`;
    }

    const { new_journey, new_secondary_status, new_tertiary_status, ...updateDataToSave } = newUpdate;
    createUpdateMutation.mutate({ ...updateDataToSave, description: finalDescription, tagged_user_ids: taggedUsers, new_journey, new_secondary_status, new_tertiary_status, ...(replyToId && { parent_update_id: replyToId }) });
  };

  const getAvailableEmails = () => {
    if (!claim) return [];
    const emails = [];
    if (claim.client_email) emails.push({ label: `Client: ${claim.client_name}`, email: claim.client_email });
    if (claim.referrer_email) emails.push({ label: `Referrer: ${claim.referrer}`, email: claim.referrer_email });
    if (claim.bodyshop_email) emails.push({ label: `Bodyshop: ${claim.bodyshop}`, email: claim.bodyshop_email });
    return emails;
  };

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-foreground">{replyToId ? 'Reply to Update' : 'Add New Update'}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={resetForm}><X className="w-4 h-4" /></Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        {!replyToId && (
          <>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Update Type *</label>
              <select value={newUpdate.update_type} onChange={(e) => setNewUpdate({ ...newUpdate, update_type: e.target.value })} className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg" required>
                {isReferrer ? (<><option value="Referrer Response">Referrer Response</option><option value="Other">Other</option></>) : (UPDATE_TYPES.map(type => <option key={type} value={type}>{type}</option>))}
              </select>
            </div>

            {newUpdate.update_type === 'Status Change' && canChangeStatus && (
              <StatusChangeFields
                value={{ journey: newUpdate.new_journey, secondary: newUpdate.new_secondary_status, tertiary: newUpdate.new_tertiary_status }}
                onChange={(v) => setNewUpdate({ ...newUpdate, new_journey: v.journey, new_secondary_status: v.secondary, new_tertiary_status: v.tertiary })}
              />
            )}
          </>
        )}

        <div className="relative">
          <label className="block text-xs text-muted-foreground mb-1">{replyToId ? 'Your reply' : 'What was done?'} *</label>
          <Textarea
            value={newUpdate.description}
            onChange={handleTextareaChange}
            placeholder={replyToId ? "Write your reply... Type @ to mention someone" : "Describe the action taken... (optional for status changes) Type @ to mention someone"}
            className="px-3 py-2 text-sm bg-background border border-border h-24"
            required={newUpdate.update_type !== 'Status Change'}
          />
          {showMentionPopup && (
            <div className="absolute z-50 mt-1 w-56 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              <Command>
                <CommandList>
                  {allUsers.filter(u => (u.display_name || u.full_name || u.email)?.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 8).map(user => (
                    <CommandItem key={user.id} onSelect={() => insertMention(user)} className="flex items-center gap-2 cursor-pointer hover:bg-accent px-2 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">{(getDisplayName(user))[0]?.toUpperCase()}</div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm truncate">{getDisplayName(user)}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                  {allUsers.filter(u => (u.display_name || u.full_name || u.email)?.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No users found</div>
                  )}
                </CommandList>
              </Command>
            </div>
          )}
        </div>

        {!replyToId && !isReferrer && (() => {
          const availableEmails = getAvailableEmails();
          return availableEmails.length > 0 && (
            <div className="bg-muted/30 p-3 space-y-3 border border-border rounded-lg">
              <div className="flex items-center gap-2"><input type="checkbox" id="send_email" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="w-4 h-4" /><label htmlFor="send_email" className="text-sm font-medium flex items-center gap-2"><Mail className="w-4 h-4 text-accent" />Open email to send this update</label></div>
              {sendEmail && (<div className="space-y-2 pl-6"><p className="text-xs text-muted-foreground">Select recipients:</p>{availableEmails.map(({ label, email }) => (<div key={email} className="flex items-center gap-2"><input type="checkbox" id={`email_${email}`} checked={selectedEmails.includes(email)} onChange={() => setSelectedEmails(prev => prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email])} className="w-4 h-4" /><label htmlFor={`email_${email}`} className="text-xs">{label} ({email})</label></div>))}</div>)}
            </div>
          );
        })()}

        {!replyToId && canChangeStatus && (
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFollowUp(prev => !prev)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors bg-muted/20"
            >
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Add Follow-up / Next Steps (Optional)
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFollowUp ? 'rotate-180' : ''}`} />
            </button>
            {showFollowUp && (
              <div className="p-3 space-y-3 border-t border-border">
                <div><label className="block text-xs text-muted-foreground mb-1">Next Steps</label><Textarea value={newUpdate.next_steps} onChange={(e) => setNewUpdate({ ...newUpdate, next_steps: e.target.value })} placeholder="What needs to happen next..." className="px-3 py-2 text-sm bg-background border border-border h-20" /></div>
                <div><label className="block text-xs text-muted-foreground mb-1">Due Date</label><Input type="date" value={newUpdate.due_date_for_next_action} onChange={(e) => setNewUpdate({ ...newUpdate, due_date_for_next_action: e.target.value })} className="px-3 py-2 text-sm bg-background border border-border" /></div>
              </div>
            )}
          </div>
        )}

        {taggedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {taggedUsers.map(userId => {
               const user = allUsers.find(u => u.id === userId);
               return user ? <Badge key={userId} variant="secondary" className="gap-1.5 px-2 py-1"><span className="text-sm">{getDisplayName(user)}</span><span className="text-[10px] text-muted-foreground">({user.email})</span><X className="w-3 h-3 cursor-pointer" onClick={() => toggleUserTag(userId)} /></Badge> : null;
             })}
          </div>
        )}

        {submitError && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{submitError}</div>}

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={resetForm} variant="outline" className="px-4 py-2 text-xs">Cancel</Button>
          <Button type="submit" disabled={createUpdateMutation.isPending || (newUpdate.update_type !== 'Status Change' && !newUpdate.description.trim())} className="px-4 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">{createUpdateMutation.isPending ? 'Adding...' : replyToId ? 'Reply' : 'Add Update'}</Button>
        </div>
      </form>
    </div>
  );
}