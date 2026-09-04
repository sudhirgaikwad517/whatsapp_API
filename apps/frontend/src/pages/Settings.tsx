import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Settings as SettingsIcon, Link2, ShieldCheck, CheckCircle, RefreshCw, Bot, Plus, Trash2, Tag, CreditCard } from 'lucide-react';
import { apiClient } from '../services/api.client';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export const Settings: React.FC = () => {
  const [orgName, setOrgName] = useState('');
  const [timezone, setTimezone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [billingGstin, setBillingGstin] = useState('');
  const [billingPan, setBillingPan] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [billingPhone, setBillingPhone] = useState('');
  const [escalationTemplateId, setEscalationTemplateId] = useState('');
  const [slaReassignMinutes, setSlaReassignMinutes] = useState('');
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

  // Initialize Facebook SDK
  React.useEffect(() => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: '1965990760786807', // Platform's SuperAdmin Facebook App ID
        cookie: true,
        xfbml: true,
        version: 'v20.0',
      });
    };
  }, []);

  const { data: orgData } = useQuery({
    queryKey: ['org-details'],
    queryFn: async () => {
      const res = await apiClient.get('/organization');
      return res.data.data;
    },
  });

  React.useEffect(() => {
    if (orgData) {
      if (orgData.name) setOrgName(orgData.name);
      if (orgData.timezone) setTimezone(orgData.timezone);
      if (orgData.logoUrl) setLogoUrl(orgData.logoUrl);
      if (orgData.billingAddress) setBillingAddress(orgData.billingAddress);
      if (orgData.billingGstin) setBillingGstin(orgData.billingGstin);
      if (orgData.billingPan) setBillingPan(orgData.billingPan);
      if (orgData.billingEmail) setBillingEmail(orgData.billingEmail);
      if (orgData.billingPhone) setBillingPhone(orgData.billingPhone);
      if (orgData.escalationTemplateId) setEscalationTemplateId(orgData.escalationTemplateId);
      if (orgData.slaReassignMinutes) setSlaReassignMinutes(String(orgData.slaReassignMinutes));
      if (orgData.aiKnowledgeBase) setAiKnowledgeBase(orgData.aiKnowledgeBase);
      if (orgData.geminiApiKey) setGeminiApiKey(orgData.geminiApiKey);
      if (orgData.isAiAutoRespondEnabled !== undefined) setIsAiAutoRespondEnabled(orgData.isAiAutoRespondEnabled);
      if (orgData.razorpayKeyId) setRazorpayKeyId(orgData.razorpayKeyId);
    }
  }, [orgData]);

  const saveBusinessDetailsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/organization', {
        name: orgName,
        timezone,
        logoUrl,
        billingAddress,
        billingGstin,
        billingPan,
        billingEmail,
        billingPhone,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-details'] });
      toast.success('Business details updated successfully!');
    },
    onError: (err: any) => {
      toast.error('Failed to update business details', { description: err?.response?.data?.message || err.message });
    },
  });

  const { data: templatesList } = useQuery({
    queryKey: ['templates-list'],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/templates');
      return res.data.data;
    },
  });
  const approvedTemplates = Array.isArray(templatesList) ? templatesList.filter((t: any) => t.status === 'APPROVED') : [];

  const saveEscalationTemplateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/organization', { escalationTemplateId: escalationTemplateId || null });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-details'] });
      toast.success('Agent notification template saved!');
    },
    onError: (err: any) => {
      toast.error('Failed to save template', { description: err?.response?.data?.message || err.message });
    },
  });

  const saveSlaMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch('/organization', {
        slaReassignMinutes: slaReassignMinutes.trim() ? Number(slaReassignMinutes) : null,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-details'] });
      toast.success('Chat SLA setting saved!');
    },
    onError: (err: any) => {
      toast.error('Failed to save SLA setting', { description: err?.response?.data?.message || err.message });
    },
  });

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
      toast.success('AI knowledgebase & auto-responder settings saved successfully!');
    },
    onError: (err: any) => {
      toast.error('Failed to save AI settings', { description: err.message });
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
      toast.success('Razorpay API credentials stored securely!');
    },
    onError: (err: any) => {
      toast.error('Failed to save Razorpay credentials', { description: err.message });
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

  const embeddedSignupMutation = useMutation({
    mutationFn: async (payload: { accessToken: string; wabaId: string; phoneNumberId: string; displayPhoneNumber: string }) => {
      const res = await apiClient.post('/whatsapp/embedded-signup', payload);
      return res.data.data;
    },
    onSuccess: async () => {
      toast.success('Meta connected successfully!');
      try {
        await apiClient.post('/whatsapp/templates/sync');
        queryClient.invalidateQueries({ queryKey: ['whatsapp-health'] });
      } catch (e) {
        console.warn('Template sync failed after embedded signup');
      }
    },
    onError: (err: any) => {
      toast.error('Embedded signup failed', { description: err.message });
    },
  });

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
        toast.success('Credentials saved & Meta templates synced!');
      } catch {
        toast.success('Meta credentials saved successfully!');
      }
      setAccessToken('');
    },
    onError: (err: any) => {
      toast.error('Failed to save', { description: err.response?.data?.error?.message || err.message });
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

      {/* Business Details Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-emerald-400" />
          Business Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Timezone</label>
            <input
              type="text"
              placeholder="e.g. Asia/Kolkata"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Logo URL</label>
            <input
              type="text"
              placeholder="https://..."
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Tax / Billing Identity (shown on invoices)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Billing Address</label>
              <input
                type="text"
                placeholder="Street, City, State, PIN"
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">GSTIN</label>
              <input
                type="text"
                placeholder="27AABCF5150Q1ZG"
                value={billingGstin}
                onChange={(e) => setBillingGstin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">PAN</label>
              <input
                type="text"
                placeholder="AABCF5150G"
                value={billingPan}
                onChange={(e) => setBillingPan(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Billing Email</label>
              <input
                type="email"
                placeholder="accounts@yourbusiness.com"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Billing Phone</label>
              <input
                type="text"
                placeholder="+91-XXXXXXXXXX"
                value={billingPhone}
                onChange={(e) => setBillingPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => saveBusinessDetailsMutation.mutate()}
            disabled={saveBusinessDetailsMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
          >
            {saveBusinessDetailsMutation.isPending ? 'Saving...' : 'Save Business Details'}
          </button>
        </div>
      </div>

      {/* Agent Escalation Notification Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-400" />
          Agent Chat-Assignment Notifications
        </h3>
        <p className="text-xs text-slate-400 -mt-2">
          When the AI Copilot hands a conversation off to a human agent, they're emailed automatically. Pick an approved
          WhatsApp template below to also notify them on WhatsApp — sent from your own connected number and billed at the
          standard utility-message rate from your wallet.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              WhatsApp Notification Template
            </label>
            <select
              value={escalationTemplateId}
              onChange={(e) => setEscalationTemplateId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Email only (no WhatsApp notification)</option>
              {approvedTemplates.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.category}, {t.language})
                </option>
              ))}
            </select>
            {approvedTemplates.length === 0 && (
              <p className="text-[10px] text-amber-400 mt-1">
                No approved templates found yet — sync/create one from the Meta Templates page first.
              </p>
            )}
          </div>
          <button
            onClick={() => saveEscalationTemplateMutation.mutate()}
            disabled={saveEscalationTemplateMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 h-fit"
          >
            {saveEscalationTemplateMutation.isPending ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* Chat SLA & Auto-Escalation Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-400" />
          Chat SLA &amp; Auto-Escalation
        </h3>
        <p className="text-xs text-slate-400 -mt-2">
          If an agent doesn't open a chat assigned to them within this many minutes, it's automatically reassigned to you
          (the org owner) and you're notified the same way agents are. Leave blank to turn this off.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Auto-Reassign After (minutes)
            </label>
            <input
              type="number"
              min={1}
              value={slaReassignMinutes}
              onChange={(e) => setSlaReassignMinutes(e.target.value)}
              placeholder="e.g. 30 (blank = disabled)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={() => saveSlaMutation.mutate()}
            disabled={saveSlaMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 h-fit"
          >
            {saveSlaMutation.isPending ? 'Saving...' : 'Save SLA Setting'}
          </button>
        </div>
      </div>

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
              if (!window.FB) {
                toast.error('Facebook SDK is still loading — please try again in a few seconds.');
                return;
              }

              // Trigger Meta Embedded Signup Flow
              window.FB.login(
                function (response: any) {
                  if (response.authResponse) {
                    const { accessToken } = response.authResponse;
                    
                    // In a production Embedded Signup, Facebook returns a 'code' and 'setup' object.
                    // For standard FB login, we just get the access token. 
                    // You will need to fetch WABA ID and Phone ID via Graph API or pass them manually.
                    
                    embeddedSignupMutation.mutate({
                      accessToken,
                      // These placeholders would be dynamically fetched via Graph API
                      wabaId: 'YOUR_WABA_ID',
                      phoneNumberId: 'YOUR_PHONE_ID',
                      displayPhoneNumber: 'YOUR_DISPLAY_PHONE',
                    });
                  } else {
                    toast.error('Facebook login was cancelled or failed.');
                  }
                },
                {
                  scope: 'whatsapp_business_management,whatsapp_business_messaging',
                  return_scopes: true
                }
              );
            }}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-3 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 text-sm transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <span className="w-5 h-5 rounded bg-white text-blue-600 flex items-center justify-center font-extrabold text-xs mr-2">f</span>
            Connect with Facebook
          </button>
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
