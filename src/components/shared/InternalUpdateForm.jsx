import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X, Clock, Plus, AtSign, ChevronDown, Paperclip, File as FileIcon, Download, Eye } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Command, CommandItem, CommandList } from "@/components/ui/command";
import VoiceInput from '@/components/shared/VoiceInput';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useToast } from "@/components/ui/use-toast";
import { createNoteTagNotifications } from '@/components/shared/createNoteTagNotifications';
import UpdateContactSelector from '@/components/claims/UpdateContactSelector';

const UPDATE_TYPES = [
  "Client Communication", "Bodyshop Communication", "Insurer Communication",
  "Referrer Response", "Action Taken", "Awaiting Information", "Documentation Received",
  "Parts Update", "Repair Progress", "Quality Check", "Other"
];

export default function InternalUpdateForm({
  parentId,
  parentType,
  replyToId = null,
  onUpdateCreated,
  onCancel,
  onDirtyChange,
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [newUpdate, setNewUpdate] = useState({
    update_type: 'Other', direction: '', platform: '', description: '',
    next_steps: '', due_date_for_next_action: '',
  });
  const [taggedEmails, setTaggedEmails] = useState([]);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(null);
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);

  const { uploadFiles, uploads, isUploading, retryUpload } = useFileUpload({
    onComplete: (urls) => setAttachedFiles((prev) => [...prev, ...urls]),
  });

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: allUsers = [] } = useQuery({ queryKey: ['allUsers'], queryFn: () => base44.entities.User.list(), staleTime: 5 * 60 * 1000 });

  const isCommType = ['Client Communication', 'Bodyshop Communication', 'Insurer Communication', 'Referrer Response'].includes(newUpdate.update_type);

  const { data: claim } = useQuery({
    queryKey: ['internal-update-claim', parentId, parentType],
    queryFn: async () => {
      if (parentType === 'Claim') return await base44.entities.Claim.get(parentId);
      const entityMap = { Estimate: 'Estimate', Engineering: 'Engineering', Part: 'Part' };
      const entityName = entityMap[parentType];
      if (!entityName) return null;
      try {
        const parent = await base44.entities[entityName].get(parentId);
        if (parent?.linked_claim_id) return await base44.entities.Claim.get(parent.linked_claim_id);
      } catch { return null; }
      return null;
    },
    enabled: isCommType && !!parentId && !!parentType,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const getDisplayName = (user) => user?.display_name || user?.full_name || user?.email || 'Unknown';

  const isDirty =
    !!newUpdate.description?.trim() ||
    !!newUpdate.next_steps?.trim() ||
    !!newUpdate.due_date_for_next_action ||
    !!newUpdate.direction ||
    !!newUpdate.platform ||
    taggedEmails.length > 0 ||
    attachedFiles.length > 0 ||
    selectedContacts.length > 0 ||
    (newUpdate.update_type !== 'Other');

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(isDirty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty]);

  const createNoteMutation = useMutation({
    mutationFn: async (data) => {
      const created = await base44.entities.Note.create({
        content: data.description,
        parent_id: parentId,
        parent_type: parentType,
        parent_note_id: data.parent_note_id || null,
        update_type: data.update_type,
        direction: data.direction || null,
        platform: data.platform || null,
        contacted_party_name: data.contacted_party_name || null,
        contacted_party_detail: data.contacted_party_detail || null,
        next_steps: data.next_steps || null,
        due_date_for_next_action: data.due_date_for_next_action || null,
        tagged_users: data.tagged_users,
        file_urls: data.file_urls,
        liked_by: [],
        starred: false,
      });
      if (data.tagged_users && data.tagged_users.length > 0) {
        await createNoteTagNotifications({
          taggedEmails: data.tagged_users,
          parentType,
          parentId,
          updateType: data.update_type,
          description: data.description,
          createdByName: getDisplayName(currentUser),
          createdByEmail: currentUser?.email,
        });
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] });
      resetForm();
      if (onUpdateCreated) onUpdateCreated();
    },
    onError: (error) => setSubmitError(error?.message || 'Failed to add internal update'),
  });

  const resetForm = () => {
    setNewUpdate({ update_type: 'Other', direction: '', platform: '', description: '', next_steps: '', due_date_for_next_action: '' });
    setTaggedEmails([]); setAttachedFiles([]); setSubmitError(''); setShowFollowUp(false); setSelectedContacts([]);
    if (onCancel) onCancel();
  };

  const handleTextareaChange = (e) => {
    const value = e.target.value;
    setNewUpdate({ ...newUpdate, description: value });
    const cursorPosition = e.target.selectionStart;
    const textUpToCursor = value.substring(0, cursorPosition);
    const mentionMatch = textUpToCursor.match(/@([a-zA-Z0-9_ ]+)$/);
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
    setTaggedEmails((prev) => (prev.includes(user.email) ? prev : [...prev, user.email]));
    setShowMentionPopup(false);
    setMentionQuery('');
  };

  const toggleUserTag = (email) => {
    setTaggedEmails((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) uploadFiles(files);
    e.target.value = '';
  };

  const removeAttachedFile = (url) => setAttachedFiles((prev) => prev.filter((u) => u !== url));

  const getFileName = (url) => {
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      return parts[parts.length - 1].split('?')[0];
    } catch {
      return 'Attached file';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!newUpdate.description.trim() && attachedFiles.length === 0) {
      setSubmitError('Please enter a description or attach a file');
      return;
    }
    createNoteMutation.mutate({
      ...newUpdate,
      parent_note_id: replyToId || null,
      tagged_users: taggedEmails,
      file_urls: attachedFiles,
      contacted_party_name: [...new Set(selectedContacts.map((c) => c.orgName).filter(Boolean))].join(', '),
      contacted_party_detail: selectedContacts.map((c) => c.detail).join(', '),
    });
  };

  const filteredMentionUsers = allUsers
    .filter((u) => (u.display_name || u.full_name || u.email || '')?.toLowerCase().includes(mentionQuery.toLowerCase()))
    .slice(0, 8);

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm text-foreground">{replyToId ? 'Reply to Internal Update' : 'Add New Internal Update'}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={resetForm}><X className="w-4 h-4" /></Button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        {!replyToId && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Update Type</label>
            <select
              value={newUpdate.update_type}
              onChange={(e) => { setNewUpdate({ ...newUpdate, update_type: e.target.value, direction: '', platform: '' }); setSelectedContacts([]); }}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
            >
              {UPDATE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Direction</label>
          <select
            value={newUpdate.direction}
            onChange={(e) => setNewUpdate({ ...newUpdate, direction: e.target.value, platform: '' })}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
          >
            <option value="">Select direction...</option>
            <option value="Incoming">Incoming</option>
            <option value="Outgoing">Outgoing</option>
          </select>
        </div>

        {newUpdate.direction && (
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Platform</label>
            <select
              value={newUpdate.platform}
              onChange={(e) => { setNewUpdate({ ...newUpdate, platform: e.target.value }); setSelectedContacts([]); }}
              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg"
            >
              <option value="">Select platform...</option>
              <option value="Phone">Phone</option>
              <option value="E-Mail">E-Mail</option>
              <option value="Whatsapp">Whatsapp</option>
              <option value="Text Message">Text Message</option>
            </select>
          </div>
        )}

        <UpdateContactSelector
          claim={claim}
          updateType={newUpdate.update_type}
          platform={newUpdate.platform}
          value={selectedContacts.map((c) => c.id)}
          onChange={setSelectedContacts}
        />

        <div className="relative">
          <label className="block text-xs text-muted-foreground mb-1">{replyToId ? 'Your reply' : 'What was done?'} <span className="text-destructive">*</span></label>
          <Textarea
            value={newUpdate.description}
            onChange={handleTextareaChange}
            placeholder={replyToId ? "Write your reply... Type @ to mention someone" : "Describe the action taken... Type @ to mention someone"}
            className="px-3 py-2 text-sm bg-background border border-border h-24"
          />
          {showMentionPopup && filteredMentionUsers.length > 0 && (
            <div className="absolute z-50 mt-1 w-56 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
              <Command>
                <CommandList>
                  {filteredMentionUsers.map((user) => (
                    <CommandItem key={user.id} onSelect={() => insertMention(user)} className="flex items-center gap-2 cursor-pointer hover:bg-accent px-2 py-1.5">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">{(getDisplayName(user))[0]?.toUpperCase()}</div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm truncate">{getDisplayName(user)}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandList>
              </Command>
            </div>
          )}
        </div>

        {/* File upload — the differentiator vs Official Updates */}
        <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5"><Paperclip className="w-3.5 h-3.5" />Attach files</span>
            <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Paperclip className="w-3.5 h-3.5 mr-1" />{isUploading ? 'Uploading...' : 'Add File'}
            </Button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
          </div>
          {uploads.filter((u) => u.status === 'uploading' || u.status === 'failed').map((u) => (
            <div key={u.id} className="flex items-center gap-2 text-xs">
              <FileIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{u.name}</span>
              {u.status === 'uploading' && (
                <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${u.progress}%` }} />
                </div>
              )}
              {u.status === 'failed' && (
                <Button type="button" variant="ghost" size="sm" className="h-5 px-1 text-xs text-destructive" onClick={() => retryUpload(u.id)}>Retry</Button>
              )}
            </div>
          ))}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((url) => (
                <span key={url} className="inline-flex items-center gap-1.5 bg-muted border border-border rounded-lg px-2 py-1 text-xs">
                  <FileIcon className="w-3 h-3 text-muted-foreground" />
                  <span className="max-w-[160px] truncate">{getFileName(url)}</span>
                  <X className="w-3 h-3 cursor-pointer text-muted-foreground hover:text-destructive" onClick={() => removeAttachedFile(url)} />
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <VoiceInput value={newUpdate.description} onChange={(v) => setNewUpdate({ ...newUpdate, description: v })} disabled={createNoteMutation.isPending} />
          <span className="text-xs text-muted-foreground">Dictate or type @ to mention</span>
        </div>

        {!replyToId && (
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowFollowUp((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors bg-muted/20"
            >
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" />Add Follow-up / Next Steps (Optional)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFollowUp ? 'rotate-180' : ''}`} />
            </button>
            {showFollowUp && (
              <div className="p-3 space-y-3 border-t border-border">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Next Steps</label>
                  <Textarea value={newUpdate.next_steps} onChange={(e) => setNewUpdate({ ...newUpdate, next_steps: e.target.value })} placeholder="What needs to happen next..." className="px-3 py-2 text-sm bg-background border border-border h-20" />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Due Date</label>
                  <Input type="date" value={newUpdate.due_date_for_next_action} onChange={(e) => setNewUpdate({ ...newUpdate, due_date_for_next_action: e.target.value })} className="px-3 py-2 text-sm bg-background border border-border" />
                </div>
              </div>
            )}
          </div>
        )}

        {taggedEmails.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {taggedEmails.map((email) => {
              const user = allUsers.find((u) => u.email === email);
              return (
                <Badge key={email} variant="secondary" className="gap-1.5 px-2 py-1">
                  <span className="text-sm">{getDisplayName(user)}</span>
                  <span className="text-[10px] text-muted-foreground">({email})</span>
                  <X className="w-3 h-3 cursor-pointer" onClick={() => toggleUserTag(email)} />
                </Badge>
              );
            })}
          </div>
        )}

        {submitError && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{submitError}</div>}

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={resetForm} variant="outline" className="px-4 py-2 text-xs">Cancel</Button>
          <Button type="submit" disabled={createNoteMutation.isPending || (!newUpdate.description.trim() && attachedFiles.length === 0)} className="px-4 py-2 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
            {createNoteMutation.isPending ? 'Adding...' : replyToId ? 'Reply' : 'Add Update'}
          </Button>
        </div>
      </form>
    </div>
  );
}