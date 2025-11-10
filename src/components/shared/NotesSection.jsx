
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Reply, ThumbsUp, Eye, Trash2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function NotesSection({ parentId, parentType }) {
  const [newNote, setNewNote] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', parentId, parentType],
    queryFn: async () => {
      const allNotes = await base44.entities.Note.filter({ 
        parent_id: parentId, 
        parent_type: parentType 
      });
      return allNotes.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!parentId && !!parentType,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      return await base44.entities.Note.create(noteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] });
      setNewNote('');
      setReplyingTo(null);
      setReplyContent('');
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId) => base44.entities.Note.delete(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, data }) => base44.entities.Note.update(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', parentId, parentType] });
    },
  });

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    const noteData = {
      content: newNote,
      parent_id: parentId,
      parent_type: parentType,
      reactions: {},
      viewed_by: [currentUser?.email || ''],
    };

    createNoteMutation.mutate(noteData);
  };

  const handleAddReply = async (parentNoteId) => {
    if (!replyContent.trim()) return;

    const replyData = {
      content: replyContent,
      parent_id: parentId,
      parent_type: parentType,
      parent_note_id: parentNoteId,
      reactions: {},
      viewed_by: [currentUser?.email || ''],
    };

    createNoteMutation.mutate(replyData);
  };

  const handleReaction = (noteId, emoji) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const reactions = { ...note.reactions } || {};
    const userEmail = currentUser?.email || '';
    
    // First, remove user from all existing reactions
    Object.keys(reactions).forEach(existingEmoji => {
      if (reactions[existingEmoji]?.includes(userEmail)) {
        reactions[existingEmoji] = reactions[existingEmoji].filter(email => email !== userEmail);
        if (reactions[existingEmoji].length === 0) {
          delete reactions[existingEmoji];
        }
      }
    });
    
    // Check if user already had this specific emoji in the original note reactions (they clicked it again to remove)
    const hadThisReaction = note.reactions?.[emoji]?.includes(userEmail);
    
    // If they didn't have this reaction (meaning either no reaction or a different one), add the new reaction
    if (!hadThisReaction) {
      if (reactions[emoji]) {
        reactions[emoji] = [...reactions[emoji], userEmail];
      } else {
        reactions[emoji] = [userEmail];
      }
    }

    updateNoteMutation.mutate({ noteId, data: { reactions } });
  };

  const handleMarkAsViewed = (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;

    const viewedBy = note.viewed_by || [];
    const userEmail = currentUser?.email || '';
    
    if (!viewedBy.includes(userEmail)) {
      updateNoteMutation.mutate({ 
        noteId, 
        data: { viewed_by: [...viewedBy, userEmail] } 
      });
    }
  };

  const handleDelete = (noteId) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  const mainNotes = notes.filter(note => !note.parent_note_id);
  const getReplies = (noteId) => notes.filter(note => note.parent_note_id === noteId);

  const emojiOptions = ['👍', '❤️', '🎉', '👀', '✅', '🔥', '💯', '😊'];

  // Get user's current reaction on a note
  const getUserReaction = (note) => {
    const userEmail = currentUser?.email || '';
    const reactions = note.reactions || {};
    for (const [emoji, users] of Object.entries(reactions)) {
      if (users.includes(userEmail)) {
        return emoji;
      }
    }
    return null;
  };

  // Get all reactions with counts
  const getAllReactions = (note) => {
    const reactions = note.reactions || {};
    return Object.entries(reactions)
      .filter(([emoji, users]) => users.length > 0)
      .map(([emoji, users]) => ({ emoji, count: users.length, users }));
  };

  return (
    <div className="glass p-4 md:p-6 space-y-4">
      <h3 className="font-bold text-lg">Updates & Notes</h3>
      
      {/* Add New Note */}
      <div className="space-y-2">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an update or note..."
          className="glass-inset px-4 py-3 border-0 resize-none"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleAddNote();
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleAddNote}
            disabled={!newNote.trim() || createNoteMutation.isPending}
            className="glass-button px-4 py-2 flex items-center gap-2 text-blue-600"
          >
            <Send className="w-4 h-4" />
            {createNoteMutation.isPending ? 'Sending...' : 'Send Update'}
          </Button>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-3 mt-6">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-foreground-muted">Loading updates...</p>
          </div>
        ) : mainNotes.length === 0 ? (
          <div className="text-center py-8 glass-inset rounded-lg">
            <p className="text-sm text-foreground-muted">No updates yet. Be the first to add one!</p>
          </div>
        ) : (
          mainNotes.map((note) => {
            const replies = getReplies(note.id);
            const isViewed = note.viewed_by?.includes(currentUser?.email || '');
            const canDelete = note.created_by === currentUser?.email || currentUser?.role === 'admin';
            const userReaction = getUserReaction(note);
            const allReactions = getAllReactions(note);

            return (
              <div key={note.id} className="glass-inset p-4 rounded-lg space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{note.created_by}</span>
                      <span className="text-xs text-foreground-muted">
                        {format(new Date(note.created_date), 'MMM d, yyyy HH:mm')}
                      </span>
                      {!isViewed && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  </div>
                  {canDelete && (
                    <Button
                      onClick={() => handleDelete(note.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Reactions Summary (if any) */}
                {allReactions.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {allReactions.map(({ emoji, count, users }) => (
                      <Popover key={emoji}>
                        <PopoverTrigger asChild>
                          <button
                            onClick={() => handleReaction(note.id, emoji)}
                            className={`px-2 py-1 rounded-lg text-sm flex items-center gap-1 transition-all ${
                              users.includes(currentUser?.email || '')
                                ? 'glass-accent' 
                                : 'glass-inset hover:glass'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-xs">{count}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="glass-elevated w-auto p-2" align="start">
                          <div className="text-xs space-y-1">
                            {users.map(email => (
                              <div key={email}>{email}</div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-glass-border">
                  {/* Like Button with Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all ${
                          userReaction 
                            ? 'glass-accent font-medium' 
                            : 'glass-inset hover:glass'
                        }`}
                      >
                        {userReaction ? (
                          <span>{userReaction}</span>
                        ) : (
                          <ThumbsUp className="w-3.5 h-3.5" />
                        )}
                        <span>Like</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="glass-elevated" align="start">
                      {emojiOptions.map((emoji) => (
                        <DropdownMenuItem
                          key={emoji}
                          onClick={() => handleReaction(note.id, emoji)}
                          className="cursor-pointer text-lg py-2"
                        >
                          {emoji}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Reply Button */}
                  <button
                    onClick={() => setReplyingTo(replyingTo === note.id ? null : note.id)}
                    className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 glass-inset hover:glass transition-all"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>

                  {/* Views Button */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        onClick={() => handleMarkAsViewed(note.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-all ml-auto ${
                          isViewed ? 'glass-inset text-green-600' : 'glass-inset hover:glass'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{note.viewed_by?.length || 0}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="glass-elevated w-auto p-3" align="end">
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground-muted">Viewed by:</p>
                        <div className="text-xs space-y-1">
                          {note.viewed_by && note.viewed_by.length > 0 ? (
                            note.viewed_by.map(email => (
                              <div key={email} className="flex items-center gap-2">
                                <Eye className="w-3 h-3 text-green-600" />
                                {email}
                              </div>
                            ))
                          ) : (
                            <p className="text-foreground-muted">No views yet</p>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Reply Form */}
                {replyingTo === note.id && (
                  <div className="mt-3 space-y-2 border-t border-glass-border pt-3">
                    <Textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="glass-inset px-3 py-2 text-sm border-0 resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAddReply(note.id)}
                        disabled={!replyContent.trim() || createNoteMutation.isPending}
                        className="glass-button px-3 py-1 text-xs flex items-center gap-2 text-blue-600"
                      >
                        <Send className="w-3 h-3" />
                        Send
                      </Button>
                      <Button
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                        className="glass-button px-3 py-1 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {replies.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-glass-border pt-3">
                    {replies.map((reply) => {
                      const replyCanDelete = reply.created_by === currentUser?.email || currentUser?.role === 'admin';
                      
                      return (
                        <div key={reply.id} className="glass-inset p-3 rounded-lg ml-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-xs">{reply.created_by}</span>
                                <span className="text-xs text-foreground-muted">
                                  {format(new Date(reply.created_date), 'MMM d, HH:mm')}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                            </div>
                            {replyCanDelete && (
                              <Button
                                onClick={() => handleDelete(reply.id)}
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
