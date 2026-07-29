import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Clock, User, Calendar, Plus, Heart, Reply, AtSign, Pencil, Trash2, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import ClaimUpdateForm from '../claims/ClaimUpdateForm';
import OnSiteMarker from '../claims/OnSiteMarker';

const UPDATE_TYPES = [
  "Status Change", "Client Communication", "Bodyshop Communication", "Insurer Communication",
  "Referrer Response", "Action Taken", "Awaiting Information", "Documentation Received",
  "Parts Update", "Repair Progress", "Quality Check", "Other"
];

const UPDATE_TYPE_COLORS = {
  "Status Change": "bg-purple-500", "Client Communication": "bg-blue-500",
  "Bodyshop Communication": "bg-green-500", "Insurer Communication": "bg-orange-500",
  "Referrer Response": "bg-amber-500", "Action Taken": "bg-indigo-500",
  "Awaiting Information": "bg-yellow-500", "Documentation Received": "bg-teal-500",
  "Parts Update": "bg-pink-500", "Repair Progress": "bg-cyan-500",
  "Quality Check": "bg-emerald-500", "Other": "bg-gray-500"
};

export default function ClaimUpdatesModal({ claimId, currentStatus, isOpen, onClose, onUpdateCreated }) {
  const [showForm, setShowForm] = useState(false);
  const [replyToId, setReplyToId] = useState(null);
  const [newUpdate, setNewUpdate] = useState({
    update_type: 'Other', description: '', next_steps: '', due_date_for_next_action: '',
    new_status: currentStatus || '', new_secondary_status: ''
  });
  const [sendEmail, setSendEmail] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [submitError, setSubmitError] = useState('');
  const [taggedUsers, setTaggedUsers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(null);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [editingUpdateId, setEditingUpdateId] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [editDescriptionDirty, setEditDescriptionDirty] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [showFollowUp, setShowFollowUp] = useState(false);

  const hasUnsavedChanges = formDirty || (editingUpdateId !== null && editDescriptionDirty);

  const handleOpenChange = (open) => {
    if (!open && hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close and lose your progress?')) {
        return;
      }
    }
    if (!open) {
      setFormDirty(false);
      setEditDescriptionDirty(false);
    }
    onClose(open);
  };

  const queryClient = useQueryClient();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: allUsers = [] } = useQuery({ queryKey: ['allUsers'], queryFn: () => base44.entities.User.list(), staleTime: 5 * 60 * 1000 });
  
  const isReferrer = currentUser?.user_type === 'referrer' || currentUser?.user_type === 'client' || (currentUser?.linked_referrer_id && !currentUser?.user_type?.includes('internal'));
  const canChangeStatus = !isReferrer;

  const { data: customStatuses = [], isLoading: isLoadingStatuses } = useQuery({
    queryKey: ['ClaimStatusConfig'], queryFn: () => base44.entities.ClaimStatusConfig.list('sort_order'), staleTime: 5 * 60 * 1000
  });

  const { data: claim } = useQuery({
    queryKey: ['claim', claimId], queryFn: () => base44.entities.Claim.get(claimId), enabled: isOpen && !!claimId, staleTime: 30000
  });

  const activeStatuses = useMemo(() => customStatuses.filter(s => s.is_active).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map(s => s.status_name), [customStatuses]);

  const { data: updates = [], isLoading } = useQuery({
    queryKey: ['claimUpdates', claimId], queryFn: () => base44.entities.ClaimUpdate.filter({ claim_id: claimId }, '-created_date', 500), enabled: isOpen && !!claimId, staleTime: 0
  });

  const createUpdateMutation = useMutation({
    mutationFn: async (updateData) => {
      if (updateData.update_type === 'Status Change' && updateData.description?.trim()) {
        await base44.entities.Claim.update(claimId, { job_status: updateData.new_status, secondary_status: updateData.new_secondary_status || null });
        return await base44.entities.ClaimUpdate.create({ update_type: 'Other', description: updateData.description, next_steps: updateData.next_steps, due_date_for_next_action: updateData.due_date_for_next_action, claim_id: claimId, parent_update_id: updateData.parent_update_id, tagged_user_ids: updateData.tagged_user_ids, ...(currentUser?.company_id && { company_id: currentUser.company_id }) });
      }
      return await base44.entities.ClaimUpdate.create({ ...updateData, claim_id: claimId, ...(currentUser?.company_id && { company_id: currentUser.company_id }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claimUpdates', claimId] });
      if (onUpdateCreated) onUpdateCreated(newUpdate.new_status || null, newUpdate.new_secondary_status || null, claim?.tertiary_status || null, newUpdate.update_type);
      resetForm();
    },
    onError: (error) => setSubmitError(error?.message || 'Failed to create update'),
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ updateId, isLiked }) => {
      const update = updates.find(u => u.id === updateId);
      const newLikedBy = isLiked ? update.liked_by.filter(id => id !== currentUser.id) : [...(update.liked_by || []), currentUser.id];
      return await base44.entities.ClaimUpdate.update(updateId, { liked_by: newLikedBy });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['claimUpdates', claimId] }),
  });

  const toggleStarMutation = useMutation({
    mutationFn: async ({ updateId, isStarred }) => {
      return await base44.entities.ClaimUpdate.update(updateId, { starred: !isStarred });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['claimUpdates', claimId] }),
  });

  const updateUpdateMutation = useMutation({
    mutationFn: async ({ updateId, description, next_steps, due_date_for_next_action }) => {
      return await base44.entities.ClaimUpdate.update(updateId, { description, next_steps, due_date_for_next_action });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claimUpdates', claimId] });
      setEditingUpdateId(null);
      setEditDescription('');
      setEditDescriptionDirty(false);
    },
    onError: (error) => setSubmitError(error?.message || 'Failed to update'),
  });

  const deleteUpdateMutation = useMutation({
    mutationFn: async (updateId) => {
      return await base44.entities.ClaimUpdate.delete(updateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claimUpdates', claimId] });
    },
    onError: (error) => setSubmitError(error?.message || 'Failed to delete'),
  });

  const handleEdit = (update) => {
    setEditingUpdateId(update.id);
    setEditDescription(update.description);
    setEditDescriptionDirty(false);
  };

  const handleSaveEdit = async (updateId) => {
    const update = updates.find(u => u.id === updateId);
    updateUpdateMutation.mutate({ 
      updateId, 
      description: editDescription, 
      next_steps: update.next_steps, 
      due_date_for_next_action: update.due_date_for_next_action 
    });
  };

  const handleDelete = async (updateId) => {
    if (confirm('Are you sure you want to delete this update?')) {
      deleteUpdateMutation.mutate(updateId);
    }
  };

  const canEditDelete = (update) => {
    return currentUser?.id === update.created_by_id || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.user_type === 'internal';
  };

  const getDisplayName = (user) => user?.display_name || user?.full_name || user?.email || 'Unknown';

  const resetForm = () => {
    setNewUpdate({ update_type: 'Other', description: '', next_steps: '', due_date_for_next_action: '', new_status: currentStatus || '', new_secondary_status: '' });
    setSendEmail(false); setSelectedEmails([]); setShowForm(false); setReplyToId(null); setTaggedUsers([]); setSubmitError(''); setShowFollowUp(false); setFormDirty(false);
  };

  const handleReply = (parentId) => {
    setReplyToId(parentId);
    setNewUpdate(prev => ({ ...prev, update_type: 'Other', parent_update_id: parentId }));
    setShowForm(true);
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

    let finalDescription = newUpdate.description;
    if (sendEmail && selectedEmails.length > 0) {
      const availableEmails = [claim.client_email, claim.referrer_email, claim.bodyshop_email].filter(Boolean);
      const mailtoLink = `mailto:${selectedEmails.join(',')}?subject=${encodeURIComponent(`Claim Update: ${claim?.reg}`)}&body=${encodeURIComponent(finalDescription)}`;
      window.open(mailtoLink, '_blank');
      finalDescription = `${finalDescription}\n\n[Emailed to: ${selectedEmails.join(', ')}]`;
    }

    const { new_status, new_secondary_status, ...updateDataToSave } = newUpdate;
    createUpdateMutation.mutate({ ...updateDataToSave, description: finalDescription, tagged_user_ids: taggedUsers, new_status, new_secondary_status });
  };

  const getAvailableEmails = () => {
    if (!claim) return [];
    const emails = [];
    if (claim.client_email) emails.push({ label: `Client: ${claim.client_name}`, email: claim.client_email });
    if (claim.referrer_email) emails.push({ label: `Referrer: ${claim.referrer}`, email: claim.referrer_email });
    if (claim.bodyshop_email) emails.push({ label: `Bodyshop: ${claim.bodyshop}`, email: claim.bodyshop_email });
    return emails;
  };

  if (!claimId) return null;

  const groupedUpdates = updates.reduce((acc, update) => {
    if (update.parent_update_id) {
      if (!acc[update.parent_update_id]) acc[update.parent_update_id] = [];
      acc[update.parent_update_id].push(update);
    } else {
      acc[update.id] = acc[update.id] || [];
    }
    return acc;
  }, {});

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" />Official Updates - Activity Log</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">Client Communication updates reset the 48-hour tracking timer. All updates create an audit trail.</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pr-2">
          {claim && canChangeStatus && <OnSiteMarker claim={claim} />}

          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />Add New Update
            </Button>
          ) : (
            <ClaimUpdateForm
              claimId={claimId}
              claim={claim}
              currentStatus={currentStatus}
              replyToId={replyToId}
              onDirtyChange={setFormDirty}
              onUpdateCreated={(newStatus, newSecondaryStatus, updateType) => {
                if (onUpdateCreated) onUpdateCreated(newStatus, newSecondaryStatus, updateType);
                resetForm();
              }}
              onCancel={() => { setReplyToId(null); setShowForm(false); }}
            />
          )}

          <div>
            <h3 className="font-semibold mb-3 text-sm text-foreground">Update History</h3>
            {isLoading ? <div className="bg-muted/30 border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">Loading updates...</div> : updates.length === 0 ? <div className="bg-muted/30 border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">No updates yet.</div> : (
              <div className="space-y-2">
                {updates.filter(u => !u.parent_update_id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(update => {
                  const isStatusChange = update.update_type === 'Status Change';
                  const isNote = !isStatusChange && update.description?.trim();
                  const isLiked = update.liked_by?.includes(currentUser?.id);
                  const likeCount = update.liked_by?.length || 0;
                  const replies = updates.filter(u => u.parent_update_id === update.id).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

                  return (
                    <div key={update.id} className={`border rounded-lg p-3 ${update.starred ? 'ring-2 ring-amber-400 border-amber-400' : ''} ${isStatusChange ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700' : isNote ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'bg-card border-border'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${UPDATE_TYPE_COLORS[update.update_type] || 'bg-gray-500'} rounded-full`}>{update.update_type}</Badge>
                          {update.starred && <span className="inline-flex items-center gap-1 text-amber-500 text-[10px] font-semibold"><Star className="w-3 h-3 fill-amber-400" />Flagged</span>}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(update.created_date), 'dd/MM/yyyy HH:mm')}</span>
                          {update.tagged_user_ids?.length > 0 && <span className="text-[10px] text-primary flex items-center gap-1"><AtSign className="w-3 h-3" />{update.tagged_user_ids.length} tagged</span>}
                        </div>
                      </div>
                      {editingUpdateId === update.id ? (
                        <div className="space-y-2 mb-2">
                          <Textarea value={editDescription} onChange={(e) => { setEditDescription(e.target.value); setEditDescriptionDirty(true); }} className="px-3 py-2 text-sm bg-background border border-border h-24" />
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => { setEditingUpdateId(null); setEditDescription(''); setEditDescriptionDirty(false); }} className="text-xs">Cancel</Button>
                            <Button type="button" size="sm" onClick={() => handleSaveEdit(update.id)} disabled={updateUpdateMutation.isPending || !editDescription.trim()} className="text-xs">{updateUpdateMutation.isPending ? 'Saving...' : 'Save'}</Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {update.description && <div className="text-sm mb-2"><p className="text-foreground whitespace-pre-wrap">{update.description}</p></div>}
                          {update.next_steps && <div className="text-sm mb-2 mt-2 bg-muted/50 rounded p-2"><p className="font-medium mb-1 text-foreground text-xs uppercase tracking-wide">Next Steps:</p><p className="text-muted-foreground whitespace-pre-wrap">{update.next_steps}</p></div>}
                          {update.due_date_for_next_action && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><Clock className="w-3 h-3" />Due: {format(new Date(update.due_date_for_next_action), 'dd/MM/yyyy')}</div>}
                        </>
                      )}
                      <div className="flex items-center justify-between flex-wrap gap-y-2 mt-2 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground min-w-0"><User className="w-3 h-3 flex-shrink-0" /><span className="truncate">{update.created_by}</span></div>
                        <div className="flex items-center gap-1">
                          {canEditDelete(update) && (
                            <>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(update)} className="h-7 px-2 text-xs text-muted-foreground"><Pencil className="w-3.5 h-3.5" /></Button>
                              <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(update.id)} className="h-7 px-2 text-xs text-muted-foreground"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </>
                          )}
                          <Button type="button" variant="ghost" size="sm" onClick={() => toggleStarMutation.mutate({ updateId: update.id, isStarred: update.starred })} className={`h-7 px-2 text-xs ${update.starred ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground'}`} title={update.starred ? 'Remove flag' : 'Flag as important'}><Star className={`w-3.5 h-3.5 sm:mr-1 ${update.starred ? 'fill-amber-400' : ''}`} /><span className="hidden sm:inline">{update.starred ? 'Flagged' : 'Flag'}</span></Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => toggleLikeMutation.mutate({ updateId: update.id, isLiked })} className={`h-7 px-2 text-xs ${isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'}`}><Heart className={`w-3.5 h-3.5 mr-1 ${isLiked ? 'fill-current' : ''}`} />{likeCount > 0 && likeCount}</Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleReply(update.id)} className="h-7 px-2 text-xs text-muted-foreground"><Reply className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">Reply</span></Button>
                        </div>
                      </div>
                      {replies.length > 0 && <div className="ml-6 mt-3 space-y-2 border-l-2 border-border pl-4">{replies.map(reply => { const replyIsLiked = reply.liked_by?.includes(currentUser?.id); const replyLikeCount = reply.liked_by?.length || 0; const replyEditing = editingUpdateId === reply.id; return (<div key={reply.id} className="bg-muted/30 border border-border rounded-lg p-3">{replyEditing ? (<div className="space-y-2"><Textarea value={editDescription} onChange={(e) => { setEditDescription(e.target.value); setEditDescriptionDirty(true); }} className="px-3 py-2 text-sm bg-background border border-border h-20" /><div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => { setEditingUpdateId(null); setEditDescription(''); setEditDescriptionDirty(false); }} className="text-xs">Cancel</Button><Button type="button" size="sm" onClick={() => handleSaveEdit(reply.id)} disabled={updateUpdateMutation.isPending || !editDescription.trim()} className="text-xs">{updateUpdateMutation.isPending ? 'Saving...' : 'Save'}</Button></div></div>) : (<><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />{reply.created_by}</span><span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(reply.created_date), 'dd/MM/yyyy HH:mm')}</span></div><div className="flex items-center gap-1">{canEditDelete(reply) && (<><Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(reply)} className="h-5 px-1 text-xs text-muted-foreground"><Pencil className="w-3 h-3" /></Button><Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(reply.id)} className="h-5 px-1 text-xs text-muted-foreground"><Trash2 className="w-3 h-3" /></Button></>)}<Button type="button" variant="ghost" size="sm" onClick={() => toggleLikeMutation.mutate({ updateId: reply.id, isLiked: replyIsLiked })} className={`h-5 px-1 text-xs ${replyIsLiked ? 'text-red-500' : 'text-muted-foreground'}`}><Heart className={`w-3 h-3 ${replyIsLiked ? 'fill-current' : ''}`} />{replyLikeCount > 0 && replyLikeCount}</Button></div></div>{reply.description && <p className="text-sm text-foreground whitespace-pre-wrap">{reply.description}</p>}</>)}</div>); })}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}