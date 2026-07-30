import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Reply, Smile, Eye, EyeOff, MessageSquare, Paperclip, Download, File as FileIcon } from "lucide-react";
import VoiceInput from '@/components/shared/VoiceInput';
import { useFileUpload } from '@/hooks/useFileUpload';
import FileViewer from '@/components/shared/FileViewer';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

// Function to parse note content and highlight @mentions
const parseContentWithMentions = (content) => {
  if (!content) return content;
  
  // Split by @mentions and create spans with styling
  const parts = content.split(/(@\[[^\]]+\]\([^)]+\))/g);
  
  return parts.map((part, index) => {
    // Check if this part is a mention
    const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
    if (mentionMatch) {
      const [, displayName, email] = mentionMatch;
      return (
        <span key={index} className="bg-accent bg-opacity-20 text-accent px-1 rounded font-medium">
          @{displayName}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

// Function to extract tagged user emails from content
const extractTaggedEmails = (content) => {
  if (!content) return [];
  const matches = content.matchAll(/@\[[^\]]+\]\(([^)]+)\)/g);
  return Array.from(matches, m => m[1]);
};

export default function NotesModal({ parentId, parentType, isOpen, onClose }) {
  const [newNote, setNewNote] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [activeTab, setActiveTab] = useState('notes');
  const [viewingFile, setViewingFile] = useState(null);
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { uploadFiles: uploadFilesForTab, isUploading: isUploadingForTab } = useFileUpload({
    onComplete: (urls) => {
      createNoteMutation.mutate({
        content: '',
        parent_id: parentId,
        parent_type: parentType,
        file_urls: urls,
      });
    },
  });

  const filesTabInputRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', parentId, parentType],
    queryFn: async () => {
      const allNotes = await base44.entities.Note.list('-created_date', 1000);
      return allNotes.filter(n => n.parent_id === parentId && n.parent_type === parentType);
    },
    enabled: isOpen && !!parentId && !!parentType,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      // Extract tagged emails from content
      const taggedEmails = extractTaggedEmails(noteData.content);
      return base44.entities.Note.create({
        ...noteData,
        tagged_users: taggedEmails,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] });
      setNewNote('');
      setReplyingTo(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to add note",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsViewedMutation = useMutation({
    mutationFn: ({ noteId, viewedBy }) => 
      base44.entities.Note.update(noteId, { viewed_by: viewedBy }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] });
    },
  });

  const toggleReactionMutation = useMutation({
    mutationFn: ({ noteId, reactions }) => 
      base44.entities.Note.update(noteId, { reactions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async ({ noteId, fileUrl }) => {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;
      const updatedUrls = (note.file_urls || []).filter(u => u !== fileUrl);
      return base44.entities.Note.update(noteId, { file_urls: updatedUrls });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] });
      toast({ title: 'File removed', description: 'The file has been removed from the note.' });
    },
    onError: (error) => {
      toast({ title: 'Failed to remove file', description: error?.message || 'Please try again.', variant: 'destructive' });
    },
  });

  // Aggregate all files from all notes with their source note reference
  const allNoteFiles = notes.flatMap(note =>
    (note.file_urls || []).map(url => ({ url, noteId: note.id, noteAuthor: note.created_by, noteDate: note.created_date }))
  );

  // Handle textarea change and detect @ mentions
  const handleTextareaChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    setNewNote(value);
    setCursorPosition(cursorPos);

    // Check if user just typed @
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      // Only show dropdown if there's no space after @ (still typing the mention)
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        setMentionSearch(textAfterAt);
        setShowMentionDropdown(true);
      } else {
        setShowMentionDropdown(false);
      }
    } else {
      setShowMentionDropdown(false);
    }
  };

  // Insert mention when user selects from dropdown
  const insertMention = (user) => {
    const textBeforeCursor = newNote.substring(0, cursorPosition);
    const textAfterCursor = newNote.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    // Replace from @ to cursor with the mention
    const beforeAt = textBeforeCursor.substring(0, lastAtIndex);
    const mention = `@[${user.full_name || user.email}](${user.email})`;
    const newText = beforeAt + mention + ' ' + textAfterCursor;
    
    setNewNote(newText);
    setShowMentionDropdown(false);
    
    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeAt.length + mention.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Filter users based on search
  const filteredUsers = allUsers.filter(user => {
    const searchLower = mentionSearch.toLowerCase();
    const fullName = (user.full_name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    return fullName.includes(searchLower) || email.includes(searchLower);
  }).slice(0, 5); // Limit to 5 results

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    createNoteMutation.mutate({
      content: newNote,
      parent_id: parentId,
      parent_type: parentType,
      parent_note_id: replyingTo?.id || null,
    });
  };

  const handleFilesTabSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFilesForTab(files);
    }
    e.target.value = '';
  };

  const getFileName = (url) => {
    try {
      const decoded = decodeURIComponent(url);
      const parts = decoded.split('/');
      return parts[parts.length - 1].split('?')[0];
    } catch {
      return 'Attached file';
    }
  };

  const handleReply = (note) => {
    setReplyingTo(note);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleToggleReaction = (note, emoji) => {
    const reactions = { ...(note.reactions || {}) };
    const userEmail = currentUser?.email;
    
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }
    
    if (reactions[emoji].includes(userEmail)) {
      reactions[emoji] = reactions[emoji].filter(e => e !== userEmail);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    } else {
      reactions[emoji].push(userEmail);
    }
    
    toggleReactionMutation.mutate({ noteId: note.id, reactions });
  };

  const handleMarkAsViewed = (note) => {
    const userEmail = currentUser?.email;
    const viewedBy = [...(note.viewed_by || [])];
    
    if (!viewedBy.includes(userEmail)) {
      viewedBy.push(userEmail);
      markAsViewedMutation.mutate({ noteId: note.id, viewedBy });
    }
  };

  // Group notes by parent (main notes vs replies)
  const mainNotes = notes.filter(n => !n.parent_note_id);
  const getReplies = (noteId) => notes.filter(n => n.parent_note_id === noteId);

  const commonEmojis = ['👍', '❤️', '😊', '🎉', '👀'];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setViewingFile(null); onClose(); } }}>
      <DialogContent className="max-w-[580px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
        <div className="mb-4">
          <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Internal Notes & Team Communication</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            These notes are for internal team communication only and do NOT affect 48-hour tracking
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Notes ({mainNotes.length})
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'files'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Files ({allNoteFiles.length})
          </button>
        </div>

        {activeTab === 'files' && (
          <>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[13px] text-gray-500 dark:text-gray-400">
              Files attached to notes for this record
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => filesTabInputRef.current?.click()}
              disabled={isUploadingForTab}
            >
              <Paperclip className="w-3.5 h-3.5 mr-1" />
              {isUploadingForTab ? 'Uploading...' : 'Add File'}
            </Button>
            <input
              ref={filesTabInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFilesTabSelect}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{maxHeight: '46vh'}}>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading files...</div>
            ) : allNoteFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No files attached yet. Click "Add File" to upload.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allNoteFiles.map((file, idx) => {
                  const fileName = getFileName(file.url);
                  return (
                    <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground break-all">{fileName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {file.noteAuthor} • {format(new Date(file.noteDate), 'dd/MM/yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => setViewingFile(file.url)} className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="View file">
                            <Eye className="w-4 h-4" />
                          </button>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors" title="Download file">
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => deleteFileMutation.mutate({ noteId: file.noteId, fileUrl: file.url })}
                            disabled={deleteFileMutation.isPending}
                            className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          </>
        )}

        {activeTab === 'notes' && (
        <>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
          ) : mainNotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No notes yet. Add the first update!
            </div>
          ) : (
            mainNotes.map((note) => (
              <div key={note.id} className="space-y-2">
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium text-foreground">{note.created_by}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(note.created_date), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleMarkAsViewed(note)}
                        title={note.viewed_by?.includes(currentUser?.email) ? 'Mark as unread' : 'Mark as read'}
                      >
                        {note.viewed_by?.includes(currentUser?.email) ? (
                          <Eye className="w-4 h-4 text-blue-500" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleReply(note)}
                      >
                        <Reply className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap text-foreground">
                    {parseContentWithMentions(note.content)}
                  </div>

                  {/* Attached files */}
                  {note.file_urls && note.file_urls.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {note.file_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <FileIcon className="w-3.5 h-3.5 text-gray-500" />
                          <span className="max-w-[200px] truncate">{getFileName(url)}</span>
                          <Download className="w-3 h-3 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Show tagged users */}
                  {note.tagged_users && note.tagged_users.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Tagged: {note.tagged_users.join(', ')}
                    </div>
                  )}

                  {/* Reactions */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {Object.entries(note.reactions || {}).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => handleToggleReaction(note, emoji)}
                        className={`neomorph-flat px-2 py-1 text-sm flex items-center gap-1 ${
                          users.includes(currentUser?.email) ? 'ring-1 ring-accent' : ''
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="text-xs">{users.length}</span>
                      </button>
                    ))}
                    <div className="relative group">
                      <button className="neomorph-flat px-2 py-1 text-sm">
                        <Smile className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex gap-1 bg-glass-elevated p-2 rounded shadow-lg">
                        {commonEmojis.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => handleToggleReaction(note, emoji)}
                            className="hover:scale-125 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {getReplies(note.id).map(reply => (
                <div key={reply.id} className="ml-8 bg-muted/20 border border-border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-medium text-sm text-foreground">{reply.created_by}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(new Date(reply.created_date), 'MMM d, yyyy HH:mm')}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm whitespace-pre-wrap text-foreground">
                    {parseContentWithMentions(reply.content)}
                  </div>

                  {reply.file_urls && reply.file_urls.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {reply.file_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <FileIcon className="w-3.5 h-3.5 text-gray-500" />
                          <span className="max-w-[200px] truncate">{getFileName(url)}</span>
                          <Download className="w-3 h-3 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  )}

                  {reply.tagged_users && reply.tagged_users.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Tagged: {reply.tagged_users.join(', ')}
                    </div>
                  )}
                </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* New Note Form */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6 mt-6">
          {replyingTo && (
            <div className="mb-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm">
              <span className="text-gray-700 dark:text-gray-300">Replying to {replyingTo.created_by}</span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-[14px] font-medium text-gray-700 dark:text-gray-300 mb-[6px]">
                Add Note
              </label>
              <Textarea
                ref={textareaRef}
                value={newNote}
                onChange={handleTextareaChange}
                placeholder="Type your note here... (type @ to mention someone)"
                className="min-h-[160px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg text-[14px] text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              
              {/* Mention Dropdown */}
              {showMentionDropdown && filteredUsers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-1 w-64 neomorph-flat max-h-48 overflow-y-auto z-50">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => insertMention(user)}
                      className="w-full text-left px-3 py-2 hover:bg-glass-hover transition-colors"
                    >
                      <div className="font-medium">{user.full_name || user.email}</div>
                      <div className="text-xs text-foreground-muted">{user.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <VoiceInput
                  value={newNote}
                  onChange={setNewNote}
                  disabled={createNoteMutation.isPending}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Dictate or type @ to mention someone
                </span>
              </div>
            </div>

            {/* Action buttons — inside the form so type="submit" triggers handleSubmit */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newNote.trim() || createNoteMutation.isPending}
                className="h-9 px-4 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                {createNoteMutation.isPending ? 'Sending...' : (replyingTo ? 'Reply' : 'Add Note')}
              </Button>
            </div>
          </form>
        </div>
        </>
        )}

      </DialogContent>

      {viewingFile && (
        <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
      )}
    </Dialog>
  );
}