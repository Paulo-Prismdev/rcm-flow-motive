import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import NotesModal from './NotesModal';

export default function NotesButton({ parentId, parentType, isOpen, onOpenChange }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sync with external control if provided
  useEffect(() => {
    if (isOpen !== undefined) {
      setIsModalOpen(isOpen);
    }
  }, [isOpen]);

  const handleOpenChange = (open) => {
    setIsModalOpen(open);
    if (onOpenChange) {
      onOpenChange(open);
    }
  };

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes', parentId, parentType],
    queryFn: async () => {
      const allNotes = await base44.entities.Note.filter({ 
        parent_id: parentId, 
        parent_type: parentType 
      });
      return allNotes;
    },
    enabled: !!parentId && !!parentType,
  });

  // Count unread notes
  const unreadCount = notes.filter(note => 
    !note.viewed_by?.includes(currentUser?.email || '')
  ).length;

  return (
    <>
      <NotesModal 
        parentId={parentId}
        parentType={parentType}
        isOpen={isModalOpen}
        onClose={() => handleOpenChange(false)}
      />
      
      <Button
        onClick={() => handleOpenChange(true)}
        className="glass-button px-4 py-2 flex items-center gap-2 text-purple-600 relative"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Updates</span>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
        {notes.length > 0 && unreadCount === 0 && (
          <span className="absolute -top-2 -right-2 bg-accent text-black text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {notes.length}
          </span>
        )}
      </Button>
    </>
  );
}