import React, { useState, useEffect, useRef } from 'react';
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
  X,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { apiClient } from '../services/api.client';
import { useAuthStore } from '../store/auth.store';
import { SendTemplateModal } from '../components/inbox/SendTemplateModal';
import { AddContactModal } from '../components/contacts/AddContactModal';
import { confirmAction } from '../components/ui/ConfirmDialog';

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
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);

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
      if (activeConversationId) pollNewMessages(activeConversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentDesc('');
      toast.success('Razorpay payment link dispatched to WhatsApp chat!');
    } catch (err: any) {
      toast.error('Payment request failed', { description: err.message });
    } finally {
      setIsRequestingPayment(false);
    }
  };

  const handleSendCatalogProduct = async (product: any) => {
    if (!activeConversationId) return;
    try {
      const caption = `🛍️ *${product.title}*\n\n📌 ${product.description || ''}\n💰 *Price:* ₹${Number(product.priceInINR).toFixed(2)}`;
      if (product.imageUrl) {
        // Send as a real WhatsApp image message (with the product details as
        // the caption) rather than pasting the image URL as plain text —
        // customers get an actual photo card, not a raw link.
        await apiClient.post(`/inbox/conversations/${activeConversationId}/media`, {
          type: 'IMAGE',
          mediaUrl: product.imageUrl,
          caption,
        });
      } else {
        await apiClient.post(`/inbox/conversations/${activeConversationId}/messages`, {
          text: caption,
        });
      }
      if (activeConversationId) pollNewMessages(activeConversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setIsCatalogModalOpen(false);
    } catch (err: any) {
      toast.error('Failed to send product', { description: err.message });
    }
  };

  const handleAttachFile = async (file: File) => {
    if (!activeConversationId) return;
    setIsAttaching(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      let mediaUrl: string;
      let waType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';

      if (file.type.startsWith('image/')) {
        // Images go through the compression endpoint — it also normalizes
        // to JPEG, which is what WhatsApp's outbound image type requires.
        const res = await apiClient.post('/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        mediaUrl = res.data.data.url;
        waType = 'IMAGE';
      } else {
        // Video/audio/documents are stored as-is (Sharp can't process them).
        const res = await apiClient.post('/media/upload-raw', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        mediaUrl = res.data.data.url;
        waType = file.type.startsWith('video/') ? 'VIDEO' : file.type.startsWith('audio/') ? 'AUDIO' : 'DOCUMENT';
      }

      await apiClient.post(`/inbox/conversations/${activeConversationId}/media`, {
        type: waType,
        mediaUrl,
        filename: file.name,
      });
      if (activeConversationId) pollNewMessages(activeConversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (err: any) {
      toast.error('Failed to attach file', { description: err.response?.data?.error?.message || err.message });
    } finally {
      setIsAttaching(false);
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
  const { data: convDataResponse, isLoading: loadingConvs, isError: convError, refetch: refetchConvs } = useQuery({
    // contactIdParam is intentionally NOT part of this key — it only drives
    // a one-time "ensure a conversation exists for this deep-linked contact"
    // side effect in queryFn below, never a result filter. Including it here
    // used to make React Query treat every single chat click as a brand new,
    // uncached query (the sidebar wrote contactId into the URL on every
    // click), which reset the whole list's scroll position back to the top
    // each time an agent picked a different chat.
    queryKey: ['conversations', filterTab, user?.id, page, search],
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

  // Messages for the selected conversation — a single deduped-by-id list,
  // synced incrementally instead of re-fetching "the latest 50" on every 3s
  // poll. A fixed "latest N" window slides forward as new messages arrive;
  // combined with manually-loaded older history, that used to silently drop
  // whatever fell out of the middle (e.g. messages 51-60 vanish once the
  // live window slides from [51-100] to [61-110] after 10 new messages
  // arrive, since neither the "older" batch nor the new live batch contains
  // them). Polling for only what's newer than the last message we already
  // have, and merging rather than replacing, means nothing already on
  // screen can ever fall out of view.
  const [messages, setMessages] = useState<any[]>([]);
  const [msgConversationMeta, setMsgConversationMeta] = useState<any>(null);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [msgError, setMsgError] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const messagesRef = useRef<any[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Auto-scroll: jump straight to the newest message when a conversation is
  // opened/switched (instead of leaving the view parked at the oldest one,
  // which needed a long manual scroll), and keep following new messages as
  // they arrive — but only while the agent is already near the bottom, so
  // scrolling up to read older history isn't yanked back down by a poll tick.
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const justSwitchedConvRef = useRef(false);

  useEffect(() => {
    justSwitchedConvRef.current = true;
    isNearBottomRef.current = true;
  }, [activeConversationId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || messages.length === 0) return;
    const forceJump = justSwitchedConvRef.current;
    if (forceJump || isNearBottomRef.current) {
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: forceJump ? 'auto' : 'smooth' });
      });
    }
    justSwitchedConvRef.current = false;
  }, [messages]);

  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  };

  const mergeMessages = (prev: any[], incoming: any[], prepend: boolean) => {
    if (incoming.length === 0) return prev;
    const existingIds = new Set(prev.map((m) => m.id));
    const fresh = incoming.filter((m) => !existingIds.has(m.id));
    if (fresh.length === 0) return prev;
    return prepend ? [...fresh, ...prev] : [...prev, ...fresh];
  };

  const fetchInitialMessages = async (convId: string) => {
    setLoadingMsgs(true);
    setMsgError(false);
    try {
      const res = await apiClient.get(`/inbox/conversations/${convId}/messages`);
      setMessages(res.data.data.messages || []);
      setMsgConversationMeta(res.data.data.conversation || null);
      setHasMoreOlder(Boolean(res.data.data.hasMore));
    } catch {
      setMsgError(true);
    } finally {
      setLoadingMsgs(false);
    }
  };

  const pollNewMessages = async (convId: string) => {
    const current = messagesRef.current;
    try {
      const params: any = {};
      if (current.length > 0) {
        params.after = current[current.length - 1].createdAt;
      }
      const res = await apiClient.get(`/inbox/conversations/${convId}/messages`, { params });
      setMessages((prev) => mergeMessages(prev, res.data.data.messages || [], false));
      if (current.length === 0) {
        setMsgConversationMeta(res.data.data.conversation || null);
        setHasMoreOlder(Boolean(res.data.data.hasMore));
      }
    } catch {
      // Silent — a transient poll failure shouldn't disrupt the open chat;
      // the next 3s tick tries again.
    }
  };

  useEffect(() => {
    setMessages([]);
    setMsgConversationMeta(null);
    setHasMoreOlder(false);
    if (activeConversationId) {
      fetchInitialMessages(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    if (!activeConversationId) return;
    const interval = setInterval(() => pollNewMessages(activeConversationId), 3000);
    return () => clearInterval(interval);
  }, [activeConversationId]);

  // For status changes on messages already on screen (delivered → read,
  // etc.) — pollNewMessages only ever adds messages newer than the last one
  // it has, so it can't pick up a status flip on an existing message.
  // Re-fetches the latest page and merges by id, UPDATING any row that
  // already exists (as well as adding genuinely new ones) instead of either
  // ignoring status changes or blindly replacing state (which would drop
  // any earlier history the user had paged back into).
  const refreshRecentMessageStatuses = async (convId: string) => {
    try {
      const res = await apiClient.get(`/inbox/conversations/${convId}/messages`);
      setMsgConversationMeta(res.data.data.conversation || null);
      const latest = res.data.data.messages || [];
      if (latest.length === 0) return;
      setMessages((prev) => {
        const byId = new Map(prev.map((m) => [m.id, m]));
        for (const m of latest) byId.set(m.id, m);
        return Array.from(byId.values()).sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
    } catch {
      // silent — the periodic poll or next socket event will catch up
    }
  };

  const allMessages = messages;
  const loadOlderMessages = async () => {
    const oldest = messagesRef.current[0];
    if (!activeConversationId || !oldest) return;
    setLoadingOlder(true);
    try {
      const res = await apiClient.get(`/inbox/conversations/${activeConversationId}/messages`, {
        params: { before: oldest.createdAt, limit: 50 },
      });
      setMessages((prev) => mergeMessages(prev, res.data.data.messages || [], true));
      setHasMoreOlder(Boolean(res.data.data.hasMore));
    } catch (err: any) {
      toast.error('Failed to load older messages', { description: err.response?.data?.error?.message || err.message });
    } finally {
      setLoadingOlder(false);
    }
  };

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

  // Keep track of active conversation without re-binding socket events
  const activeConvRef = useRef(activeConversationId);
  useEffect(() => {
    activeConvRef.current = activeConversationId;
  }, [activeConversationId]);

  // Realtime Socket.IO Connection
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  useEffect(() => {
    if (!isAuthenticated) return;

    const isProduction = (import.meta as any).env.MODE === 'production';
    const apiUrl = (import.meta as any).env.VITE_API_URL || (isProduction ? 'https://api.wabtic.com' : 'http://localhost:5050');
    // No token is passed explicitly — the httpOnly auth cookie is sent
    // automatically with the connection handshake (withCredentials: true).
    const socket = io(apiUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('new_message', () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (activeConvRef.current) {
        pollNewMessages(activeConvRef.current);
      }
    });

    socket.on('message_status_update', () => {
      if (activeConvRef.current) {
        refreshRecentMessageStatuses(activeConvRef.current);
      }
    });

    // Fired after Clear Chat or a disappearing-messages sweep — reload from
    // scratch (not merge) since messages were actually deleted, not just
    // added/updated.
    socket.on('conversation_cleared', (payload: { conversationId: string }) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (activeConvRef.current && activeConvRef.current === payload.conversationId) {
        fetchInitialMessages(activeConvRef.current);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient, isAuthenticated]);

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
      if (activeConversationId) pollNewMessages(activeConversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: any) => {
      toast.error('Failed to send message', { description: err.response?.data?.error?.message || err.message });
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
    onError: (err: any) => {
      toast.error('Failed to save note', { description: err.response?.data?.error?.message || err.message });
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
      // Reassignment doesn't add a new message — it changes the
      // conversation's own assignedAgent, which pollNewMessages doesn't
      // refresh once messages already exist.
      if (activeConversationId) refreshRecentMessageStatuses(activeConversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: any) => {
      toast.error('Failed to reassign conversation', { description: err.response?.data?.error?.message || err.message });
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
      if (activeConversationId) refreshRecentMessageStatuses(activeConversationId);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (err: any) => {
      toast.error('Failed to update conversation status', { description: err.response?.data?.error?.message || err.message });
    },
  });

  // WhatsApp-style "Clear Chat" — wipes message history for this
  // conversation on our side (customer's own device is unaffected).
  const clearChatMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId) return;
      await apiClient.delete(`/inbox/conversations/${activeConversationId}/messages`);
    },
    onSuccess: () => {
      setMessages([]);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Chat cleared.');
    },
    onError: (err: any) => {
      toast.error('Failed to clear chat', { description: err.response?.data?.error?.message || err.message });
    },
  });

  const disappearingMutation = useMutation({
    mutationFn: async (durationSeconds: number) => {
      if (!activeConversationId) return;
      const res = await apiClient.patch(`/inbox/conversations/${activeConversationId}/disappearing-messages`, {
        durationSeconds,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data) setMsgConversationMeta((prev: any) => (prev ? { ...prev, disappearingMessagesSeconds: data.disappearingMessagesSeconds } : prev));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success('Disappearing messages updated.');
    },
    onError: (err: any) => {
      toast.error('Failed to update disappearing messages', { description: err.response?.data?.error?.message || err.message });
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
      toast.error('AI suggestion failed', { description: err.message });
    } finally {
      setIsAiSuggesting(false);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    noteMutation.mutate();
  };

  const currentConversation = msgConversationMeta || convData?.find((c: any) => c.id === activeConversationId);
  const isWindowExpired = currentConversation?.windowExpiresAt && new Date(currentConversation.windowExpiresAt) < new Date();
  // A plain agent has no access to a chat assigned to someone else — the
  // backend already rejects any send/resolve attempt with a 403, this just
  // avoids showing them a working-looking input box that will only error.
  const isLockedToOtherAgent =
    user?.role === 'AGENT' &&
    !!currentConversation?.assignedAgentId &&
    currentConversation.assignedAgentId !== user?.id;

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

          {/* Filter Tabs — a plain AGENT only ever sees their own assigned
              chats (backend-enforced), so the All/Mine toggle would just
              show the same list twice; hide it for that role. */}
          {user?.role !== 'AGENT' && (
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
          )}
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
                onClick={() => setActiveConversationId(chat.id)}
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
            <div className="p-3 sm:p-4 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white shrink-0"
                  title="Back to chat list"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 shrink-0 text-xs sm:text-sm uppercase shadow-sm">
                  {currentConversation.contact?.firstName?.[0] ? (
                    currentConversation.contact.firstName[0].toUpperCase()
                  ) : currentConversation.contact?.phoneNumber ? (
                    currentConversation.contact.phoneNumber.replace(/\D/g, '').slice(-2)
                  ) : (
                    <User className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-white text-xs sm:text-base truncate">
                    {currentConversation.contact?.firstName
                      ? `${currentConversation.contact.firstName} ${currentConversation.contact.lastName || ''}`.trim()
                      : currentConversation.contact?.phoneNumber || 'WhatsApp Contact'}
                  </h3>
                  <span className="text-[11px] sm:text-xs text-slate-400 font-mono truncate block">{currentConversation.contact?.phoneNumber}</span>
                </div>
              </div>

              {/* Agent Assignment & Resolution Controls */}
              <div className="flex items-center justify-between sm:justify-end space-x-2 shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-slate-800/60 sm:border-t-0">
                <div className="flex items-center space-x-1.5 flex-1 sm:flex-initial min-w-0">
                  <span className="text-[11px] sm:text-xs text-slate-400 hidden sm:inline shrink-0">Agent:</span>
                  {user?.role === 'BUSINESS_OWNER' || user?.role === 'MANAGER' ? (
                    <select
                      value={currentConversation.assignedAgentId || ''}
                      onChange={(e) => assignMutation.mutate(e.target.value || null)}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 sm:px-2.5 sm:py-1.5 text-[11px] sm:text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-medium w-full sm:w-auto truncate"
                    >
                      <option value="">Unassigned (AI Active)</option>
                      {teamMembers?.map((member: any) => (
                        <option key={member.user.id} value={member.user.id}>
                          {member.user.fullName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    // A plain agent can't reassign chats — show who it's
                    // assigned to as read-only text instead of a dropdown.
                    <span className="text-[11px] sm:text-xs text-slate-300 font-medium truncate">
                      {currentConversation.assignedAgent?.fullName || 'Unassigned (AI Active)'}
                    </span>
                  )}
                </div>

                {currentConversation.status === 'RESOLVED' || currentConversation.status === 'CLOSED' ? (
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold px-2.5 py-1 sm:py-1.5 rounded-xl flex items-center space-x-1 shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Resolved</span>
                  </span>
                ) : user?.role === 'AGENT' && currentConversation.assignedAgentId && currentConversation.assignedAgentId !== user?.id ? (
                  // Assigned to a different agent — this agent has no access to act on it at all.
                  <span
                    className="bg-slate-800 border border-slate-700 text-slate-500 text-[11px] font-bold px-2.5 py-1 sm:py-1.5 rounded-xl flex items-center space-x-1 shrink-0"
                    title="This chat is assigned to another agent."
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Assigned to Other Agent</span>
                  </span>
                ) : (
                  <button
                    onClick={() => statusMutation.mutate('RESOLVED')}
                    disabled={statusMutation.isPending}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs flex items-center space-x-1 transition-all shadow-sm cursor-pointer shrink-0 active:scale-95"
                    title="Mark query as resolved & return to AI Auto-Responder"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Mark Resolved</span>
                  </button>
                )}

                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsMoreMenuOpen((v) => !v)}
                    className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                    title="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {isMoreMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsMoreMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-30 py-1.5">
                        <button
                          onClick={() => {
                            setIsMoreMenuOpen(false);
                            setIsEditingContact(true);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center text-xs text-slate-200 transition-all"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2 text-emerald-400 shrink-0" />
                          Edit Contact
                        </button>

                        <div className="px-3 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                          Disappearing Messages
                        </div>
                        {[
                          { label: 'Off', value: 0 },
                          { label: '24 Hours', value: 24 * 60 * 60 },
                          { label: '7 Days', value: 7 * 24 * 60 * 60 },
                          { label: '90 Days', value: 90 * 24 * 60 * 60 },
                        ].map((opt) => {
                          const isActive = (currentConversation.disappearingMessagesSeconds || 0) === opt.value;
                          return (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setIsMoreMenuOpen(false);
                                disappearingMutation.mutate(opt.value);
                              }}
                              className={`w-full text-left px-3 py-2 hover:bg-slate-800 flex items-center justify-between text-xs transition-all ${
                                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-200'
                              }`}
                            >
                              <span>{opt.label}</span>
                              {isActive && <Check className="w-3.5 h-3.5" />}
                            </button>
                          );
                        })}

                        <div className="border-t border-slate-800 mt-1.5 pt-1.5">
                          <button
                            onClick={async () => {
                              setIsMoreMenuOpen(false);
                              const ok = await confirmAction({
                                title: 'Clear this chat?',
                                message: 'All messages in this conversation will be permanently deleted from your Inbox. This only clears your side — it does not affect the customer\'s own WhatsApp.',
                                danger: true,
                                confirmLabel: 'Clear Chat',
                              });
                              if (ok) clearChatMutation.mutate();
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-rose-500/10 flex items-center text-xs text-rose-400 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                            Clear Chat
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
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
                  <div ref={messagesContainerRef} onScroll={handleMessagesScroll} className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                    {loadingMsgs ? (
                      <div className="text-center text-xs text-slate-500">Loading thread history...</div>
                    ) : msgError ? (
                      <div className="text-center text-xs text-rose-400 space-y-2 py-8">
                        <p>Failed to load messages.</p>
                        <button
                          onClick={() => activeConversationId && fetchInitialMessages(activeConversationId)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    ) : (
                      <>
                      {hasMoreOlder && (
                        <div className="text-center pb-2">
                          <button
                            onClick={loadOlderMessages}
                            disabled={loadingOlder}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingOlder ? 'Loading...' : 'Load older messages'}
                          </button>
                        </div>
                      )}
                      {allMessages.map((msg: any) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-md min-w-0 px-4 py-2.5 rounded-2xl text-sm shadow-md break-words ${
                              msg.direction === 'OUTBOUND'
                                ? 'bg-emerald-600 text-white rounded-br-none'
                                : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                            }`}
                          >
                            {msg.content?.headerMediaUrl && (
                              <img
                                src={msg.content.headerMediaUrl}
                                alt="Header"
                                onClick={() => setViewingImageUrl(msg.content.headerMediaUrl)}
                                className="rounded-lg max-h-48 w-full object-cover mb-2 border border-emerald-400/30 cursor-pointer hover:opacity-90 transition-opacity"
                              />
                            )}
                            {msg.type === 'IMAGE' && msg.content?.mediaUrl ? (
                              <div className="space-y-1">
                                <img
                                  src={msg.content.mediaUrl}
                                  alt="Attachment"
                                  onClick={() => setViewingImageUrl(msg.content.mediaUrl)}
                                  className="rounded-lg max-h-48 object-cover border border-emerald-400/30 cursor-pointer hover:opacity-90 transition-opacity"
                                />
                                {msg.content.caption && <p className="text-xs mt-1 break-words">{msg.content.caption}</p>}
                              </div>
                            ) : msg.type === 'DOCUMENT' && msg.content?.mediaUrl ? (
                              <a href={msg.content.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center space-x-2 text-xs underline font-mono">
                                📎 <span>{msg.content.filename || 'Download Document'}</span>
                              </a>
                            ) : msg.type === 'AUDIO' && msg.content?.mediaUrl ? (
                              <audio controls src={msg.content.mediaUrl} className="max-w-full" style={{ height: 36 }} />
                            ) : msg.type === 'VIDEO' && msg.content?.mediaUrl ? (
                              <video controls src={msg.content.mediaUrl} className="rounded-lg max-h-56 max-w-full" />
                            ) : msg.type === 'INTERACTIVE' && (msg.content?.buttons || msg.content?.listRows) ? (
                              <div className="space-y-1.5">
                                <p className="whitespace-pre-line break-words">{msg.content?.text}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {(msg.content?.buttons || msg.content?.listRows || []).map((opt: any) => (
                                    <span
                                      key={opt.id}
                                      className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-black/15 border border-white/20"
                                    >
                                      {opt.title}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-line break-words">{msg.content?.text || (msg.type === 'TEMPLATE' ? `[Template: ${msg.content?.templateName}]` : '[Media Content]')}</p>
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
                      ))}
                      </>
                    )}
                  </div>

                  {/* Static Fixed Bottom Input Bar — locked out entirely for
                      an agent viewing a chat assigned to someone else. */}
                  {isLockedToOtherAgent ? (
                    <div className="p-4 bg-slate-900/95 border-t border-slate-800 sticky bottom-0 z-20 shrink-0 backdrop-blur-md flex items-center justify-center gap-2 text-xs text-slate-500 font-semibold">
                      <UserCheck className="w-4 h-4" />
                      <span>This chat is assigned to another agent — you can't reply here.</span>
                    </div>
                  ) : (
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
                    <input
                      ref={attachInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,video/mp4,video/3gpp,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAttachFile(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={isAttaching}
                      onClick={() => attachInputRef.current?.click()}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer text-xs shrink-0 disabled:opacity-50"
                      title="Attach Image / Video / Audio / Document"
                    >
                      {isAttaching ? '⏳' : '📎'}
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
                  )}
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
                          <p className="text-xs text-slate-200 leading-relaxed break-words">{note.content}</p>
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
                      disabled={isLockedToOtherAgent}
                      placeholder={isLockedToOtherAgent ? "This chat is assigned to another agent." : "Add a private internal note for your team..."}
                      className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isLockedToOtherAgent || noteMutation.isPending || !noteText.trim()}
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
                  placeholder="e.g. 2x Product Bundle Order"
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

      {isEditingContact && currentConversation?.contact && (
        <AddContactModal
          isOpen={isEditingContact}
          editContact={currentConversation.contact}
          onClose={() => setIsEditingContact(false)}
          onSaved={() => {
            if (activeConversationId) refreshRecentMessageStatuses(activeConversationId);
          }}
        />
      )}

      {viewingImageUrl && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewingImageUrl(null)}
        >
          <button
            onClick={() => setViewingImageUrl(null)}
            className="absolute top-4 right-4 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={viewingImageUrl}
            alt="Full size attachment"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
};
