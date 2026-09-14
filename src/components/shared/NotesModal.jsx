import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Clock, User, Calendar, Plus, Heart, Reply, AtSign, Pencil, Trash2, Star, ChevronUp, ChevronDown, Copy, Check, File as FileIcon, Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import InternalUpdateForm from '@/components/shared/InternalUpdateForm';
import UpdateDirectionBadges from '../claims/UpdateDirectionBadges';
import FileViewer from '@/components/shared/FileViewer';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

const isImageUrl = (url) => /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(url);

const UPDATE_TYPE_COLORS = {
  "Client Communication": "bg-blue-500", "Bodyshop Communication": "bg-green-500",
  "Insurer Communication": "bg-orange-500", "Referrer Response": "bg-amber-500",
  "Action Taken": "bg-indigo-500", "Awaiting Information": "bg-yellow-500",
  "Documentation Received": "bg-teal-500", "Parts Update": "bg-pink-500",
  "Repair Progress": "bg-cyan-500", "Quality Check": "bg-emerald-500",
  "Other": "bg-gray-500"
};

const Highlight = ({ text, query }) => {
  if (!text) return text;
  const q = (query || '').trim();
  if (!q) return text;
  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = String(text).split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/50 rounded px-0.5">{part}</mark>
        : <React.Fragment key={i}>{part}</React.Fragment>
    );
  } catch {
    return text;
  }
};

export default function NotesModal({ parentId, parentType, isOpen, onClose }) {
  const [showForm, setShowForm] = useState(false);
  const [replyToId, setReplyToId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editDirty, setEditDirty] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [activeTab, setActiveTab] = useState('updates');
  const replyFormRef = useRef(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me(), staleTime: 5 * 60 * 1000 });
  const { data: allUsers = [] } = useQuery({ queryKey: ['allUsers'], queryFn: () => base44.entities.User.list(), staleTime: 5 * 60 * 1000 });

  const getDisplayName = (emailOrName) => {
    if (!emailOrName) return 'Unknown';
    const user = allUsers.find((u) => u.email === emailOrName);
    return user?.display_name || user?.full_name || emailOrName;
  };

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', parentId, parentType],
    queryFn: async () => {
      const all = await base44.entities.Note.list('-created_date', 1000);
      return all.filter((n) => n.parent_id === parentId && n.parent_type === parentType);
    },
    enabled: isOpen && !!parentId && !!parentType,
    staleTime: 0,
  });

  useEffect(() => {
    if (replyToId && replyFormRef.current) {
      replyFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [replyToId]);

  const hasUnsavedChanges = formDirty || (editingNoteId !== null && editDirty);

  const handleOpenChange = (open) => {
    if (!open && viewingFile) { setViewingFile(null); return; }
    if (!open && hasUnsavedChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close and lose your progress?')) return;
    }
    if (!open) { setFormDirty(false); setEditDirty(false); }
    onClose();
  };

  // ── Mutations ──
  const toggleLikeMutation = useMutation({
    mutationFn: async ({ noteId, isLiked }) => {
      const note = notes.find((n) => n.id === noteId);
      const newLikedBy = isLiked
        ? (note.liked_by || []).filter((id) => id !== currentUser.id)
        : [...(note.liked_by || []), currentUser.id];
      return await base44.entities.Note.update(noteId, { liked_by: newLikedBy });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] }),
  });

  const toggleStarMutation = useMutation({
    mutationFn: async ({ noteId, isStarred }) => await base44.entities.Note.update(noteId, { starred: !isStarred }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] }),
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content }) => await base44.entities.Note.update(noteId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] });
      setEditingNoteId(null); setEditContent(''); setEditDirty(false);
    },
    onError: (error) => toast({ title: 'Failed to update', description: error?.message || 'Please try again.', variant: 'destructive' }),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId) => await base44.entities.Note.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] });
      toast({ title: 'Internal update deleted' });
    },
    onError: (error) => toast({ title: 'Failed to delete', description: error?.message || 'Please try again.', variant: 'destructive' }),
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ noteId, fileUrl }) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      const updatedUrls = (note.file_urls || []).filter((u) => u !== fileUrl);
      return await base44.entities.Note.update(noteId, { file_urls: updatedUrls });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] }),
  });

  // ── Search with match navigation ──
  const q = searchQuery.trim();
  const matchInNote = (n) => [n.content, n.next_steps, n.update_type, n.created_by].some((f) => f && f.toLowerCase().includes(q.toLowerCase()));
  const matchIds = useMemo(() => {
    if (!q) return [];
    return notes
      .filter((n) => !n.parent_note_id && (matchInNote(n) || notes.some((r) => r.parent_note_id === n.id && matchInNote(r))))
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
      .map((n) => n.id);
  }, [q, notes]);
  const [matchIdx, setMatchIdx] = useState(0);
  const matchRefs = useRef({});
  const currentMatchId = matchIds[matchIdx];
  useEffect(() => { setMatchIdx(0); }, [q]);
  useEffect(() => {
    if (currentMatchId && matchRefs.current[currentMatchId]) {
      requestAnimationFrame(() => matchRefs.current[currentMatchId].scrollIntoView({ behavior: 'smooth', block: 'center' }));
    }
  }, [currentMatchId]);
  const goNext = () => setMatchIdx((i) => (i + 1) % matchIds.length);
  const goPrev = () => setMatchIdx((i) => (i - 1 + matchIds.length) % matchIds.length);

  // ── Handlers ──
  const canEditDelete = (note) => currentUser?.id === note.created_by_id || currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.user_type === 'internal';

  const handleCopy = async (note) => {
    const parts = [note.content, note.next_steps && `Next steps: ${note.next_steps}`].filter(Boolean);
    try {
      await navigator.clipboard.writeText(parts.join('\n\n'));
      setCopiedId(note.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (e) { /* clipboard unavailable */ }
  };

  const handleEdit = (note) => { setEditingNoteId(note.id); setEditContent(note.content); setEditDirty(false); };
  const handleSaveEdit = (noteId) => updateNoteMutation.mutate({ noteId, content: editContent });
  const handleDelete = (noteId) => { if (confirm('Are you sure you want to delete this internal update?')) deleteNoteMutation.mutate(noteId); };
  const handleReply = (noteId) => { setReplyToId(noteId); setShowForm(true); };

  const resetForm = () => { setShowForm(false); setReplyToId(null); setFormDirty(false); };

  const getFileName = (url) => {
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      return parts[parts.length - 1].split('?')[0];
    } catch { return 'Attached file'; }
  };

  const mainNotes = notes.filter((n) => !n.parent_note_id).sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const getReplies = (noteId) => notes.filter((n) => n.parent_note_id === noteId).sort((a, b) => new Date(a.created_date) - new Date(b.created_date));

  const allFiles = useMemo(() => {
    const list = [];
    notes.forEach((n) => {
      (n.file_urls || []).forEach((url) => {
        list.push({ url, note: n, noteId: n.id, fileName: getFileName(url), date: n.created_date, author: getDisplayName(n.created_by), isImage: isImageUrl(url) });
      });
    });
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [notes, allUsers]);

  if (!parentId) return null;

  const renderFileChips = (note, editable) => (
    note.file_urls && note.file_urls.length > 0 ? (
      <div className="mt-2 flex flex-wrap gap-2">
        {note.file_urls.map((url) => (
          <div key={url} className="inline-flex items-center gap-1.5 bg-muted border border-border rounded-lg px-2 py-1 text-xs">
            <FileIcon className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="max-w-[180px] truncate">{getFileName(url)}</span>
            <button type="button" onClick={() => setViewingFile(url)} className="p-0.5 hover:text-foreground" title="View"><Eye className="w-3 h-3" /></button>
            <a href={url} target="_blank" rel="noopener noreferrer" className="p-0.5 hover:text-foreground" title="Download"><Download className="w-3 h-3" /></a>
            {editable && canEditDelete(note) && (
              <button type="button" onClick={() => deleteFileMutation.mutate({ noteId: note.id, fileUrl: url })} className="p-0.5 hover:text-destructive" title="Remove file"><X className="w-3 h-3" /></button>
            )}
          </div>
        ))}
      </div>
    ) : null
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          onEscapeKeyDown={(e) => { if (viewingFile) { e.preventDefault(); setViewingFile(null); } }}
          onPointerDownOutside={(e) => { if (viewingFile) { e.preventDefault(); setViewingFile(null); } }}
          className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-primary" />Internal Updates</DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">Internal team communication only — does NOT affect 48-hour tracking or claim status.</p>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
            <TabsList className="grid w-full grid-cols-2 mb-3 flex-shrink-0">
              <TabsTrigger value="updates" className="text-sm gap-1.5">Updates {mainNotes.length > 0 && <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{mainNotes.length}</span>}</TabsTrigger>
              <TabsTrigger value="files" className="text-sm gap-1.5">Files {allFiles.length > 0 && <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">{allFiles.length}</span>}</TabsTrigger>
            </TabsList>

          <TabsContent value="updates" className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pr-2 mt-0 min-h-0">
            {!showForm ? (
              <Button onClick={() => setShowForm(true)} className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" />Add New Internal Update
              </Button>
            ) : !replyToId ? (
              <InternalUpdateForm
                parentId={parentId}
                parentType={parentType}
                replyToId={null}
                onDirtyChange={setFormDirty}
                onUpdateCreated={resetForm}
                onCancel={resetForm}
              />
            ) : null}

            <div>
              <div className="sticky top-0 z-20 flex items-center justify-between gap-2 mb-3 flex-wrap bg-background/95 backdrop-blur-sm py-1 -mx-1 px-1 rounded">
                <h3 className="font-semibold text-sm text-foreground">Update History</h3>
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Find in updates..."
                    className={`w-full h-8 pl-3 ${searchQuery ? 'pr-24' : 'pr-3'} text-xs rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring`}
                  />
                  {searchQuery && (
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <span className="text-[10px] text-muted-foreground tabular-nums">{matchIds.length > 0 ? `${matchIdx + 1}/${matchIds.length}` : '0/0'}</span>
                      <button type="button" onClick={goPrev} disabled={matchIds.length === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-40 p-0.5"><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={goNext} disabled={matchIds.length === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-40 p-0.5"><ChevronDown className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground p-0.5"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="bg-muted/30 border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">Loading internal updates...</div>
              ) : mainNotes.length === 0 ? (
                <div className="bg-muted/30 border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">No internal updates yet.</div>
              ) : (
                <div className="space-y-2">
                  {mainNotes.map((note) => {
                    const isLiked = note.liked_by?.includes(currentUser?.id);
                    const likeCount = note.liked_by?.length || 0;
                    const replies = getReplies(note.id);
                    const isNote = !!note.content?.trim();
                    return (
                      <div key={note.id} ref={(el) => { matchRefs.current[note.id] = el; }} className={`border rounded-lg p-3 ${note.starred ? 'ring-2 ring-amber-400 border-amber-400' : ''} ${currentMatchId === note.id ? 'ring-2 ring-blue-400' : ''} ${isNote ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : 'bg-card border-border'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            {note.update_type && <Badge className={`${UPDATE_TYPE_COLORS[note.update_type] || 'bg-gray-500'} rounded-full`}>{note.update_type}</Badge>}
                            {note.contacted_party_name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                <User className="w-3 h-3" />
                                {note.contacted_party_name}
                              </span>
                            )}
                            <UpdateDirectionBadges update={note} />
                            {note.starred && <span className="inline-flex items-center gap-1 text-amber-500 text-[10px] font-semibold"><Star className="w-3 h-3 fill-amber-400" />Flagged</span>}
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(note.created_date), 'dd/MM/yyyy HH:mm')}</span>
                            {note.tagged_users?.length > 0 && <span className="text-[10px] text-primary flex items-center gap-1"><AtSign className="w-3 h-3" />{note.tagged_users.length} tagged</span>}
                          </div>
                        </div>

                        {editingNoteId === note.id ? (
                          <div className="space-y-2 mb-2">
                            <Textarea value={editContent} onChange={(e) => { setEditContent(e.target.value); setEditDirty(true); }} className="px-3 py-2 text-sm bg-background border border-border h-24" />
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="outline" size="sm" onClick={() => { setEditingNoteId(null); setEditContent(''); setEditDirty(false); }} className="text-xs">Cancel</Button>
                              <Button type="button" size="sm" onClick={() => handleSaveEdit(note.id)} disabled={updateNoteMutation.isPending || !editContent.trim()} className="text-xs">{updateNoteMutation.isPending ? 'Saving...' : 'Save'}</Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {note.contacted_party_detail && (
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1.5">
                                <AtSign className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{note.contacted_party_detail}</span>
                              </div>
                            )}
                            {note.content && <div className="text-sm mb-2"><p className="text-foreground whitespace-pre-wrap"><Highlight text={note.content} query={q} /></p></div>}
                            {note.next_steps && <div className="text-sm mb-2 mt-2 bg-muted/50 rounded p-2"><p className="font-medium mb-1 text-foreground text-xs uppercase tracking-wide">Next Steps:</p><p className="text-muted-foreground whitespace-pre-wrap"><Highlight text={note.next_steps} query={q} /></p></div>}
                            {note.due_date_for_next_action && <div className="text-xs text-muted-foreground flex items-center gap-1 mt-2"><Clock className="w-3 h-3" />Due: {format(new Date(note.due_date_for_next_action), 'dd/MM/yyyy')}</div>}
                            {renderFileChips(note, true)}
                          </>
                        )}

                        <div className="flex items-center justify-between flex-wrap gap-y-2 mt-2 pt-2 border-t border-border/50">
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground min-w-0"><User className="w-3 h-3 flex-shrink-0" /><span className="truncate"><Highlight text={getDisplayName(note.created_by)} query={q} /></span></div>
                          <div className="flex items-center gap-1">
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(note)} className="h-7 px-2 text-xs text-muted-foreground" title="Copy contents"><span className="flex items-center gap-1">{copiedId === note.id ? <><Check className="w-3.5 h-3.5 text-green-500" /><span className="hidden sm:inline">Copied</span></> : <><Copy className="w-3.5 h-3.5" /><span className="hidden sm:inline">Copy</span></>}</span></Button>
                            {canEditDelete(note) && (
                              <>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(note)} className="h-7 px-2 text-xs text-muted-foreground"><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(note.id)} className="h-7 px-2 text-xs text-muted-foreground"><Trash2 className="w-3.5 h-3.5" /></Button>
                              </>
                            )}
                            <Button type="button" variant="ghost" size="sm" onClick={() => toggleStarMutation.mutate({ noteId: note.id, isStarred: note.starred })} className={`h-7 px-2 text-xs ${note.starred ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground'}`} title={note.starred ? 'Remove flag' : 'Flag as important'}><Star className={`w-3.5 h-3.5 sm:mr-1 ${note.starred ? 'fill-amber-400' : ''}`} /><span className="hidden sm:inline">{note.starred ? 'Flagged' : 'Flag'}</span></Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => toggleLikeMutation.mutate({ noteId: note.id, isLiked })} className={`h-7 px-2 text-xs ${isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground'}`}><Heart className={`w-3.5 h-3.5 mr-1 ${isLiked ? 'fill-current' : ''}`} />{likeCount > 0 && likeCount}</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleReply(note.id)} className="h-7 px-2 text-xs text-muted-foreground"><Reply className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">Reply</span></Button>
                          </div>
                        </div>

                        {replyToId === note.id && (
                          <div ref={replyFormRef} className="ml-6 mt-3 border-l-2 border-border pl-4">
                            <InternalUpdateForm
                              parentId={parentId}
                              parentType={parentType}
                              replyToId={replyToId}
                              onDirtyChange={setFormDirty}
                              onUpdateCreated={resetForm}
                              onCancel={resetForm}
                            />
                          </div>
                        )}

                        {replies.length > 0 && (
                          <div className="ml-6 mt-3 space-y-2 border-l-2 border-border pl-4">
                            {replies.map((reply) => {
                              const replyIsLiked = reply.liked_by?.includes(currentUser?.id);
                              const replyLikeCount = reply.liked_by?.length || 0;
                              const replyEditing = editingNoteId === reply.id;
                              return (
                                <div key={reply.id} className="bg-muted/30 border border-border rounded-lg p-3">
                                  {replyEditing ? (
                                    <div className="space-y-2">
                                      <Textarea value={editContent} onChange={(e) => { setEditContent(e.target.value); setEditDirty(true); }} className="px-3 py-2 text-sm bg-background border border-border h-20" />
                                      <div className="flex justify-end gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => { setEditingNoteId(null); setEditContent(''); setEditDirty(false); }} className="text-xs">Cancel</Button>
                                        <Button type="button" size="sm" onClick={() => handleSaveEdit(reply.id)} disabled={updateNoteMutation.isPending || !editContent.trim()} className="text-xs">{updateNoteMutation.isPending ? 'Saving...' : 'Save'}</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />{getDisplayName(reply.created_by)}</span>
                                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(reply.created_date), 'dd/MM/yyyy HH:mm')}</span>
                                          {reply.contacted_party_name && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                                              <User className="w-3 h-3" />{reply.contacted_party_name}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(reply)} className="h-5 px-1 text-xs text-muted-foreground" title="Copy">{copiedId === reply.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}</Button>
                                          {canEditDelete(reply) && (
                                            <>
                                              <Button type="button" variant="ghost" size="sm" onClick={() => handleEdit(reply)} className="h-5 px-1 text-xs text-muted-foreground"><Pencil className="w-3 h-3" /></Button>
                                              <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(reply.id)} className="h-5 px-1 text-xs text-muted-foreground"><Trash2 className="w-3 h-3" /></Button>
                                            </>
                                          )}
                                          <Button type="button" variant="ghost" size="sm" onClick={() => toggleLikeMutation.mutate({ noteId: reply.id, isLiked: replyIsLiked })} className={`h-5 px-1 text-xs ${replyIsLiked ? 'text-red-500' : 'text-muted-foreground'}`}><Heart className={`w-3 h-3 ${replyIsLiked ? 'fill-current' : ''}`} />{replyLikeCount > 0 && replyLikeCount}</Button>
                                        </div>
                                      </div>
                                      {reply.contacted_party_detail && (
                                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1.5">
                                          <AtSign className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{reply.contacted_party_detail}</span>
                                        </div>
                                      )}
                                      {reply.content && <p className="text-sm text-foreground whitespace-pre-wrap"><Highlight text={reply.content} query={q} /></p>}
                                      {renderFileChips(reply, true)}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="files" className="flex-1 overflow-y-auto overflow-x-hidden pr-2 mt-0 min-h-0">
            {allFiles.length === 0 ? (
              <div className="bg-muted/30 border border-border rounded-lg p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <FileIcon className="w-8 h-8 opacity-40" />
                No files attached to internal updates yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {allFiles.map((file) => (
                  <div key={file.url} className="group border border-border rounded-lg overflow-hidden bg-card flex flex-col">
                    <button type="button" onClick={() => setViewingFile(file.url)} className="relative w-full aspect-square bg-muted flex items-center justify-center overflow-hidden">
                      {file.isImage ? (
                        <img src={file.url} alt={file.fileName} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <FileIcon className="w-10 h-10 text-muted-foreground" />
                      )}
                    </button>
                    <div className="p-2 flex flex-col gap-1 flex-1 min-w-0">
                      <span className="text-xs font-medium truncate" title={file.fileName}>{file.fileName}</span>
                      <span className="text-[10px] text-muted-foreground truncate">{file.author}</span>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(file.date), 'dd/MM/yy HH:mm')}</span>
                      <div className="flex items-center gap-1 mt-1">
                        <button type="button" onClick={() => setViewingFile(file.url)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="View"><Eye className="w-3.5 h-3.5" /></button>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Download"><Download className="w-3.5 h-3.5" /></a>
                        {canEditDelete(file.note) && (
                          <button type="button" onClick={() => deleteFileMutation.mutate({ noteId: file.noteId, fileUrl: file.url })} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive ml-auto" title="Remove file"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {viewingFile && <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />}
    </>
  );
}