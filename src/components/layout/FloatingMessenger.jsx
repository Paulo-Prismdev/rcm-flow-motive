import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, X, Hash, Paperclip, Smile, Reply, Settings, Plus, Users, LogOut } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEPARTMENTS = ["Claims", "Estimating", "Engineering", "Parts", "Invoicing", "General"];
const EMOJI_LIST = ['👍', '❤️', '😊', '😂', '🎉', '👏', '🔥', '✅'];

// Helper functions for avatar
const getUserInitials = (user) => {
  if (!user) return '?';
  if (user.full_name) {
    const parts = user.full_name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return user.full_name.substring(0, 2).toUpperCase();
  }
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  return '?';
};

const getAvatarColor = (email) => {
  if (!email) return 'bg-gray-500';
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500',
  ];
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function FloatingMessenger({ currentUser, isOpen, onClose }) {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("direct"); // direct, channels
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!currentUser && isOpen,
  });

  const internalUsers = allUsers.filter(u => 
    (u.user_type === 'internal' || u.role === 'admin') && 
    u.email !== currentUser?.email
  );

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 5000),
    refetchInterval: isOpen ? 5000 : false,
    enabled: !!currentUser && isOpen,
  });

  // Initialize department channels - only create if they don't exist yet
  useEffect(() => {
    if (currentUser && allUsers.length > 0 && messages.length > 0 && isOpen) {
      const allInternalEmails = allUsers
        .filter(u => u.user_type === 'internal' || u.role === 'admin')
        .map(u => u.email);

      DEPARTMENTS.forEach(dept => {
        const deptConvId = `dept_${dept.toLowerCase()}`;
        
        // Check if this department channel already has messages
        const channelExists = messages.some(m => m.conversation_id === deptConvId);
        
        // Only create welcome message if channel doesn't exist
        if (!channelExists) {
          base44.entities.Message.create({
            content: `Welcome to the ${dept} department channel!`,
            sender_email: currentUser.email,
            sender_name: 'System',
            conversation_id: deptConvId,
            conversation_type: 'channel',
            channel_name: `${dept} Department`,
            channel_description: `Official channel for ${dept} department`,
            channel_members: allInternalEmails,
            is_department_channel: true,
            department: dept,
            read_by: [],
            created_date: new Date().toISOString(),
          }).catch(() => {});
        }
      });
    }
  }, [currentUser, allUsers, messages, isOpen]);

  const conversations = React.useMemo(() => {
    if (!currentUser) return [];
    const convMap = new Map();
    
    messages.forEach(msg => {
      if (msg.conversation_type === 'channel' && msg.channel_members?.includes(currentUser.email)) {
        const convId = msg.conversation_id;
        if (!convMap.has(convId) || new Date(msg.created_date) > new Date(convMap.get(convId).lastMessage.created_date)) {
          const unreadCount = messages.filter(m => 
            m.conversation_id === convId && 
            m.sender_email !== currentUser.email &&
            !m.read_by?.includes(currentUser.email)
          ).length;
          convMap.set(convId, {
            id: convId,
            type: 'channel',
            name: msg.channel_name,
            description: msg.channel_description,
            isDepartment: msg.is_department_channel,
            department: msg.department,
            members: msg.channel_members || [],
            lastMessage: msg,
            unreadCount
          });
        }
      } else if (msg.conversation_type === 'direct') {
        // Only show DM if current user is a participant
        const participants = [msg.sender_email, ...(msg.channel_members || [])];
        if (!participants.includes(currentUser.email)) return;
        
        const otherUserEmail = msg.sender_email === currentUser.email ? msg.channel_members?.[0] : msg.sender_email;
        const convId = msg.conversation_id;
        
        if (!convMap.has(convId) || new Date(msg.created_date) > new Date(convMap.get(convId).lastMessage.created_date)) {
          const otherUser = allUsers.find(u => u.email === otherUserEmail);
          const unreadCount = messages.filter(m => 
            m.conversation_id === convId && 
            m.sender_email !== currentUser.email &&
            !m.is_read
          ).length;
          
          convMap.set(convId, {
            id: convId,
            type: 'direct',
            otherUser,
            lastMessage: msg,
            unreadCount
          });
        }
      }
    });
    
    return Array.from(convMap.values()).sort((a, b) => 
      new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
    );
  }, [messages, currentUser, allUsers]);

  const filteredConversations = conversations.filter(conv => {
    if (viewMode === 'direct') return conv.type === 'direct';
    if (viewMode === 'channels') return conv.type === 'channel';
    return false;
  });

  const directUnread = conversations.filter(c => c.type === 'direct').reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const channelUnread = conversations.filter(c => c.type === 'channel').reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const conversationMessages = React.useMemo(() => {
    if (!selectedConversation) return [];
    return messages
      .filter(m => m.conversation_id === selectedConversation.id)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  }, [messages, selectedConversation]);

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (messageIds) => {
      if (selectedConversation?.type === 'channel') {
        const promises = messageIds.map(id => {
          const msg = messages.find(m => m.id === id);
          const readBy = msg?.read_by || [];
          if (!readBy.includes(currentUser.email)) {
            return base44.entities.Message.update(id, { 
              read_by: [...readBy, currentUser.email]
            });
          }
          return Promise.resolve();
        });
        return Promise.all(promises);
      } else {
        const promises = messageIds.map(id => 
          base44.entities.Message.update(id, { is_read: true })
        );
        return Promise.all(promises);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  useEffect(() => {
    if (selectedConversation && currentUser && isOpen) {
      const unreadMessages = conversationMessages.filter(m => {
        if (m.sender_email === currentUser.email) return false;
        if (selectedConversation.type === 'channel') {
          return !m.read_by?.includes(currentUser.email);
        }
        return !m.is_read;
      });
      
      if (unreadMessages.length > 0) {
        markAsReadMutation.mutate(unreadMessages.map(m => m.id));
      }
    }
  }, [selectedConversation, conversationMessages, currentUser, isOpen]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationMessages, isOpen]);

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageText("");
      setReplyingTo(null);
    },
  });

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;

    const messageData = {
      content: messageText,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      conversation_id: selectedConversation.id,
      conversation_type: selectedConversation.type,
      reply_to_message_id: replyingTo?.id,
      created_date: new Date().toISOString(),
    };

    if (selectedConversation.type === 'channel') {
      messageData.channel_name = selectedConversation.name;
      messageData.channel_description = selectedConversation.description;
      messageData.channel_members = selectedConversation.members;
      messageData.is_department_channel = selectedConversation.isDepartment;
      messageData.department = selectedConversation.department;
      messageData.read_by = [currentUser.email];
    } else {
      messageData.channel_members = [selectedConversation.otherUser.email];
      messageData.is_read = false;
    }

    sendMessageMutation.mutate(messageData);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation) return;

    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      
      const messageData = {
        content: `📎 Sent a file: ${file.name}`,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name,
        conversation_id: selectedConversation.id,
        conversation_type: selectedConversation.type,
        attachment_urls: [result.file_url],
        created_date: new Date().toISOString(),
      };

      if (selectedConversation.type === 'channel') {
        messageData.channel_name = selectedConversation.name;
        messageData.channel_description = selectedConversation.description;
        messageData.channel_members = selectedConversation.members;
        messageData.is_department_channel = selectedConversation.isDepartment;
        messageData.department = selectedConversation.department;
        messageData.read_by = [currentUser.email];
      } else {
        messageData.channel_members = [selectedConversation.otherUser.email];
        messageData.is_read = false;
      }

      await sendMessageMutation.mutateAsync(messageData);
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const addReactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }) => {
      const msg = messages.find(m => m.id === messageId);
      const reactions = msg?.reactions || {};
      const emojiReactions = reactions[emoji] || [];
      
      if (emojiReactions.includes(currentUser.email)) {
        reactions[emoji] = emojiReactions.filter(e => e !== currentUser.email);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        reactions[emoji] = [...emojiReactions, currentUser.email];
      }
      
      return base44.entities.Message.update(messageId, { reactions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setShowEmojiPicker(null);
    },
  });

  const startNewConversation = (user) => {
    const convId = [currentUser.email, user.email].sort().join('_');
    setSelectedConversation({
      id: convId,
      type: 'direct',
      otherUser: user,
      lastMessage: null,
      unreadCount: 0
    });
    setShowNewDM(false);
  };

  const leaveChannelMutation = useMutation({
    mutationFn: async (channelId) => {
      const channelMessages = messages.filter(msg => msg.conversation_id === channelId);
      const promises = channelMessages.map(msg => {
        const newMembers = (msg.channel_members || []).filter(email => email !== currentUser.email);
        return base44.entities.Message.update(msg.id, { channel_members: newMembers });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setSelectedConversation(null);
      setShowChannelSettings(false);
    },
  });

  const filteredUsers = internalUsers.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser || !isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .messenger-panel {
          animation: slideInFromRight 0.3s ease-out;
        }

        .messenger-backdrop {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        currentUser={currentUser}
        allUsers={internalUsers}
      />

      {/* Channel Settings Modal */}
      {selectedConversation?.type === 'channel' && (
        <ChannelSettingsModal
          isOpen={showChannelSettings}
          onClose={() => setShowChannelSettings(false)}
          channel={selectedConversation}
          allUsers={internalUsers}
          currentUser={currentUser}
          messages={messages}
          onLeaveChannel={() => leaveChannelMutation.mutate(selectedConversation.id)}
        />
      )}

      {/* New DM Modal */}
      <NewDMModal
        isOpen={showNewDM}
        onClose={() => setShowNewDM(false)}
        users={internalUsers}
        onSelectUser={startNewConversation}
      />

      {/* Backdrop */}
      <div 
        className="messenger-backdrop fixed inset-0 bg-black/40"
        style={{ zIndex: 10000 }}
        onClick={() => { onClose(); setSelectedConversation(null); }}
      />
      
      {/* Panel */}
      <div 
        className="messenger-panel fixed top-0 right-0 bottom-0 flex flex-col bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-800"
        style={{ width: '100%', maxWidth: '380px', zIndex: 10001 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#131d47] text-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <h3 className="font-semibold text-sm">Messages</h3>
          </div>
          <button
            onClick={() => { onClose(); setSelectedConversation(null); }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {!selectedConversation ? (
            <>
              {/* Tab bar */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                {[
                  { mode: 'direct', label: 'Direct', unread: directUnread },
                  { mode: 'channels', label: 'Channels', unread: channelUnread },
                ].map(({ mode, label, unread }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      viewMode === mode
                        ? 'bg-[#131d47] text-white'
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {label}
                    {unread > 0 && (
                      <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setShowNewDM(true)}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors"
                  title="New Direct Message"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400 transition-colors"
                  title="New Channel"
                >
                  <Hash className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-sm text-gray-400">No conversations yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {filteredConversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className="w-full px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center gap-3 text-left"
                      >
                        {conv.type === 'channel' ? (
                          <div className="w-10 h-10 rounded-xl bg-[#131d47]/10 dark:bg-[#131d47]/40 flex items-center justify-center flex-shrink-0">
                            <Hash className="w-5 h-5 text-[#131d47] dark:text-blue-300" />
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-full ${getAvatarColor(conv.otherUser?.email)} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-sm font-bold text-white">
                              {getUserInitials(conv.otherUser)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {conv.type === 'channel' ? conv.name : conv.otherUser?.full_name}
                            </p>
                            {conv.unreadCount > 0 && (
                              <span className="bg-[#00cc00] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ml-2">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">
                            {conv.lastMessage.content.substring(0, 45)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Chat View Header */}
              <div className="px-3 py-2.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0 bg-white dark:bg-gray-900">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <button onClick={() => setSelectedConversation(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                  {selectedConversation.type === 'channel' ? (
                    <>
                      <div className="w-7 h-7 rounded-lg bg-[#131d47]/10 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-4 h-4 text-[#131d47] dark:text-blue-300" />
                      </div>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{selectedConversation.name}</span>
                    </>
                  ) : (
                    <>
                      <div className={`w-7 h-7 rounded-full ${getAvatarColor(selectedConversation.otherUser?.email)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-xs font-bold text-white">
                          {getUserInitials(selectedConversation.otherUser)}
                        </span>
                      </div>
                      <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">{selectedConversation.otherUser?.full_name}</span>
                    </>
                  )}
                </div>
                {selectedConversation.type === 'channel' && (
                  <button onClick={() => setShowChannelSettings(true)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
                    <Settings className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-950">
                {conversationMessages.map(msg => {
                  const isMine = msg.sender_email === currentUser?.email;
                  const replyToMsg = msg.reply_to_message_id ? messages.find(m => m.id === msg.reply_to_message_id) : null;
                  
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 group relative ${
                        isMine 
                          ? 'bg-[#131d47] text-white'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-100 dark:border-gray-700'
                      }`}>
                        {selectedConversation.type === 'channel' && !isMine && (
                          <p className="text-[10px] font-semibold mb-1 text-[#00cc00]">{msg.sender_name}</p>
                        )}
                        
                        {replyToMsg && (
                          <div className={`p-2 mb-2 text-xs rounded-lg border-l-2 ${isMine ? 'border-white/40 bg-white/10' : 'border-gray-300 bg-gray-50 dark:bg-gray-700'}`}>
                            <p className="font-semibold opacity-80">{replyToMsg.sender_name}</p>
                            <p className="truncate opacity-60">{replyToMsg.content}</p>
                          </div>
                        )}

                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                        
                        {msg.attachment_urls && msg.attachment_urls.length > 0 && (
                          <div className="mt-2">
                            {msg.attachment_urls.map((url, idx) => (
                              <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                                className="text-xs underline block hover:opacity-80">
                                📎 View attachment
                              </a>
                            ))}
                          </div>
                        )}

                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(msg.reactions).map(([emoji, users]) => (
                              <button key={emoji}
                                onClick={() => addReactionMutation.mutate({ messageId: msg.id, emoji })}
                                className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 bg-white/20 dark:bg-black/20 ${
                                  users.includes(currentUser.email) ? 'ring-1 ring-white/50' : ''
                                }`}>
                                {emoji} {users.length}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-1 gap-2">
                          <p className={`text-[10px] ${isMine ? 'text-white/50' : 'text-gray-400'}`}>
                            {format(new Date(msg.created_date), 'HH:mm')}
                          </p>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu open={showEmojiPicker === msg.id} onOpenChange={(open) => setShowEmojiPicker(open ? msg.id : null)}>
                              <DropdownMenuTrigger asChild>
                                <button className={`p-1 rounded ${isMine ? 'hover:bg-white/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                  <Smile className="w-3 h-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {EMOJI_LIST.map(emoji => (
                                  <DropdownMenuItem key={emoji} onClick={() => addReactionMutation.mutate({ messageId: msg.id, emoji })}>
                                    {emoji}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <button onClick={() => setReplyingTo(msg)} className={`p-1 rounded ${isMine ? 'hover:bg-white/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                              <Reply className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
                {replyingTo && (
                  <div className="px-3 py-2 mb-2 flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="font-semibold text-gray-700 dark:text-gray-300 truncate">Replying to {replyingTo.sender_name}</p>
                      <p className="text-gray-400 truncate">{replyingTo.content}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 transition-colors flex-shrink-0"
                    disabled={isUploading}
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 text-sm h-9 rounded-xl bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    disabled={isUploading}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessageMutation.isPending || isUploading}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                      messageText.trim() ? 'bg-[#131d47] text-white hover:bg-[#1a2660]' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    } disabled:opacity-50`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Create Channel Modal
function CreateChannelModal({ isOpen, onClose, currentUser, allUsers }) {
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isOpen) {
      setChannelName("");
      setDescription("");
      setSelectedMembers([]);
    }
  }, [isOpen]);

  const createChannelMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      onClose();
    },
  });

  const handleCreate = () => {
    const members = [currentUser.email, ...selectedMembers];
    const convId = `channel_${Date.now()}`;
    
    createChannelMutation.mutate({
      content: `${currentUser.full_name} created this channel`,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      conversation_id: convId,
      conversation_type: 'channel',
      channel_name: channelName,
      channel_description: description,
      channel_members: members,
      is_department_channel: false,
      read_by: [currentUser.email],
      created_date: new Date().toISOString(),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Channel Name</label>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="e.g., Project Updates"
              className="glass-inset"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="glass-inset"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">Add Members</label>
            <div className="glass-inset p-3 max-h-48 overflow-y-auto space-y-2">
              {allUsers.map(user => (
                <label key={user.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(user.email)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, user.email]);
                      } else {
                        setSelectedMembers(selectedMembers.filter(email => email !== user.email));
                      }
                    }}
                    className="form-checkbox h-4 w-4 text-accent rounded"
                  />
                  <span className="text-sm">{user.full_name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="glass-button px-4 py-2">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!channelName.trim() || createChannelMutation.isPending}
              className="glass-button px-4 py-2 text-accent"
            >
              Create
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Channel Settings Modal
function ChannelSettingsModal({ isOpen, onClose, channel, allUsers, currentUser, messages, onLeaveChannel }) {
  const [members, setMembers] = useState(channel?.members || []);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (channel) {
      setMembers(channel.members || []);
    }
  }, [channel]);

  const updateMembersMutation = useMutation({
    mutationFn: async (newMembers) => {
      const channelMessages = messages.filter(msg => msg.conversation_id === channel.id);
      
      const updatePromises = channelMessages.map(msg =>
        base44.entities.Message.update(msg.id, { channel_members: newMembers })
      );
      
      return Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      onClose();
    },
  });

  const handleSave = () => {
    updateMembersMutation.mutate(members);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            {channel?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">{channel?.description}</p>
          
          {!channel?.isDepartment && (
            <div>
              <label className="block text-sm mb-2 font-medium">Members ({members.length})</label>
              <div className="glass-inset p-3 max-h-64 overflow-y-auto space-y-2">
                {allUsers.map(user => (
                  <label key={user.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={members.includes(user.email)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMembers([...members, user.email]);
                        } else {
                          setMembers(members.filter(email => email !== user.email));
                        }
                      }}
                      className="form-checkbox h-4 w-4 text-accent rounded"
                    />
                    <span className="text-sm">{user.full_name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {channel?.isDepartment && (
            <p className="text-sm text-foreground-muted">
              This is a department channel. All staff have access.
            </p>
          )}
          
          <div className="flex justify-between pt-4 border-t border-border">
            {!channel?.isDepartment && (
              <button
                onClick={onLeaveChannel}
                className="glass-button px-4 py-2 text-red-500 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Leave Channel
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button onClick={onClose} className="glass-button px-4 py-2">
                Close
              </button>
              {!channel?.isDepartment && (
                <button
                  onClick={handleSave}
                  disabled={updateMembersMutation.isPending}
                  className="glass-button px-4 py-2 text-accent"
                >
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// New DM Modal
function NewDMModal({ isOpen, onClose, users, onSelectUser }) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Direct Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for a user..."
            className="glass-inset"
          />
          <div className="glass-inset p-3 max-h-96 overflow-y-auto space-y-2">
            {filteredUsers.map(user => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user)}
                className="w-full p-2 hover:bg-surface-hover rounded-lg transition-all flex items-center gap-2"
              >
                <div className={`w-8 h-8 rounded-full ${getAvatarColor(user.email)} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-xs font-bold text-white">
                    {getUserInitials(user)}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm">{user.full_name}</p>
                  <p className="text-xs text-foreground-muted">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}