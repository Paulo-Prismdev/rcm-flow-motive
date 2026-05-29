import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Send, Reply, Smile, Eye, EyeOff, MessageSquare } from "lucide-react";
import VoiceInput from '@/components/shared/VoiceInput';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const textareaRef = useRef(null);
  const queryClient = useQueryClient();

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    createNoteMutation.mutate({
      content: newNote,
      parent_id: parentId,
      parent_type: parentType,
      parent_note_id: replyingTo?.id || null,
    });
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[580px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-[18px] font-semibold text-gray-900 dark:text-white">Internal Notes & Team Communication</h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              These notes are for internal team communication only and do NOT affect 48-hour tracking
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
                  Dictate or type @ to mention
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
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
            onClick={handleSubmit}
            disabled={!newNote.trim() || createNoteMutation.isPending}
            className="h-9 px-4 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="w-4 h-4 mr-2" />
            {replyingTo ? 'Reply' : 'Add Note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}