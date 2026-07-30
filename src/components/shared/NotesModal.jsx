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
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { setViewingFile(null); onClose(); } }}>
      <DialogContent className="max-w-[580px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-8 border border-gray-200 dark:border-gray-800">
...
      </DialogContent>
    </Dialog>

    {viewingFile && (
      <FileViewer fileUrl={viewingFile} onClose={() => setViewingFile(null)} />
    )}
    </>
  );
}