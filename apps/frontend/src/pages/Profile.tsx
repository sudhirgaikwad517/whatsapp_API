import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, Building, LifeBuoy, Plus, Send, ShieldCheck, Key, CheckCircle2, Clock, MessageSquare, AlertCircle } from 'lucide-react';
import { apiClient } from '../services/api.client';
import { useAuthStore } from '../store/auth.store';

export const Profile: React.FC = () => {
  const { user, setAuth, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'profile' | 'support'>('profile');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('TECHNICAL');
  const [ticketPriority, setTicketPriority] = useState('MEDIUM');
  const [ticketDesc, setTicketDesc] = useState('');
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');

  // Fetch Organization Profile
  const { data: orgData } = useQuery({
    queryKey: ['organization-profile'],
    queryFn: async () => {
      const res = await apiClient.get('/organization');
      return res.data.data;
    },
  });

  // Fetch Client Support Tickets
  const { data: ticketsData } = useQuery({
    queryKey: ['client-support-tickets'],
    queryFn: async () => {
      const res = await apiClient.get('/support-tickets');
      return res.data.data;
    },
  });

  const createTicketMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/support-tickets', {
        subject: ticketSubject,
        category: ticketCategory,
        priority: ticketPriority,
        description: ticketDesc,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-support-tickets'] });
      setIsNewTicketModalOpen(false);
      setTicketSubject('');
      setTicketDesc('');
      toast.success('Support ticket raised successfully!', { description: 'Our support engineering team will respond shortly.' });
    },
    onError: (err: any) => {
      toast.error('Failed to raise ticket', { description: err.message });
    },
  });

  const replyTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      const res = await apiClient.post(`/support-tickets/${ticketId}/reply`, {
        message: replyMessage,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-support-tickets'] });
      setReplyMessage('');
    },
    onError: (err: any) => {
      toast.error('Failed to send reply', { description: err.message });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put('/auth/profile', { fullName });
      return res.data.data;
    },
    onSuccess: (data) => {
      if (user) setAuth({ ...user, fullName: data.fullName });
      toast.success('Profile updated successfully!');
    },
    onError: (err: any) => {
      toast.error('Failed to update profile', { description: err?.response?.data?.message || err.message });
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put('/auth/change-email', { currentPassword, newEmail: email });
      return res.data.data;
    },
    onSuccess: (data) => {
      if (user) setAuth({ ...user, email: data.email });
      setCurrentPassword('');
      toast.success('Email updated! Please verify your new address.', {
        description: 'We sent a verification link to your new email inbox.',
      });
    },
    onError: (err: any) => {
      toast.error('Failed to update email', { description: err?.response?.data?.message || err.message });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put('/auth/change-password', { currentPassword, newPassword });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Password changed successfully!', { description: 'Please log in again with your new password.' });
      setCurrentPassword('');
      setNewPassword('');
      logout();
    },
    onError: (err: any) => {
      toast.error('Failed to change password', { description: err?.response?.data?.message || err.message });
    },
  });

  const handleSaveProfile = () => {
    const isSaving = updateProfileMutation.isPending || changeEmailMutation.isPending || changePasswordMutation.isPending;
    if (isSaving) return;

    const nameChanged = fullName.trim() && fullName.trim() !== user?.fullName;
    const emailChanged = email.trim() && email.trim() !== user?.email;
    const wantsPasswordChange = !!newPassword;

    if ((emailChanged || wantsPasswordChange) && !currentPassword) {
      toast.error('Current password required', { description: 'Enter your current password to change email or password.' });
      return;
    }

    if (nameChanged) updateProfileMutation.mutate();
    if (emailChanged) changeEmailMutation.mutate();
    if (wantsPasswordChange) changePasswordMutation.mutate();

    if (!nameChanged && !emailChanged && !wantsPasswordChange) {
      toast.info('Nothing to save', { description: 'Make a change first.' });
    }
  };

  const selectedTicket = Array.isArray(ticketsData)
    ? ticketsData.find((t: any) => t.id === activeTicketId)
    : null;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8 bg-slate-950 text-slate-100 w-full max-w-full overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <User className="w-8 h-8 text-emerald-400" />
            <span>Account Profile & Support Portal</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your personal profile details, organization settings, and raise priority support tickets.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Profile Details
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'support'
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LifeBuoy className="w-4 h-4" />
            Support Tickets ({Array.isArray(ticketsData) ? ticketsData.length : 0})
          </button>
        </div>
      </div>

      {/* ── TAB 1: User & Organization Profile ── */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Column 1 & 2: Personal Details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
                <User className="w-5 h-5 text-emerald-400" />
                <span>Personal Account Details</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  {user?.email && email.trim() !== user.email && (
                    <p className="text-[10px] text-amber-400 mt-1">Changing this requires your current password and re-verification.</p>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 space-y-4">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Security & Password</span>
                </h3>
                <p className="text-[10px] text-slate-500 -mt-2">
                  Required only when changing your email or setting a new password.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending || changeEmailMutation.isPending || changePasswordMutation.isPending}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 text-xs transition-all cursor-pointer disabled:opacity-50"
                >
                  {updateProfileMutation.isPending || changeEmailMutation.isPending || changePasswordMutation.isPending
                    ? 'Saving...'
                    : 'Save Profile Changes'}
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Organization Details Card */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
                <Building className="w-5 h-5 text-emerald-400" />
                <span>Organization Summary</span>
              </h2>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px]">Organization Name</span>
                  <span className="font-bold text-white text-base">{orgData?.name || 'Prowexa Tenant'}</span>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px]">Subscription Tier</span>
                  <span className="inline-block bg-purple-500/10 text-purple-400 border border-purple-500/30 px-3 py-1 rounded-full font-bold uppercase mt-1">
                    {orgData?.planTier || 'PRO TIER'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px]">System Role</span>
                  <span className="font-semibold text-slate-200 uppercase">{user?.role || 'ORGANIZATION_ADMIN'}</span>
                </div>

                <div>
                  <span className="text-slate-400 uppercase font-semibold block text-[10px]">Account ID</span>
                  <span className="font-mono text-slate-400 break-all">{user?.organizationId}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: Support Ticket Center ── */}
      {activeTab === 'support' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Support Ticket Center</h2>
              <p className="text-xs text-slate-400">Raise support tickets directly to Prowexa Platform System Engineers.</p>
            </div>

            <button
              onClick={() => setIsNewTicketModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Raise Support Ticket
            </button>
          </div>

          {/* Ticket Grid & Selected Ticket Message Thread */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Tickets List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
                Your Support Tickets
              </h3>

              {Array.isArray(ticketsData) && ticketsData.length > 0 ? (
                ticketsData.map((ticket: any) => (
                  <div
                    key={ticket.id}
                    onClick={() => setActiveTicketId(ticket.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2 ${
                      activeTicketId === ticket.id
                        ? 'bg-slate-800 border-emerald-500/50 shadow-md'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-emerald-400 font-bold">{ticket.ticketNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          ticket.status === 'RESOLVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : ticket.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white line-clamp-1">{ticket.subject}</h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Priority: <strong className="text-slate-200">{ticket.priority}</strong></span>
                      <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No support tickets raised yet.
                </div>
              )}
            </div>

            {/* Right: Selected Ticket Detail & Chat Thread */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl min-h-[400px] flex flex-col">
              {selectedTicket ? (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
                    <div>
                      <span className="font-mono text-xs text-emerald-400 font-bold">{selectedTicket.ticketNumber}</span>
                      <h3 className="text-lg font-bold text-white">{selectedTicket.subject}</h3>
                    </div>
                    <span className="bg-slate-800 text-slate-300 text-xs font-bold px-3 py-1 rounded-lg uppercase">
                      Status: {selectedTicket.status}
                    </span>
                  </div>

                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto space-y-3 p-2">
                    {selectedTicket.messages?.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-xl text-xs space-y-1 max-w-[85%] ${
                          msg.senderType === 'USER'
                            ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-100 ml-auto'
                            : 'bg-slate-950 border border-slate-800 text-slate-200 mr-auto'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1">
                          <span className="font-bold uppercase text-emerald-400">
                            {msg.senderType === 'USER' ? 'You' : '🛡️ Prowexa SuperAdmin Support'}
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input Box */}
                  <div className="pt-4 border-t border-slate-800 flex gap-3 shrink-0">
                    <input
                      type="text"
                      placeholder="Type reply message to support team..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && replyMessage && replyTicketMutation.mutate(selectedTicket.id)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => replyMessage && replyTicketMutation.mutate(selectedTicket.id)}
                      disabled={replyTicketMutation.isPending || !replyMessage}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
                  <LifeBuoy className="w-12 h-12 text-slate-700" />
                  <p className="text-xs">Select a ticket from the left list to view response thread or raise a new ticket.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Raise New Support Ticket ── */}
      {isNewTicketModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-emerald-400" />
                <span>Raise Priority Support Ticket</span>
              </h3>
              <button onClick={() => setIsNewTicketModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 uppercase font-semibold mb-1">Subject / Issue Title</label>
                <input
                  type="text"
                  placeholder="e.g. WhatsApp Template Approval Delay"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 uppercase font-semibold mb-1">Category</label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="TECHNICAL">Technical & Webhooks</option>
                    <option value="BILLING">Billing & Payments</option>
                    <option value="META_WABA">Meta WhatsApp Approval</option>
                    <option value="AI_COPILOT">AI Copilot & Bots</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 uppercase font-semibold mb-1">Priority</label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent / Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 uppercase font-semibold mb-1">Detailed Description</label>
                <textarea
                  rows={4}
                  placeholder="Explain what issue you are facing..."
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsNewTicketModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => createTicketMutation.mutate()}
                disabled={createTicketMutation.isPending || !ticketSubject || !ticketDesc}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                Submit Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
