
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Paperclip, Search, X, User, Hash, Plus, Settings as SettingsIcon, Pin, Smile, Reply, Users as UsersIcon, Edit, Trash2 } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
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

export default function Messages() {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [viewMode, setViewMode] = useState("all"); // "all", "direct", "channels"
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const internalUsers = allUsers.filter(u => 
    (u.user_type === 'internal' || u.role === 'admin') && 
    u.email !== currentUser?.email
  );

  // Fetch all messages involving the current user
  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 5000), // Increased limit for more messages
    refetchInterval: 3000, // Poll every 3 seconds for new messages
    enabled: !!currentUser,
  });

  // Initialize department channels on first load
  useEffect(() => {
    if (currentUser && allUsers.length > 0 && messages.length === 0) { // Only attempt if no messages exist yet
      const existingDeptChannels = messages
        .filter(m => m.is_department_channel && m.conversation_type === 'channel')
        .map(m => m.department);

      DEPARTMENTS.forEach(dept => {
        if (!existingDeptChannels.includes(dept)) {
          const allInternalEmails = allUsers
            .filter(u => u.user_type === 'internal' || u.role === 'admin')
            .map(u => u.email);

          // Check if a message for this department channel already exists before creating
          const departmentChannelMessageExists = messages.some(
            m => m.conversation_id === `dept_${dept.toLowerCase()}` && m.is_department_channel
          );

          if (!departmentChannelMessageExists) {
            base44.entities.Message.create({
              content: `Welcome to the ${dept} department channel!`,
              sender_email: currentUser.email,
              sender_name: 'System', // System sender for initial message
              conversation_id: `dept_${dept.toLowerCase()}`,
              conversation_type: 'channel',
              channel_name: `${dept} Department`,
              channel_description: `Official channel for ${dept} department`,
              channel_members: allInternalEmails,
              is_department_channel: true,
              department: dept,
              read_by: [], // Mark as unread for everyone initially
            })
            .then(() => {
              queryClient.invalidateQueries({ queryKey: ['messages'] });
            })
            .catch(error => {
              console.error(`Failed to create initial message for ${dept} channel:`, error);
            });
          }
        }
      });
    }
  }, [currentUser, allUsers, messages.length, queryClient]);


  // Get unique conversations (direct + channels)
  const conversations = React.useMemo(() => {
    if (!currentUser) return [];
    
    const convMap = new Map();
    
    messages.forEach(msg => {
      if (msg.conversation_type === 'channel') {
        // Channel message
        if (msg.channel_members?.includes(currentUser.email)) {
          const convId = msg.conversation_id;
          
          // Only update if it's a newer message or if the conversation hasn't been added yet
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
        }
      } else {
        // Direct message
        const otherUserEmail = msg.sender_email === currentUser.email ? msg.receiver_email : msg.sender_email;
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
    return true;
  });

  // Get messages for selected conversation
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
          if (currentUser && !readBy.includes(currentUser.email)) {
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

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (selectedConversation && currentUser) {
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
  }, [selectedConversation, conversationMessages, currentUser, markAsReadMutation]); // Added markAsReadMutation to dependency array

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversationMessages]);

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      setMessageText("");
      setReplyingTo(null);
    },
  });

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConversation || !currentUser) return;

    // Extract @mentions
    const mentionRegex = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|@(\S+)/g; // Match full email or just part of name/email
    const mentions = new Set(); // Use a Set to avoid duplicate mentions
    let match;
    while ((match = mentionRegex.exec(messageText)) !== null) {
      const mentionText = match[1] || match[2]; // Use the full email or the second group
      
      const mentionedUser = allUsers.find(u => 
        u.full_name?.toLowerCase().includes(mentionText.toLowerCase()) ||
        u.email?.toLowerCase().includes(mentionText.toLowerCase())
      );
      if (mentionedUser) {
        mentions.add(mentionedUser.email);
      }
    }

    const messageData = {
      content: messageText,
      sender_email: currentUser.email,
      sender_name: currentUser.full_name,
      conversation_id: selectedConversation.id,
      conversation_type: selectedConversation.type,
      mentioned_users: Array.from(mentions),
      reply_to_message_id: replyingTo?.id,
    };

    if (selectedConversation.type === 'channel') {
      messageData.channel_name = selectedConversation.name;
      messageData.channel_description = selectedConversation.description;
      messageData.channel_members = selectedConversation.members;
      messageData.is_department_channel = selectedConversation.isDepartment;
      messageData.department = selectedConversation.department;
      messageData.read_by = [currentUser.email]; // Sender automatically reads their own message
    } else {
      // Direct message
      messageData.receiver_email = selectedConversation.otherUser.email; // Ensure receiver email is set for direct
      messageData.is_read = false;
    }

    sendMessageMutation.mutate(messageData);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation || !currentUser) return;

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
      };

      if (selectedConversation.type === 'channel') {
        messageData.channel_name = selectedConversation.name;
        messageData.channel_description = selectedConversation.description;
        messageData.channel_members = selectedConversation.members;
        messageData.is_department_channel = selectedConversation.isDepartment;
        messageData.department = selectedConversation.department;
        messageData.read_by = [currentUser.email];
      } else {
        messageData.receiver_email = selectedConversation.otherUser.email;
        messageData.is_read = false;
      }

      await sendMessageMutation.mutateAsync(messageData);
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the input so same file can be selected again
      }
    }
  };

  const startNewConversation = (user) => {
    // Determine a consistent conversation ID for direct messages
    const convId = [currentUser.email, user.email].sort().join('_');
    setSelectedConversation({
      id: convId,
      type: 'direct',
      otherUser: user,
      lastMessage: null, // This will be updated once a message is sent/received
      unreadCount: 0
    });
    setSearchQuery(""); // Clear search when starting a new conversation
  };

  const addReactionMutation = useMutation({
    mutationFn: ({ messageId, emoji }) => {
      const msg = messages.find(m => m.id === messageId);
      const reactions = msg?.reactions || {};
      const emojiReactions = reactions[emoji] || [];
      
      if (emojiReactions.includes(currentUser.email)) {
        // Remove reaction
        reactions[emoji] = emojiReactions.filter(e => e !== currentUser.email);
        if (reactions[emoji].length === 0) delete reactions[emoji];
      } else {
        // Add reaction
        reactions[emoji] = [...emojiReactions, currentUser.email];
      }
      
      return base44.entities.Message.update(messageId, { reactions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: ({ messageId, isPinned }) => {
      return base44.entities.Message.update(messageId, { is_pinned: !isPinned });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const formatMessageTime = (date) => {
    const msgDate = new Date(date);
    if (isToday(msgDate)) {
      return format(msgDate, 'HH:mm');
    } else if (isYesterday(msgDate)) {
      return 'Yesterday';
    } else {
      return format(msgDate, 'dd/MM/yy');
    }
  };

  const filteredUsers = internalUsers.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

  const pinnedMessages = conversationMessages.filter(m => m.is_pinned);

  return (
    <div className="space-y-4">
      <CreateChannelModal
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        currentUser={currentUser}
        allUsers={internalUsers}
      />

      {selectedConversation?.type === 'channel' && (
        <ChannelSettingsModal
          isOpen={showChannelSettings}
          onClose={() => setShowChannelSettings(false)}
          channel={selectedConversation}
          allUsers={internalUsers}
          currentUser={currentUser}
          messages={messages} // Pass messages for updating all related messages
        />
      )}

      {/* Header */}
      <div className="glass p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-accent" />
            <div>
              <h1 className="text-xl font-bold">Messages</h1>
              <p className="text-xs text-foreground-muted">Chat with your team</p>
            </div>
            {totalUnread > 0 && (
              <span className="ml-2 bg-accent text-accent-foreground px-3 py-1 rounded-full text-sm font-bold">
                {totalUnread} unread
              </span>
            )}
          </div>
          <Button onClick={() => setShowCreateChannel(true)} className="glass-button px-4 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Channel</span>
          </Button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="glass overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 h-full">
          {/* Conversations List */}
          <div className="border-r border-border h-full flex flex-col">
            {/* Filter Tabs */}
            <div className="p-2 border-b border-border flex gap-1">
              <button
                onClick={() => setViewMode('all')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all ${viewMode === 'all' ? 'glass-elevated' : 'hover:bg-surface-hover'}`}
              >
                All
              </button>
              <button
                onClick={() => setViewMode('direct')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all ${viewMode === 'direct' ? 'glass-elevated' : 'hover:bg-surface-hover'}`}
              >
                Direct
              </button>
              <button
                onClick={() => setViewMode('channels')}
                className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all ${viewMode === 'channels' ? 'glass-elevated' : 'hover:bg-surface-hover'}`}
              >
                Channels
              </button>
            </div>

            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-muted" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="glass-inset pl-10"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {searchQuery ? (
                <div className="p-2">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => {
                        startNewConversation(user);
                        setSearchQuery("");
                      }}
                      className="w-full p-3 hover:bg-surface-hover rounded-lg transition-all flex items-center gap-3"
                    >
                      <div className={`w-10 h-10 rounded-full ${getAvatarColor(user.email)} flex items-center justify-center flex-shrink-0`}>
                        <span className="text-sm font-bold text-white">
                          {getUserInitials(user)}
                        </span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium truncate">{user.full_name}</p>
                        <p className="text-xs text-foreground-muted truncate">{user.job_title || user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-2">
                  {filteredConversations.length === 0 ? (
                    <div className="text-center py-8 px-4">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-foreground-subtle" />
                      <p className="text-sm text-foreground-muted mb-2">No conversations yet</p>
                      <p className="text-xs text-foreground-subtle">Search for a colleague or create a channel</p>
                    </div>
                  ) : (
                    filteredConversations.map(conv => (
                      <button
                        key={conv.id}
                        onClick={() => setSelectedConversation(conv)}
                        className={`w-full p-3 rounded-lg transition-all flex items-center gap-3 ${
                          selectedConversation?.id === conv.id ? 'bg-accent text-accent-foreground' : 'hover:bg-surface-hover'
                        }`}
                      >
                        {conv.type === 'channel' ? (
                          <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0">
                            <Hash className="w-5 h-5 text-accent" />
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-full ${getAvatarColor(conv.otherUser?.email)} flex items-center justify-center flex-shrink-0`}>
                            <span className="text-sm font-bold text-white">
                              {getUserInitials(conv.otherUser)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium truncate">
                              {conv.type === 'channel' ? conv.name : conv.otherUser?.full_name}
                            </p>
                            {conv.lastMessage?.created_date && (
                              <span className="text-xs text-foreground-subtle flex-shrink-0 ml-2">
                                {formatMessageTime(conv.lastMessage.created_date)}
                              </span>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-semibold' : 'text-foreground-muted'}`}>
                              {conv.lastMessage.sender_email === currentUser?.email ? 'You: ' : `${conv.lastMessage.sender_name || conv.lastMessage.sender_email}: `}
                              {conv.lastMessage.content}
                            </p>
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="col-span-2 flex flex-col h-full">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selectedConversation.type === 'channel' ? (
                      <>
                        <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center">
                          <Hash className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-bold">{selectedConversation.name}</p>
                          <p className="text-xs text-foreground-muted">{selectedConversation.members?.length || 0} members</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`w-10 h-10 rounded-full ${getAvatarColor(selectedConversation.otherUser?.email)} flex items-center justify-center`}>
                          <span className="text-sm font-bold text-white">
                            {getUserInitials(selectedConversation.otherUser)}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold">{selectedConversation.otherUser?.full_name}</p>
                          <p className="text-xs text-foreground-muted">{selectedConversation.otherUser?.job_title || 'Team Member'}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedConversation.type === 'channel' && (
                      <Button onClick={() => setShowChannelSettings(true)} className="glass-button p-2">
                        <SettingsIcon className="w-4 h-4" />
                      </Button>
                    )}
                    <Button className="glass-button p-2 md:hidden" onClick={() => setSelectedConversation(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Pinned Messages */}
                {pinnedMessages.length > 0 && (
                  <div className="p-2 border-b border-border bg-surface-elevated">
                    <div className="flex items-center gap-2 text-xs text-foreground-muted mb-2">
                      <Pin className="w-3 h-3" />
                      <span>Pinned Messages</span>
                    </div>
                    {pinnedMessages.map(msg => (
                      <div key={msg.id} className="glass-inset p-2 mb-1 text-xs">
                        <span className="font-semibold">{msg.sender_name}:</span> {msg.content}
                      </div>
                    ))}
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversationMessages.map(msg => {
                    const isMine = msg.sender_email === currentUser?.email;
                    const replyToMsg = msg.reply_to_message_id ? messages.find(m => m.id === msg.reply_to_message_id) : null;
                    
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] ${isMine ? 'bg-accent text-accent-foreground' : 'glass-flat'} rounded-lg p-3 group`}>
                          {selectedConversation.type === 'channel' && !isMine && (
                            <p className="text-xs font-semibold mb-1">{msg.sender_name}</p>
                          )}
                          
                          {replyToMsg && (
                            <div className="glass-inset p-2 mb-2 text-xs opacity-70 rounded">
                              <p className="font-semibold">{replyToMsg.sender_name}</p>
                              <p className="truncate">{replyToMsg.content}</p>
                            </div>
                          )}

                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          
                          {msg.attachment_urls && msg.attachment_urls.length > 0 && (
                            <div className="mt-2">
                              {msg.attachment_urls.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs underline block hover:opacity-80"
                                >
                                  View attachment
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Reactions */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(msg.reactions).map(([emoji, users]) => (
                                <button
                                  key={emoji}
                                  onClick={() => currentUser && addReactionMutation.mutate({ messageId: msg.id, emoji })}
                                  className={`glass-inset px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                                    currentUser && users.includes(currentUser.email) ? 'ring-1 ring-accent' : ''
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span>{users.length}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <p className={`text-[10px] ${isMine ? 'text-accent-foreground opacity-70' : 'text-foreground-subtle'}`}>
                              {format(new Date(msg.created_date), 'HH:mm')}
                            </p>
                            
                            {/* Message Actions */}
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="glass-button p-1 rounded">
                                    <Smile className="w-3 h-3" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  {EMOJI_LIST.map(emoji => (
                                    <DropdownMenuItem
                                      key={emoji}
                                      onClick={() => currentUser && addReactionMutation.mutate({ messageId: msg.id, emoji })}
                                    >
                                      {emoji}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              
                              <button
                                onClick={() => setReplyingTo(msg)}
                                className="glass-button p-1 rounded"
                                title="Reply"
                              >
                                <Reply className="w-3 h-3" />
                              </button>
                              
                              {selectedConversation.type === 'channel' && (
                                <button
                                  onClick={() => togglePinMutation.mutate({ messageId: msg.id, isPinned: msg.is_pinned })}
                                  className="glass-button p-1 rounded"
                                  title={msg.is_pinned ? "Unpin" : "Pin"}
                                >
                                  <Pin className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-border">
                  {replyingTo && (
                    <div className="glass-inset p-2 mb-2 flex items-center justify-between rounded">
                      <div className="text-xs">
                        <p className="font-semibold">Replying to {replyingTo.sender_name}</p>
                        <p className="text-foreground-muted truncate">{replyingTo.content}</p>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="glass-button p-1">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="glass-button p-2"
                      disabled={isUploading}
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Input
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                      placeholder={selectedConversation.type === 'channel' ? `Message #${selectedConversation.name}` : "Type a message..."}
                      className="glass-inset flex-1"
                      disabled={isUploading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      className="glass-button px-4 py-2 text-accent"
                      disabled={!messageText.trim() || sendMessageMutation.isPending || isUploading}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-foreground-subtle mt-1">
                    Tip: Use @name or @email to mention someone
                  </p>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-foreground-subtle" />
                  <h3 className="text-lg font-bold mb-2">Select a conversation</h3>
                  <p className="text-sm text-foreground-muted">Choose a person or channel to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getUserInitials(user) {
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
}

function getAvatarColor(email) {
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
}

function CreateChannelModal({ isOpen, onClose, currentUser, allUsers }) {
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const queryClient = useQueryClient();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setChannelName("");
      setDescription("");
      setSelectedMembers([]);
    } else if (currentUser) {
      setSelectedMembers([currentUser.email]); // Current user is always a member
    }
  }, [isOpen, currentUser]);


  const createChannelMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      onClose();
    },
  });

  const handleCreate = () => {
    if (!channelName.trim() || !currentUser) return;

    const members = Array.from(new Set([currentUser.email, ...selectedMembers])); // Ensure currentUser is always a member and no duplicates
    const convId = `channel_${Date.now()}`; // Unique ID for the channel

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
      read_by: [currentUser.email], // Sender has read the initial message
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
            <label className="block text-sm mb-2 font-medium">Channel Name</label>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="e.g., Project Updates, Team Social"
              className="glass-inset"
            />
          </div>
          <div>
            <label className="block text-sm mb-2 font-medium">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              className="glass-inset"
            />
          </div>
          <div>
            <label className="block text-sm mb-2 font-medium">Add Members</label>
            <div className="glass-inset p-3 max-h-48 overflow-y-auto space-y-2 rounded">
              {allUsers.map(user => (
                <label key={user.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(user.email) || user.email === currentUser?.email}
                    onChange={(e) => {
                      if (user.email === currentUser?.email) return; // Prevent unchecking current user
                      if (e.target.checked) {
                        setSelectedMembers([...selectedMembers, user.email]);
                      } else {
                        setSelectedMembers(selectedMembers.filter(email => email !== user.email));
                      }
                    }}
                    disabled={user.email === currentUser?.email} // Disable checkbox for current user
                    className="form-checkbox h-4 w-4 text-accent rounded"
                  />
                  <span className="text-sm">{user.full_name} {user.email === currentUser?.email && "(You)"}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} className="glass-button px-4 py-2">
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!channelName.trim() || createChannelMutation.isPending}
              className="glass-button px-4 py-2 text-accent"
            >
              Create Channel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChannelSettingsModal({ isOpen, onClose, channel, allUsers, currentUser, messages }) {
  const [members, setMembers] = useState(channel?.members || []);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (channel) {
      setMembers(channel.members || []);
    }
  }, [channel]);

  const updateMembersMutation = useMutation({
    mutationFn: async (newMembers) => {
      // Find all messages belonging to this channel
      const channelMessages = messages.filter(msg => msg.conversation_id === channel.id);
      
      const updatePromises = channelMessages.map(msg =>
        base44.entities.Message.update(msg.id, { channel_members: newMembers })
      );
      
      return Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      onClose(); // Close modal after successful update
    },
  });

  const handleSave = () => {
    updateMembersMutation.mutate(members);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Channel Settings: {channel?.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-foreground-muted mb-2">{channel?.description}</p>
          </div>
          {!channel?.isDepartment && (
            <div>
              <label className="block text-sm mb-2 font-medium">Members</label>
              <div className="glass-inset p-3 max-h-64 overflow-y-auto space-y-2 rounded">
                {allUsers.map(user => (
                  <label key={user.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={members.includes(user.email)}
                      onChange={(e) => {
                        if (user.email === currentUser?.email) return; // Prevent unchecking current user
                        if (e.target.checked) {
                          setMembers([...members, user.email]);
                        } else {
                          setMembers(members.filter(email => email !== user.email));
                        }
                      }}
                      disabled={user.email === currentUser?.email} // Disable checkbox for current user
                      className="form-checkbox h-4 w-4 text-accent rounded"
                    />
                    <span className="text-sm">{user.full_name} {user.email === currentUser?.email && "(You)"}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {channel?.isDepartment && (
            <p className="text-sm text-foreground-muted">
              This is a department channel. All internal staff members have access.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} className="glass-button px-4 py-2">
              Close
            </Button>
            {!channel?.isDepartment && (
              <Button
                onClick={handleSave}
                disabled={updateMembersMutation.isPending}
                className="glass-button px-4 py-2 text-accent"
              >
                Save Changes
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
