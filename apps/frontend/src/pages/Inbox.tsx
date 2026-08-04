import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  MessageSquare,
  Clock,
  UserCheck,
  StickyNote,
  FileCode2,
  Plus,
  Check,
  CheckCheck,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { apiClient } from '../services/api.client';
import { useAuthStore } from '../store/auth.store';
import { SendTemplateModal } from '../components/inbox/SendTemplateModal';

export const Inbox: React.FC = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const contactIdParam = searchParams.get('contactId');
  const conversationIdParam = searchParams.get('conversationId');

  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversationIdParam);
  const [filterTab, setFilterTab] = useState<'all' | 'mine'>('all');
  const [activeTab, setActiveTab] = useState<'messages' | 'notes'>('messages');

  const [messageText, setMessageText] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Fetch team members for assignment dropdown
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await apiClient.get('/organization/members');
      return res.data.data;
    },
  });

  // Fetch active conversations list
  const { data: convData, isLoading: loadingConvs } = useQuery({
    queryKey: ['conversations', filterTab, user?.id, contactIdParam],
    queryFn: async () => {
      const params: any = {};
      if (filterTab === 'mine' && user?.id) {
        params.assignedAgentId = user.id;
      }
      if (contactIdParam) {
        params.contactId = contactIdParam;
      }
      const res = await apiClient.get('/inbox/conversations', { params });
      return res.data.data.conversations;
    },
    refetchInterval: 3000,
  });

  // Auto-select conversation based on URL parameters (only on initial load or URL change)
  useEffect(() => {
    if (conversationIdParam) {
      setActiveConversationId(conversationIdParam);
    } else if (contactIdParam && convData && convData.length > 0) {
      const matched = convData.find((c: any) => c.contactId === contactIdParam || c.contact?.id === contactIdParam);
      if (matched) {
        setActiveConversationId(matched.id);
      }
    } else if (!activeConversationId && convData && convData.length > 0) {
      setActiveConversationId(convData[0].id);
    }
  }, [contactIdParam, conversationIdParam, convData?.length]);

  // Fetch messages for selected conversation
  const { data: msgData, isLoading: loadingMsgs } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return null;
      const res = await apiClient.get(`/inbox/conversations/${activeConversationId}/messages`);
      return res.data.data;
    },
    enabled: !!activeConversationId,
    refetchInterval: 3000,
  });

  // Fetch internal notes for selected conversation
  const { data: notesData, isLoading: loadingNotes } = useQuery({
    queryKey: ['notes', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];
      const res = await apiClient.get(`/inbox/conversations/${activeConversationId}/notes`);
      return res.data.data;
    },
    enabled: !!activeConversationId && activeTab === 'notes',
  });

  // Realtime Socket.IO Connection
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const socket = io('http://localhost:5050', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('new_message', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
    });

    socket.on('message_status_update', () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
    });

    return () => {
      socket.disconnect();
    };
  }, [activeConversationId, queryClient]);

  // Outbound message mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId || !messageText.trim()) return;
      const res = await apiClient.post(`/inbox/conversations/${activeConversationId}/messages`, {
        text: messageText,
      });
      return res.data.data;
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: any) => {
      alert(`❌ Failed to send message: ${err.response?.data?.error?.message || err.message}`);
    },
  });

  // Internal Note mutation
  const noteMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId || !noteText.trim()) return;
      const res = await apiClient.post(`/inbox/conversations/${activeConversationId}/notes`, {
        content: noteText,
      });
      return res.data.data;
    },
    onSuccess: () => {
      setNoteText('');
      queryClient.invalidateQueries({ queryKey: ['notes', activeConversationId] });
    },
  });

  // Assign agent mutation
  const assignMutation = useMutation({
    mutationFn: async (agentId: string | null) => {
      if (!activeConversationId) return;
      const res = await apiClient.patch(`/inbox/conversations/${activeConversationId}/assign`, {
        agentId,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMutation.mutate();
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    noteMutation.mutate();
  };

  const currentConversation = msgData?.conversation;
  const isWindowExpired = currentConversation?.windowExpiresAt && new Date(currentConversation.windowExpiresAt) < new Date();

  return (
    <div className="flex h-full bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Left Column: Conversations List */}
      <div className={`w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-white">Live Inbox</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Realtime
            </span>
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setFilterTab('all')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                filterTab === 'all' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Chats
            </button>
            <button
              onClick={() => setFilterTab('mine')}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                filterTab === 'mine' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Assigned to Me
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {loadingConvs ? (
            <div className="p-6 text-center text-xs text-slate-500">Loading chats...</div>
          ) : convData?.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">No active conversations found.</div>
          ) : (
            convData?.map((chat: any) => (
              <button
                key={chat.id}
                onClick={() => {
                  setActiveConversationId(chat.id);
                  setSearchParams({ contactId: chat.contactId });
                }}
                className={`w-full p-4 text-left hover:bg-slate-800/50 transition-all flex items-start space-x-3 ${
                  activeConversationId === chat.id ? 'bg-slate-800 border-l-4 border-emerald-500' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 shrink-0">
                  {chat.contact?.firstName?.[0] || chat.contact?.phoneNumber?.[1] || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-semibold text-sm text-white truncate">
                      {chat.contact?.firstName ? `${chat.contact.firstName} ${chat.contact.lastName || ''}` : chat.contact?.phoneNumber}
                    </h4>
                    {chat.lastMessageAt && (
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                        {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-slate-400 truncate flex-1 pr-2">{chat.lastMessageSnippet || 'No messages yet'}</p>
                    {chat.unreadCount > 0 && (
                      <span className="bg-emerald-500 text-slate-950 font-extrabold text-[11px] px-2 py-0.5 rounded-full shrink-0 shadow-md animate-pulse">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                  
                  {chat.assignedAgent && (
                    <div className="mt-1 flex items-center text-[10px] text-slate-400">
                      <UserCheck className="w-3 h-3 mr-1 text-emerald-400" />
                      <span>{chat.assignedAgent.fullName}</span>
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Column: Active Conversation */}
      <div className={`flex-1 flex flex-col bg-slate-950 min-w-0 ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {activeConversationId && currentConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white shrink-0"
                  title="Back to chat list"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400 shrink-0">
                  {currentConversation.contact?.firstName?.[0] || currentConversation.contact?.phoneNumber?.[1] || '?'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm sm:text-base truncate">
                    {currentConversation.contact?.firstName ? `${currentConversation.contact.firstName} ${currentConversation.contact.lastName || ''}` : currentConversation.contact?.phoneNumber}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono truncate block">{currentConversation.contact?.phoneNumber}</span>
                </div>
              </div>

              {/* Agent Assignment Selector */}
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Assigned Agent:</span>
                <select
                  value={currentConversation.assignedAgentId || ''}
                  onChange={(e) => assignMutation.mutate(e.target.value || null)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="">Unassigned</option>
                  {teamMembers?.map((member: any) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 24-Hour Customer Service Window Warning Banner */}
            {isWindowExpired && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    <strong>24-Hour Service Window Expired:</strong> Customer has not messaged in 24 hours. You must use an approved Meta Template to reply.
                  </span>
                </div>
                <button
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="bg-amber-500 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs hover:bg-amber-400 transition-all shrink-0 ml-4"
                >
                  Select Template
                </button>
              </div>
            )}

            {/* Sub-tabs Bar (Messages vs Internal Notes) */}
            <div className="border-b border-slate-800 bg-slate-900/40 px-6 flex space-x-6 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('messages')}
                className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
                  activeTab === 'messages'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Customer Thread</span>
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                className={`py-3 flex items-center space-x-2 border-b-2 transition-all ${
                  activeTab === 'notes'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <StickyNote className="w-3.5 h-3.5" />
                <span>Internal Notes</span>
              </button>
            </div>

            {/* Content Body */}
            {activeTab === 'messages' ? (
              <>
                {/* Messages Feed */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {loadingMsgs ? (
                    <div className="text-center text-xs text-slate-500">Loading thread history...</div>
                  ) : (
                    msgData?.messages?.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md px-4 py-2.5 rounded-2xl text-sm shadow-md ${
                            msg.direction === 'OUTBOUND'
                              ? 'bg-emerald-600 text-white rounded-br-none'
                              : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                          }`}
                        >
                          {msg.content?.headerMediaUrl && (
                            <img src={msg.content.headerMediaUrl} alt="Header" className="rounded-lg max-h-48 w-full object-cover mb-2 border border-emerald-400/30" />
                          )}
                          {msg.type === 'IMAGE' && msg.content?.mediaUrl ? (
                            <div className="space-y-1">
                              <img src={msg.content.mediaUrl} alt="Attachment" className="rounded-lg max-h-48 object-cover border border-emerald-400/30" />
                              {msg.content.caption && <p className="text-xs mt-1">{msg.content.caption}</p>}
                            </div>
                          ) : msg.type === 'DOCUMENT' && msg.content?.mediaUrl ? (
                            <a href={msg.content.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-xs underline font-mono">
                              📎 <span>{msg.content.filename || 'Download Document'}</span>
                            </a>
                          ) : (
                            <p className="whitespace-pre-line">{msg.content?.text || (msg.type === 'TEMPLATE' ? `[Template: ${msg.content?.templateName}]` : '[Media Content]')}</p>
                          )}
                          <div className="flex items-center justify-end space-x-1.5 mt-1 text-[10px] opacity-90">
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.direction === 'OUTBOUND' && (
                              <span>
                                {msg.status === 'ACCEPTED' ? (
                                  <Clock className="w-3 h-3 text-slate-300" />
                                ) : msg.status === 'SENT' ? (
                                  <Check className="w-3.5 h-3.5 text-slate-200" />
                                ) : msg.status === 'DELIVERED' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-slate-200" />
                                ) : msg.status === 'READ' || msg.status === 'REPLIED' ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-300 drop-shadow-sm font-bold" />
                                ) : msg.status === 'FAILED' ? (
                                  <span title={msg.errorMessage || 'Meta dispatch error'}>
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 cursor-help" />
                                  </span>
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-slate-200" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-800 flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={async () => {
                      const url = prompt('Enter Image / Document URL to attach:');
                      if (!url) return;
                      try {
                        await apiClient.post(`/inbox/conversations/${activeConversationId}/media`, {
                          type: 'IMAGE',
                          mediaUrl: url,
                          filename: 'Attachment.jpg',
                        });
                        queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
                        queryClient.invalidateQueries({ queryKey: ['conversations'] });
                      } catch (err: any) {
                        alert(`Failed to attach media: ${err.message}`);
                      }
                    }}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                    title="Attach Image / Document"
                  >
                    📎
                  </button>

                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-sans"
                  />
                  <button
                    type="submit"
                    disabled={sendMutation.isPending || !messageText.trim()}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* Internal Notes Feed */}
                <div className="flex-1 p-6 overflow-y-auto space-y-3">
                  {loadingNotes ? (
                    <div className="text-center text-xs text-slate-500">Loading team notes...</div>
                  ) : notesData?.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 py-12">No internal notes for this conversation yet.</div>
                  ) : (
                    notesData?.map((note: any) => (
                      <div key={note.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-emerald-400">{note.author?.fullName || 'Agent'}</span>
                          <span className="text-slate-500 text-[10px]">{new Date(note.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{note.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Note Input Bar */}
                <form onSubmit={handleAddNote} className="p-4 bg-slate-900 border-t border-slate-800 flex items-center space-x-3">
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add a private internal note for your team..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={noteMutation.isPending || !noteText.trim()}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all text-xs flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1 stroke-[3]" />
                    Add Note
                  </button>
                </form>
              </>
            )}

            {/* Template Modal */}
            <SendTemplateModal
              isOpen={isTemplateModalOpen}
              onClose={() => setIsTemplateModalOpen(false)}
              conversationId={activeConversationId}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3">
            <MessageSquare className="w-12 h-12 stroke-1" />
            <p className="text-sm">Select a conversation from the sidebar to view thread</p>
          </div>
        )}
      </div>
    </div>
  );
};
