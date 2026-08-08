import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Link2, ShieldCheck, CheckCircle, RefreshCw, Bot, Plus, Trash2, Tag, CreditCard } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const Settings: React.FC = () => {
  const [wabaId, setWabaId] = useState('2251442372294214');
  const [phoneNumberId, setPhoneNumberId] = useState('1181142285092556');
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('+1 (555) 667-7453');
  const [accessToken, setAccessToken] = useState('');
  const [aiKnowledgeBase, setAiKnowledgeBase] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isAiAutoRespondEnabled, setIsAiAutoRespondEnabled] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');
  const [msg, setMsg] = useState('');

  const queryClient = useQueryClient();

  const { data: orgData } = useQuery({
    queryKey: ['org-details'],
    queryFn: async () => {
      const res = await apiClient.get('/organization');
      return res.data.data;
    },
  });

  React.useEffect(() => {
    if (orgData) {
      if (orgData.aiKnowledgeBase) setAiKnowledgeBase(orgData.aiKnowledgeBase);
      if (orgData.geminiApiKey) setGeminiApiKey(orgData.geminiApiKey);
      if (orgData.isAiAutoRespondEnabled !== undefined) setIsAiAutoRespondEnabled(orgData.isAiAutoRespondEnabled);
      if (orgData.razorpayKeyId) setRazorpayKeyId(orgData.razorpayKeyId);
    }
  }, [orgData]);

  const saveKbMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/organization', {
        aiKnowledgeBase,
        geminiApiKey,
        isAiAutoRespondEnabled,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-details'] });
      alert('🤖 AI Knowledgebase & Auto-Responder Settings saved successfully!');
    },
    onError: (err: any) => {
      alert(`Failed to save AI settings: ${err.message}`);
    },
  });

  const saveRazorpayMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/organization', {
        razorpayKeyId,
        razorpayKeySecret,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-details'] });
      alert('💳 Razorpay API Credentials stored securely!');
    },
    onError: (err: any) => {
      alert(`Failed to save Razorpay Credentials: ${err.message}`);
    },
  });

  // Fetch account health status
  const { data: healthData } = useQuery({
    queryKey: ['whatsapp-health'],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/health');
      return res.data.data;
    },
  });

  // Prefill existing settings when healthData loads
  React.useEffect(() => {
    if (healthData) {
      if (healthData.wabaId) setWabaId(healthData.wabaId);
      if (healthData.phoneNumberId) setPhoneNumberId(healthData.phoneNumberId);
      if (healthData.displayPhoneNumber) setDisplayPhoneNumber(healthData.displayPhoneNumber);
    }
  }, [healthData]);

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/whatsapp/connect', {
        wabaId: wabaId.trim(),
        phoneNumberId: phoneNumberId.trim(),
        displayPhoneNumber: displayPhoneNumber.trim(),
        accessToken: accessToken.trim(),
      });
      return res.data.data;
    },
    onSuccess: async () => {
      setMsg('WhatsApp Account connected successfully!');
      try {
        await apiClient.post('/whatsapp/templates/sync');
        queryClient.invalidateQueries({ queryKey: ['whatsapp-health'] });
        queryClient.invalidateQueries({ queryKey: ['templates-list'] });
        alert('✅ Success! Credentials saved & Meta Templates automatically synced and purged!');
      } catch {
        alert('✅ Success! Meta Credentials saved successfully!');
      }
      setAccessToken('');
    },
    onError: (err: any) => {
      alert(`❌ Failed to save: ${err.response?.data?.error?.message || err.message}`);
    },
  });

  // Sync templates mutation
  const syncTemplatesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/whatsapp/templates/sync');
      return res.data.data;
    },
    onSuccess: (data) => {
      setMsg(`Synced ${data.syncedCount} templates from Meta Graph API!`);
    },
  });

  // Fetch Canned Responses
  const { data: cannedResponses } = useQuery({
    queryKey: ['canned-responses'],
    queryFn: async () => {
      const res = await apiClient.get('/canned-responses');
      return res.data.data;
    },
  });

  // Delete Canned Response mutation
  const deleteCannedMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/canned-responses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['canned-responses'] });
    },
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 w-full min-w-0">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Organization & Meta Setup</h1>
        <p className="text-sm text-slate-400 mt-1">Official WhatsApp Business Cloud API Integration</p>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl flex items-center">
          <CheckCircle className="w-5 h-5 mr-3 shrink-0" />
          {msg}
        </div>
      )}

      {connectMutation.isError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl">
          {(connectMutation.error as any)?.response?.data?.error?.message || 'Failed to save Meta credentials.'}
        </div>
      )}

      {/* Account Status Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white">WhatsApp Business Connection Status</h3>
              <p className="text-xs text-slate-400">Meta Graph API Handshake</p>
            </div>
          </div>

          <button
            onClick={() => syncTemplatesMutation.mutate()}
            disabled={syncTemplatesMutation.isPending}
            className="w-full sm:w-auto justify-center bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold px-3.5 py-2 rounded-xl text-xs border border-slate-700 flex items-center transition-all disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            {syncTemplatesMutation.isPending ? 'Syncing...' : 'Sync Meta Templates'}
          </button>
        </div>

        {healthData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-800/60 text-xs">
            <div>
              <span className="text-slate-500 block">Phone Number</span>
              <span className="font-semibold text-white mt-0.5 block">{healthData.displayPhoneNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block">WABA ID</span>
              <span className="font-mono text-slate-300 mt-0.5 block truncate">{healthData.wabaId}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Quality Rating</span>
              <span className="font-semibold text-emerald-400 mt-0.5 block">{healthData.qualityRating || 'GREEN'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Status</span>
              <span className="font-semibold text-emerald-400 mt-0.5 block">{healthData.status}</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-amber-400 pt-2">No WhatsApp account connected yet. Complete setup below.</p>
        )}
      </div>

      {/* Meta Embedded Signup Card */}
      <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white text-lg flex items-center">
              <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white mr-3 shrink-0">f</span>
              <span className="truncate sm:whitespace-normal">Meta Embedded Signup (1-Click Client Onboarding)</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Connect your Meta WhatsApp Business Account automatically in 10 seconds without manually copying IDs!
            </p>
          </div>

          <button
            onClick={() => {
              const appId = '1965990760786807';
              const redirectUri = encodeURIComponent(window.location.origin + '/settings');
              const scope = 'whatsapp_business_management,whatsapp_business_messaging';
              const oauthUrl = `https://www.facebook.com/v26.0/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

              const width = 600;
              const height = 750;
              const left = window.screen.width / 2 - width / 2;
              const top = window.screen.height / 2 - height / 2;

              window.open(
                oauthUrl,
                'MetaEmbeddedSignup',
                `toolbar=no, location=no, directories=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=${width}, height=${height}, top=${top}, left=${left}`
              );
            }}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="w-5 h-5 rounded bg-white text-blue-600 flex items-center justify-center font-extrabold text-xs mr-2">f</span>
            Connect with Facebook
          </button>
        </div>
      </div>

      {/* Onboarding Credentials Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <h3 className="font-semibold text-white flex items-center">
          <Link2 className="w-5 h-5 mr-2.5 text-emerald-400" />
          Connect / Update Meta Credentials (Manual Fallback)
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">WABA ID</label>
              <input
                type="text"
                value={wabaId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWabaId(e.target.value)}
                placeholder="109823471293847"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Phone Number ID</label>
              <input
                type="text"
                value={phoneNumberId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumberId(e.target.value)}
                placeholder="102938471293847"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Display Phone Number</label>
            <input
              type="text"
              value={displayPhoneNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayPhoneNumber(e.target.value)}
              placeholder="+1 415 555 2671"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Permanent System User Access Token (AES-256 Encrypted at Rest)
            </label>
            <textarea
              rows={3}
              value={accessToken}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAccessToken(e.target.value)}
              placeholder="EAABcXWp..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 text-sm cursor-pointer"
            >
              {connectMutation.isPending ? 'Saving Meta Credentials...' : 'Save Meta Credentials'}
            </button>
          </div>
        </div>
      </div>

      {/* ── AI Smart Copilot Knowledgebase Configurator ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg flex items-center">
              <Bot className="w-5 h-5 mr-2 text-purple-400" />
              <span>Gemini 1.5 AI Smart Copilot Knowledgebase & FAQ Context</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Provide business details, FAQs, pricing, and working hours to train your Gemini AI Live Inbox Assistant.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Autonomous AI Auto-Responder Toggle Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-0.5 max-w-xl">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Autonomous AI 24/7 Auto-Responder</span>
                {isAiAutoRespondEnabled ? (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold uppercase animate-pulse">ACTIVE 24/7</span>
                ) : (
                  <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-bold uppercase">OFF (MANUAL SUGGESTIONS)</span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                When enabled, inbound customer WhatsApp messages are automatically answered using your Knowledgebase & FAQs. Complex queries are automatically escalated to Live Agents.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAiAutoRespondEnabled(!isAiAutoRespondEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAiAutoRespondEnabled ? 'bg-purple-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isAiAutoRespondEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              AI Knowledgebase Context & FAQs
            </label>
            <textarea
              rows={4}
              value={aiKnowledgeBase}
              onChange={(e) => setAiKnowledgeBase(e.target.value)}
              placeholder="e.g. Shrishti Dairy Farm offers pure A2 Desi Cow Milk at ₹80/liter. Delivery timing: 6:00 AM - 9:00 AM daily. Customer support: 9:00 AM to 7:00 PM."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-sans leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => saveKbMutation.mutate()}
              disabled={saveKbMutation.isPending}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {saveKbMutation.isPending ? 'Saving Settings...' : 'Save AI Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Razorpay Payment Gateway Credentials Configurator ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-emerald-400" />
              <span>Razorpay Payment Gateway API Credentials</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure your Razorpay Key ID and Secret to accept instant WhatsApp in-chat UPI payments directly into your bank account.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Razorpay Key ID
            </label>
            <input
              type="text"
              value={razorpayKeyId}
              onChange={(e) => setRazorpayKeyId(e.target.value)}
              placeholder="rzp_live_xxxxxxxxxxxx"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Razorpay Key Secret
            </label>
            <input
              type="password"
              value={razorpayKeySecret}
              onChange={(e) => setRazorpayKeySecret(e.target.value)}
              placeholder="••••••••••••••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => saveRazorpayMutation.mutate()}
            disabled={saveRazorpayMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {saveRazorpayMutation.isPending ? 'Saving Keys...' : 'Save Razorpay Credentials'}
          </button>
        </div>
      </div>
    </div>
  );
};
