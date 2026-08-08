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
  User,
  Search,
  ChevronLeft,
  ChevronRight,
  Tag,
  Sparkles,
  CreditCard,
  ShoppingBag,
  CheckCircle,
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
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isMobileOptionsMenuOpen, setIsMobileOptionsMenuOpen] = useState(false);
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [isRequestingPayment, setIsRequestingPayment] = useState(false);

  const { data: catalogProducts } = useQuery({
    queryKey: ['products-list'],
    queryFn: async () => {
      const res = await apiClient.get('/catalog');
      return res.data.data;
    },
  });

  const handleRequestPayment = async () => {
    if (!activeConversationId || !paymentAmount) return;
    setIsRequestingPayment(true);
    try {
      await apiClient.post('/catalog/payment-link', {
        conversationId: activeConversationId,
        amount: Number(paymentAmount),
        description: paymentDesc || 'WhatsApp Order Payment',
      });
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentDesc('');
      alert('💳 Razorpay Payment Link dispatched to WhatsApp chat!');
    } catch (err: any) {
      alert(`Payment Request Error: ${err.message}`);
    } finally {
      setIsRequestingPayment(false);
    }
  };

  const handleSendCatalogProduct = async (product: any) => {
    if (!activeConversationId) return;
    try {
      const msgText = `🛍️ *${product.title}*\n\n📌 ${product.description || ''}\n💰 *Price:* ₹${Number(product.priceInINR).toFixed(2)}${product.imageUrl ? `\n\n📸 Image: ${product.imageUrl}` : ''}`;
      await apiClient.post(`/inbox/conversations/${activeConversationId}/messages`, {
        text: msgText,
      });
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setIsCatalogModalOpen(false);
    } catch (err: any) {
      alert(`Send Product Error: ${err.message}`);
    }
  };

  // Fetch Canned Responses
  const { data: cannedResponses } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: async () => {
      const res = await apiClient.get('/canned-responses');
      return res.data.data;
    },
  });

  const isTypingSlash = messageText.includes('/');
  const slashIndex = messageText.lastIndexOf('/');
  const slashQuery = isTypingSlash ? messageText.slice(slashIndex + 1).toLowerCase() : '';

  const filteredCannedResponses = (cannedResponses || []).filter((item: any) =>
    item.shortcut.toLowerCase().includes(slashQuery) ||
    item.title.toLowerCase().includes(slashQuery) ||
    item.message.toLowerCase().includes(slashQuery)
  );

  const applyCannedResponse = (message: string) => {
    if (slashIndex !== -1) {
      const beforeSlash = messageText.slice(0, slashIndex);
      setMessageText(beforeSlash + message);
    } else {
      setMessageText(message);
    }
    setShowQuickReplies(false);
  };

  // Fetch team members for assignment dropdown
  const { data: teamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await apiClient.get('/organization/members');
      return res.data.data;
    },
  });

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Fetch active conversations list with pagination & search
  const { data: convDataResponse, isLoading: loadingConvs } = useQuery({
    queryKey: ['conversations', filterTab, user?.id, contactIdParam, page, search],
    queryFn: async () => {
      const params: any = { page, limit: 50 };
      if (filterTab === 'mine' && user?.id) {
        params.assignedAgentId = user.id;
      }
      if (contactIdParam) {
        params.contactId = contactIdParam;
      }
      if (search.trim()) {
        params.search = search.trim();
      }
      const res = await apiClient.get('/inbox/conversations', { params });
      return res.data.data;
    },
    refetchInterval: 3000,
  });

  const convData = convDataResponse?.conversations || [];
  const totalConvs = convDataResponse?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalConvs / 50));

  // Auto-select conversation ONLY if URL parameter contactId/conversationId is passed (e.g. redirected from Campaign Analytics)
  useEffect(() => {
    if (conversationIdParam) {
      setActiveConversationId(conversationIdParam);
    } else if (contactIdParam && convData && convData.length > 0) {
      const matched = convData.find((c: any) => c.contactId === contactIdParam || c.contact?.id === contactIdParam);
      if (matched) {
        setActiveConversationId(matched.id);
      }
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

  // Status update mutation (e.g. Mark as RESOLVED / CLOSED)
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!activeConversationId) return;
      const res = await apiClient.patch(`/inbox/conversations/${activeConversationId}/status`, {
        status,
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

  const handleAiSuggestReply = async () => {
    if (!activeConversationId) return;
    setIsAiSuggesting(true);
    try {
      const res = await apiClient.post('/ai/suggest-reply', {
        conversationId: activeConversationId,
      });
      if (res.data?.data?.suggestedText) {
        setMessageText(res.data.data.suggestedText);
      }
    } catch (err: any) {
      alert(`AI Suggestion Error: ${err.message}`);
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    noteMutation.mutate();
  };

  const currentConversation = msgData?.conversation || convData?.find((c: any) => c.id === activeConversationId);
  const isWindowExpired = currentConversation?.windowExpiresAt && new Date(currentConversation.windowExpiresAt) < new Date();

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] lg:h-full bg-slate-950 text-slate-100 overflow-hidden relative">
      {/* Left Column: Conversations List */}
      <div className={`w-full md:w-80 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-full overflow-hidden ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-white">Live Inbox</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Realtime
            </span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search contacts by name or phone..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => {
                setFilterTab('all');
                setPage(1);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                filterTab === 'all' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Chats
            </button>
            <button
              onClick={() => {
                setFilterTab('mine');
                setPage(1);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all ${
                filterTab === 'mine' ? 'bg-emerald-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Assigned to Me
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 min-h-0">
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
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 shrink-0 text-sm uppercase shadow-sm">
                  {chat.contact?.firstName?.[0] ? (
                    chat.contact.firstName[0].toUpperCase()
                  ) : chat.contact?.phoneNumber ? (
                    chat.contact.phoneNumber.replace(/\D/g, '').slice(-2)
                  ) : (
                    <User className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-semibold text-sm text-white truncate">
                      {chat.contact?.firstName
                        ? `${chat.contact.firstName} ${chat.contact.lastName || ''}`.trim()
                        : chat.contact?.phoneNumber || 'WhatsApp Contact'}
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
                  
                  {chat.status === 'ESCALATED' ? (
                    <div className="mt-1 flex items-center text-[10px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md w-max animate-pulse">
                      <span>⚠️ Escalated to Live Agent</span>
                    </div>
                  ) : chat.status === 'RESOLVED' || chat.status === 'CLOSED' ? (
                    <div className="mt-1 flex items-center text-[10px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md w-max">
                      <CheckCircle className="w-3 h-3 mr-1 text-emerald-400" />
                      <span>Resolved (AI Active)</span>
                    </div>
                  ) : chat.assignedAgent ? (
                    <div className="mt-1 flex items-center text-[10px] text-slate-400">
                      <UserCheck className="w-3 h-3 mr-1 text-emerald-400" />
                      <span>{chat.assignedAgent.fullName}</span>
                    </div>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Sidebar Pagination Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between text-xs text-slate-400 shrink-0 sticky bottom-0 z-20 shadow-xl">
          <span className="text-[11px] font-medium text-slate-400">
            Page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong> ({totalConvs})
          </span>
          <div className="flex items-center space-x-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-slate-800 border border-slate-700 transition-all cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Active Conversation */}
      <div className={`flex-1 flex flex-col bg-slate-950 min-w-0 h-full overflow-hidden ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
        {activeConversationId && currentConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white shrink-0"
                  title="Back to chat list"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 shrink-0 text-sm uppercase shadow-sm">
                  {currentConversation.contact?.firstName?.[0] ? (
                    currentConversation.contact.firstName[0].toUpperCase()
                  ) : currentConversation.contact?.phoneNumber ? (
                    currentConversation.contact.phoneNumber.replace(/\D/g, '').slice(-2)
                  ) : (
                    <User className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-white text-sm sm:text-base truncate">
                    {currentConversation.contact?.firstName
                      ? `${currentConversation.contact.firstName} ${currentConversation.contact.lastName || ''}`.trim()
                      : currentConversation.contact?.phoneNumber || 'WhatsApp Contact'}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono truncate block">{currentConversation.contact?.phoneNumber}</span>
                </div>
              </div>

              {/* Agent Assignment & Resolution Controls */}
              <div className="flex items-center space-x-2 shrink-0 ml-2">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs text-slate-400 hidden sm:inline">Assigned Agent:</span>
                  <select
                    value={currentConversation.assignedAgentId || ''}
                    onChange={(e) => assignMutation.mutate(e.target.value || null)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-[11px] sm:text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium max-w-[110px] sm:max-w-none truncate"
                  >
                    <option value="">Unassigned (AI Active)</option>
                    {teamMembers?.map((member: any) => (
                      <option key={member.user.id} value={member.user.id}>
                        {member.user.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                {currentConversation.status === 'RESOLVED' || currentConversation.status === 'CLOSED' ? (
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Resolved</span>
                  </span>
                ) : (
                  <button
                    onClick={() => statusMutation.mutate('RESOLVED')}
                    disabled={statusMutation.isPending}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-xl text-[11px] sm:text-xs flex items-center space-x-1 transition-all shadow-sm cursor-pointer shrink-0"
                    title="Mark query as resolved & return to AI Auto-Responder"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Resolved</span>
                  </button>
                )}
              </div>
            </div>

            {/* 24-Hour Customer Service Window Warning Banner */}
            {isWindowExpired && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-amber-300 shrink-0">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>24-Hour Customer Service Window Expired. Free-form messaging disabled.</span>
                </div>
                <button
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs transition-all shrink-0 ml-3"
                >
                  Send Template
                </button>
              </div>
            )}

            {/* Tabs Bar */}
            <div className="px-6 bg-slate-900/50 border-b border-slate-800 flex space-x-6 shrink-0">
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

            {/* Content Body Container */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              {activeTab === 'messages' ? (
                <>
                  {/* Messages Feed */}
                  <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
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

                  {/* Static Fixed Bottom Input Bar */}
                  <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 flex items-center space-x-2 sm:space-x-3 sticky bottom-0 z-20 shrink-0 backdrop-blur-md relative">
                    {/* Quick Reply Autocomplete Popup Menu */}
                    {(showQuickReplies || (isTypingSlash && filteredCannedResponses.length > 0)) && (
                      <div className="absolute bottom-full mb-2 left-3 right-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-30 animate-fadeIn">
                        <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                            <Tag className="w-3.5 h-3.5 mr-1.5" />
                            / Quick Reply Snippets Autocomplete
                          </span>
                          <span className="text-[10px] text-slate-500">Click snippet to insert</span>
                        </div>

                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/60">
                          {filteredCannedResponses.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-500">
                              No matching quick replies found. Add snippets in Settings!
                            </div>
                          ) : (
                            filteredCannedResponses.map((item: any) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => applyCannedResponse(item.message)}
                                className="w-full text-left p-3 hover:bg-slate-800/80 transition-all flex items-start justify-between group cursor-pointer"
                              >
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono text-xs font-bold text-emerald-400 group-hover:text-emerald-300">
                                      /{item.shortcut}
                                    </span>
                                    <span className="text-xs font-semibold text-white">
                                      {item.title}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                    {item.message}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 shrink-0 ml-2">
                                  Use
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mobile Consolidated Quick Actions Menu */}
                    {isMobileOptionsMenuOpen && (
                      <div className="absolute bottom-full mb-2 left-3 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-30 p-2 space-y-1 min-w-[210px] animate-fadeIn">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1 border-b border-slate-800 flex justify-between items-center">
                          <span>Chat Actions Menu</span>
                          <button type="button" onClick={() => setIsMobileOptionsMenuOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            handleAiSuggestReply();
                            setIsMobileOptionsMenuOpen(false);
                          }}
                          disabled={isAiSuggesting}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-purple-300 hover:bg-purple-500/10 flex items-center space-x-2 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                          <span>{isAiSuggesting ? 'AI Thinking...' : '✨ AI Copilot Suggestion'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowQuickReplies(!showQuickReplies);
                            setIsMobileOptionsMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 flex items-center space-x-2 transition-all cursor-pointer font-mono"
                        >
                          <Tag className="w-4 h-4 text-emerald-400" />
                          <span>⚡ Quick Replies (/)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsPaymentModalOpen(true);
                            setIsMobileOptionsMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10 flex items-center space-x-2 transition-all cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 text-emerald-400" />
                          <span>💳 Request Payment Link</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsCatalogModalOpen(true);
                            setIsMobileOptionsMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-blue-300 hover:bg-blue-500/10 flex items-center space-x-2 transition-all cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4 text-blue-400" />
                          <span>🛍️ Send Product Catalog</span>
                        </button>
                      </div>
                    )}

                    {/* Single Mobile Options Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsMobileOptionsMenuOpen(!isMobileOptionsMenuOpen)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer sm:hidden shrink-0 ${
                        isMobileOptionsMenuOpen
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-purple-300 border-slate-700'
                      }`}
                      title="Chat Tools & Actions Menu"
                    >
                      ⚡
                    </button>

                    {/* Desktop Toolbar Buttons (Hidden on small mobile screens) */}
                    <button
                      type="button"
                      onClick={() => setShowQuickReplies(!showQuickReplies)}
                      className={`hidden sm:flex p-2.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                        showQuickReplies
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title="Insert Quick Reply / Snippet"
                    >
                      /
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="hidden sm:flex p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 font-bold text-xs items-center space-x-1.5 transition-all cursor-pointer shrink-0"
                      title="Request Razorpay Payment Link in WhatsApp Chat"
                    >
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Pay Link</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCatalogModalOpen(true)}
                      className="hidden sm:flex p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 text-blue-300 font-bold text-xs items-center space-x-1.5 transition-all cursor-pointer shrink-0"
                      title="Send Product Catalog Item"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
                      <span>Catalog</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAiSuggestReply}
                      disabled={isAiSuggesting}
                      className="hidden sm:flex p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 font-bold text-xs items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                      title="Gemini AI Smart Copilot Suggestion"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                      <span>{isAiSuggesting ? 'AI Thinking...' : 'AI Copilot'}</span>
                    </button>

                    {/* Attachment, Input Field, and Send Button remain visible on all screen sizes */}
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
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer text-xs shrink-0"
                      title="Attach Image / Document"
                    >
                      📎
                    </button>

                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onBlur={() => {
                        setTimeout(() => {
                          window.scrollTo(0, 0);
                          document.body.scrollTop = 0;
                        }, 50);
                      }}
                      placeholder="Type your reply or '/' for quick snippets..."
                      className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 sm:px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-sans"
                    />
                    <button
                      type="submit"
                      disabled={sendMutation.isPending || !messageText.trim()}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold p-2.5 rounded-xl shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Internal Notes Feed */}
                  <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3">
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
                  <form onSubmit={handleAddNote} className="p-3 sm:p-4 bg-slate-900/95 border-t border-slate-800 flex items-center space-x-2 sm:space-x-3 sticky bottom-0 z-20 shrink-0 backdrop-blur-md">
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
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all text-xs flex items-center shrink-0"
                    >
                      <Plus className="w-4 h-4 mr-1 stroke-[3]" />
                      Add Note
                    </button>
                  </form>
                </>
              )}
            </div>

            {/* Template Modal */}
            <SendTemplateModal
              isOpen={isTemplateModalOpen}
              onClose={() => setIsTemplateModalOpen(false)}
              conversationId={activeConversationId}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 shadow-xl">
              <MessageSquare className="w-8 h-8 stroke-[1.5]" />
            </div>
            <div className="max-w-sm space-y-1">
              <h3 className="font-bold text-white text-base">Select a Conversation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Click on any contact from the list on the left to view message history and send customer replies.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Razorpay Payment Link Modal ── */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-emerald-400" />
                <span>Request Razorpay Payment Link</span>
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Amount in INR (₹) *
                </label>
                <input
                  type="number"
                  placeholder="500.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Order / Item Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5L Desi Ghee Order"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestPayment}
                disabled={isRequestingPayment || !paymentAmount}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isRequestingPayment ? 'Generating Link...' : 'Dispatch Payment Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Product Catalog Picker Modal ── */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center">
                <ShoppingBag className="w-5 h-5 mr-2 text-blue-400" />
                <span>Select Product to Send</span>
              </h3>
              <button onClick={() => setIsCatalogModalOpen(false)} className="text-slate-400 hover:text-white text-xs">
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {!catalogProducts || catalogProducts.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">No products in catalog. Add products in Product Catalog page first!</p>
              ) : (
                catalogProducts.map((product: any) => (
                  <div
                    key={product.id}
                    onClick={() => handleSendCatalogProduct(product)}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl flex items-center justify-between transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.title} className="w-10 h-10 rounded-lg object-cover border border-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
                          🛍️
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-white text-xs">{product.title}</h4>
                        <p className="text-[10px] text-slate-400 truncate max-w-xs">{product.description || 'No description'}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-emerald-400 text-xs shrink-0">₹{Number(product.priceInINR).toFixed(2)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
