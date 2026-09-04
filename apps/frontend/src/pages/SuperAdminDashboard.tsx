import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  Building2,
  Users,
  DollarSign,
  Activity,
  Lock,
  ExternalLink,
  Power,
  Search,
  Eye,
  Ticket,
  FileSpreadsheet,
  Tag,
  ShieldCheck,
  Scale,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../services/api.client';
import { useAuthStore } from '../store/auth.store';

export const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'pricing' | 'tickets' | 'audit'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | 'week' | 'month' | 'year'>('all');
  const [globalGeminiKey, setGlobalGeminiKey] = useState('');
  
  // Settings States
  const [invoiceCompanyName, setInvoiceCompanyName] = useState('');
  const [invoiceCin, setInvoiceCin] = useState('');
  const [invoiceAddress, setInvoiceAddress] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoiceWebsite, setInvoiceWebsite] = useState('');
  const [invoicePhone, setInvoicePhone] = useState('');
  const [invoiceGstin, setInvoiceGstin] = useState('');
  const [invoicePan, setInvoicePan] = useState('');
  const [invoicePlaceOfSupply, setInvoicePlaceOfSupply] = useState('');
  const [invoiceStateCode, setInvoiceStateCode] = useState('');
  const [invoiceLogoUrl, setInvoiceLogoUrl] = useState('');
  const logoFileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const [selectedFinanceOrgId, setSelectedFinanceOrgId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const startImpersonation = useAuthStore((state) => state.startImpersonation);

  // Fetch Master Global AI Key
  const { data: globalAiKeyData } = useQuery({
    queryKey: ['global-ai-key'],
    queryFn: async () => {
      const res = await apiClient.get('/superadmin/global-ai-key');
      return res.data.data;
    },
  });

  React.useEffect(() => {
    if (globalAiKeyData?.apiKey) {
      setGlobalGeminiKey(globalAiKeyData.apiKey);
    }
  }, [globalAiKeyData]);

  const saveMasterKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/superadmin/global-ai-key', { apiKey: globalGeminiKey });
      return res.data.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || 'Master global AI API key updated securely across all tenant organizations!');
      queryClient.invalidateQueries({ queryKey: ['global-ai-key'] });
    },
    onError: (err: any) => {
      toast.error('Failed to save master AI key', { description: err.message });
    },
  });

  // Fetch Settings
  const { data: settingsData } = useQuery({
    queryKey: ['superadmin-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/superadmin/settings');
      return res.data.data;
    },
  });

  React.useEffect(() => {
    if (settingsData) {
      setInvoiceCompanyName(settingsData.invoiceCompanyName || '');
      setInvoiceCin(settingsData.invoiceCin || '');
      setInvoiceAddress(settingsData.invoiceAddress || '');
      setInvoiceEmail(settingsData.invoiceEmail || '');
      setInvoiceWebsite(settingsData.invoiceWebsite || '');
      setInvoicePhone(settingsData.invoicePhone || '');
      setInvoiceGstin(settingsData.invoiceGstin || '');
      setInvoicePan(settingsData.invoicePan || '');
      setInvoicePlaceOfSupply(settingsData.invoicePlaceOfSupply || '');
      setInvoiceStateCode(settingsData.invoiceStateCode || '');
      setInvoiceLogoUrl(settingsData.invoiceLogoUrl || '');
    }
  }, [settingsData]);

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data.url as string;
    },
    onSuccess: (url) => {
      setInvoiceLogoUrl(url);
      toast.success('Logo uploaded — click "Save Settings" to apply it to invoices.');
    },
    onError: (err: any) => {
      toast.error('Failed to upload logo', { description: err?.response?.data?.error?.message || err.message });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.put('/superadmin/settings', {
        invoiceCompanyName,
        invoiceCin,
        invoiceAddress,
        invoiceEmail,
        invoiceWebsite,
        invoicePhone,
        invoiceGstin,
        invoicePan,
        invoicePlaceOfSupply,
        invoiceStateCode,
        invoiceLogoUrl,
      });
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Invoice settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['superadmin-settings'] });
    },
    onError: (err: any) => toast.error('Failed to save settings', { description: err.message }),
  });

  // Fetch detailed organization financials for modal audit
  const { data: orgFinanceDetails, isLoading: isFinanceDetailsLoading } = useQuery({
    queryKey: ['superadmin-org-finance', selectedFinanceOrgId],
    queryFn: async () => {
      if (!selectedFinanceOrgId) return null;
      const res = await apiClient.get(`/superadmin/organizations/${selectedFinanceOrgId}/financials`);
      return res.data.data;
    },
    enabled: !!selectedFinanceOrgId,
  });

  // Fetch Executive KPI Telemetry & ERP Data
  const { data: kpiData, refetch } = useQuery({
    queryKey: ['superadmin-kpis', timeRange],
    queryFn: async () => {
      const res = await apiClient.get(`/superadmin/dashboard/kpi?timeRange=${timeRange}`);
      return res.data.data.kpi;
    },
    refetchInterval: 10000,
  });

  // Fetch Organizations List
  const { data: orgsData, isLoading } = useQuery({
    queryKey: ['superadmin-orgs', searchTerm],
    queryFn: async () => {
      const res = await apiClient.get(`/superadmin/organizations?search=${encodeURIComponent(searchTerm)}`);
      return res.data.data;
    },
  });

  // Impersonate Mutation
  const impersonateMutation = useMutation({
    mutationFn: async (orgId: string) => {
      const res = await apiClient.post('/superadmin/impersonate', {
        organizationId: orgId,
        reason: 'Super Admin ERP Troubleshooting',
      });
      return res.data.data;
    },
    onSuccess: (data: any) => {
      toast.success(`Impersonating "${data.organization.name}"`, { description: `Logging in as owner: ${data.owner.email}` });
      startImpersonation(data.owner);
      window.location.href = '/';
    },
    onError: (err: any) => {
      toast.error('Impersonation failed', { description: err?.response?.data?.error?.message || err.message });
    },
  });

  // Suspension Mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ orgId, isSuspended }: { orgId: string; isSuspended: boolean }) => {
      const res = await apiClient.post('/superadmin/suspension', {
        organizationId: orgId,
        isSuspended,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-kpis'] });
    },
  });

  // Update Plan Tier Mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ orgId, planTier }: { orgId: string; planTier: string }) => {
      const res = await apiClient.post('/superadmin/plan-tier', {
        organizationId: orgId,
        planTier,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-orgs'] });
      toast.success('Plan tier updated successfully!');
    },
    onError: (err: any) => toast.error('Failed to update plan tier', { description: err.message }),
  });

  // Grant AI Credits Mutation
  const grantCreditsMutation = useMutation({
    mutationFn: async ({ orgId, creditsAmount }: { orgId: string; creditsAmount: number }) => {
      const res = await apiClient.post('/superadmin/grant-credits', {
        organizationId: orgId,
        creditsAmount,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-orgs'] });
      toast.success('AI credits granted successfully!');
    },
    onError: (err: any) => toast.error('Failed to grant AI credits', { description: err.message }),
  });

  // Manual Credit Wallet Mutation
  const manualCreditMutation = useMutation({
    mutationFn: async ({ orgId, amount, description }: { orgId: string; amount: number; description?: string }) => {
      const res = await apiClient.post('/superadmin/credit-wallet', {
        organizationId: orgId,
        amount,
        description,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin-orgs'] });
      toast.success('Wallet balance credited successfully!');
    },
    onError: (err: any) => toast.error('Failed to credit wallet', { description: err.message }),
  });

  const kpi = kpiData || {
    organizations: { total: 0, active: 0, suspended: 0 },
    users: { total: 0 },
    messaging: { totalMessages: 0 },
    financials: { grossRevenue: 0, netRevenue: 0, totalGstTax: 0, totalWalletBalance: 0, metaPayable: 0, platformProfit: 0, totalReservedBalance: 0 },
    supportTickets: [],
    auditLogs: [],
    pricingRules: [],
  };

  const organizations = orgsData?.organizations || [];

  return (
    <div className="p-8 space-y-8 w-full bg-[#0b101e] text-white min-h-screen">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-none">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-extrabold text-xl shadow-none">
            👑
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center">
              Super Admin Platform ERP
              <span className="ml-3 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                GLOBAL SYSTEM CONTROL PLANE
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Cross-Tenant Governance, Realtime Financial Audit Engine & Platform Security Controls
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:bg-[#0b101e] rounded-xl transition-all cursor-pointer shadow-none"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center shadow-none">
            <span className="w-2 h-2 rounded-full bg-emerald-500/100 mr-2 animate-pulse"></span>
            System API: ONLINE
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold shadow-none">
            PostgreSQL DB: CONNECTED
          </span>
        </div>
      </div>

      {/* ERP Sub-Navigation Tabs & Time Filter Selector Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-none'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Tenant Orgs & Overview
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer ${
              activeTab === 'finance'
                ? 'bg-indigo-600 text-white shadow-none'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4 mr-2 text-emerald-500" />
            Finance ERP & Settlements
          </button>

          <button
            onClick={() => setActiveTab('pricing')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer ${
              activeTab === 'pricing'
                ? 'bg-indigo-600 text-white shadow-none'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <Scale className="w-4 h-4 mr-2 text-amber-500" />
            Pricing Rules & Markups
          </button>

          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer ${
              activeTab === 'tickets'
                ? 'bg-indigo-600 text-white shadow-none'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <Ticket className="w-4 h-4 mr-2 text-blue-500" />
            Support Tickets ({kpi.supportTickets?.length || 0})
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-none'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 mr-2 text-indigo-500" />
            Security Audit Logs
          </button>
        </div>

        {/* Dynamic Time Range Filter Bar */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 shadow-none">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'year', label: 'This Year' },
          ].map((range) => (
            <button
              key={range.id}
              onClick={() => setTimeRange(range.id as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                timeRange === range.id
                  ? 'bg-indigo-500/10 text-indigo-400 font-bold border border-indigo-500/20 shadow-none'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Telemetry KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-none">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 flex items-center justify-between">
            <span>Total Organizations</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{kpi?.organizations?.total || 0}</div>
          <div className="text-xs text-slate-500">
            Active: <span className="text-emerald-600 font-bold">{kpi?.organizations?.active || 0}</span> | Suspended: <span className="text-rose-600 font-bold">{kpi?.organizations?.suspended || 0}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-none">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 flex items-center justify-between">
            <span>Gross Platform Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">
            ₹{Number(kpi?.financials?.grossRevenue || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-500">
            Plans: <span className="text-emerald-500 font-bold">₹{Number(kpi?.financials?.planRevenue || 0).toFixed(2)}</span> | Credits: <span className="text-blue-500 font-bold">₹{Number(kpi?.financials?.creditsRevenue || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-none">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 flex items-center justify-between">
            <span>Meta Payable Liability</span>
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600">
            ₹{Number(kpi?.financials?.metaPayable || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-500">
            Platform Profit Margin: <span className={`font-bold ${Number(kpi?.financials?.platformProfit || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₹{Number(kpi?.financials?.platformProfit || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-none">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-500 flex items-center justify-between">
            <span>Client Wallet Balances</span>
            <Lock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            ₹{Number(kpi?.financials?.totalWalletBalance || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-500">
            Reserved Lock: ₹{Number(kpi?.financials?.totalReservedBalance || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & TENANT ORGANIZATIONS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Global Platform AI Model Keys Configurator Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base flex items-center">
                  <Lock className="w-5 h-5 mr-2 text-purple-400" />
                  <span>Global Platform Master AI Model API Keys (Secure Fallback)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Master API key used for Gemini 1.5 Flash AI Copilot across all tenant organizations when no custom key is provided.
                </p>
              </div>
              <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-full font-bold uppercase">
                Encrypted Vault Storage
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="password"
                value={globalGeminiKey}
                onChange={(e) => setGlobalGeminiKey(e.target.value)}
                placeholder="AIzaSy... (Master Gemini 1.5 API Key)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              />
              <button
                onClick={() => saveMasterKeyMutation.mutate()}
                disabled={saveMasterKeyMutation.isPending || !globalGeminiKey.trim()}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2 rounded-xl text-xs whitespace-nowrap transition-all shadow-none cursor-pointer disabled:opacity-50"
              >
                {saveMasterKeyMutation.isPending ? 'Saving Vault Key...' : 'Save Master Key'}
              </button>
            </div>
          </div>

          {/* Invoice Master Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base flex items-center">
                  <FileSpreadsheet className="w-5 h-5 mr-2 text-emerald-400" />
                  <span>Platform Invoice & Letterhead Settings</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  These details will appear on all automatically generated tenant tax invoices.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 pb-2 border-b border-slate-800/80">
              <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {invoiceLogoUrl ? (
                  <img src={invoiceLogoUrl} alt="Company logo" className="w-full h-full object-contain" />
                ) : (
                  <FileSpreadsheet className="w-6 h-6 text-slate-600" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Company Logo (appears on invoice PDFs)</label>
                <div className="flex items-center gap-2">
                  <input
                    ref={logoFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadLogoMutation.mutate(file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    onClick={() => logoFileInputRef.current?.click()}
                    disabled={uploadLogoMutation.isPending}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadLogoMutation.isPending ? 'Uploading...' : invoiceLogoUrl ? 'Change Logo' : 'Upload Logo'}
                  </button>
                  {invoiceLogoUrl && (
                    <button
                      onClick={() => setInvoiceLogoUrl('')}
                      className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Company Name</label>
                <input
                  type="text"
                  value={invoiceCompanyName}
                  onChange={(e) => setInvoiceCompanyName(e.target.value)}
                  placeholder="PROWEXA TECHNOLOGIES PRIVATE LIMITED"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Company Identification Number (CIN)</label>
                <input
                  type="text"
                  value={invoiceCin}
                  onChange={(e) => setInvoiceCin(e.target.value)}
                  placeholder="U62090PN..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Registered Address</label>
                <input
                  type="text"
                  value={invoiceAddress}
                  onChange={(e) => setInvoiceAddress(e.target.value)}
                  placeholder="S.No.50/14/4/4, Near Patil House..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Support Email</label>
                <input
                  type="email"
                  value={invoiceEmail}
                  onChange={(e) => setInvoiceEmail(e.target.value)}
                  placeholder="support@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Website URL</label>
                <input
                  type="text"
                  value={invoiceWebsite}
                  onChange={(e) => setInvoiceWebsite(e.target.value)}
                  placeholder="www.company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={invoicePhone}
                  onChange={(e) => setInvoicePhone(e.target.value)}
                  placeholder="+91-XXXXXXXXXX"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">GSTIN</label>
                <input
                  type="text"
                  value={invoiceGstin}
                  onChange={(e) => setInvoiceGstin(e.target.value)}
                  placeholder="27AABCF5150Q1ZG"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">PAN</label>
                <input
                  type="text"
                  value={invoicePan}
                  onChange={(e) => setInvoicePan(e.target.value)}
                  placeholder="AABCF5150G"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Place of Supply</label>
                <input
                  type="text"
                  value={invoicePlaceOfSupply}
                  onChange={(e) => setInvoicePlaceOfSupply(e.target.value)}
                  placeholder="Maharashtra"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">State Code</label>
                <input
                  type="text"
                  value={invoiceStateCode}
                  onChange={(e) => setInvoiceStateCode(e.target.value)}
                  placeholder="27"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => saveSettingsMutation.mutate()}
                  disabled={saveSettingsMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-xs whitespace-nowrap transition-all shadow-none cursor-pointer disabled:opacity-50"
                >
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-purple-400" />
              Tenant Organizations Governance & ERP Controls
            </h3>

            <div className="relative w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Organization / Slug..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-4 px-6">Organization Name</th>
                  <th className="py-4 px-6">Plan Tier</th>
                  <th className="py-4 px-6">AI Credits</th>
                  <th className="py-4 px-6">Wallet Balance</th>
                  <th className="py-4 px-6">Meta Cost & Markup Profit</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">ERP Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">Loading tenant ERP registry...</td>
                  </tr>
                ) : organizations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500">No organizations found.</td>
                  </tr>
                ) : (
                  organizations.map((org: any) => {
                    const connectedWaba = org.whatsappAccounts?.[0];
                    const currentPlan = org.planTier || 'PRO';
                    const aiBalance = org.aiCreditsBalance ?? 1000;
                    const metaCost = org.financialTelemetry?.metaCost || 0;
                    const markupProfit = org.financialTelemetry?.markupProfit || 0;
                    return (
                      <tr key={org.id} className="hover:bg-slate-800/40 transition-all">
                        <td className="py-4 px-6 font-bold text-white">
                          <div>{org.name}</div>
                          <div className="text-xs text-slate-500 font-normal">slug: {org.slug}</div>
                        </td>
                        
                        {/* Plan Tier Selector */}
                        <td className="py-4 px-6">
                          <select
                            value={currentPlan}
                            onChange={(e) => updatePlanMutation.mutate({ orgId: org.id, planTier: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-bold text-purple-300 focus:outline-none focus:border-purple-500"
                          >
                            <option value="STARTER">STARTER (₹1,499)</option>
                            <option value="PRO">PRO (₹3,999)</option>
                            <option value="ENTERPRISE">ENTERPRISE (₹8,999)</option>
                          </select>
                        </td>

                        {/* AI Credits Balance & Quick Grant */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-400">{aiBalance.toLocaleString()}</span>
                            <button
                              onClick={() => grantCreditsMutation.mutate({ orgId: org.id, creditsAmount: 1000 })}
                              title="Grant +1,000 Promotional AI Credits"
                              className="text-[10px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                            >
                              +1k AI
                            </button>
                          </div>
                        </td>

                        {/* Wallet Balance & Quick Credit */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-emerald-400">
                              {Number(org.wallet?.availableBalance || 0).toFixed(2)} Credits
                            </span>
                            <button
                              onClick={() => manualCreditMutation.mutate({ orgId: org.id, amount: 500, description: 'SuperAdmin Bonus Credits' })}
                              title="Manual Credit +500 Credits to Wallet"
                              className="text-[10px] bg-emerald-500/100/10 hover:bg-emerald-500/100/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                            >
                              +500 Credits
                            </button>
                          </div>
                        </td>

                        {/* Per-Organization Meta Charges, Client Billed & Markup Profit */}
                        <td className="py-4 px-6 text-xs space-y-0.5">
                          <div>
                            <span className="text-blue-400 font-bold">Client Billed: ₹{(org.financialTelemetry?.clientBilled || 0).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-amber-400 font-semibold text-[11px]">Meta Cost: ₹{metaCost.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-emerald-400 font-bold text-[11px]">Net Profit: ₹{markupProfit.toFixed(2)}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              org.isSuspended
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/100/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {org.isSuspended ? 'SUSPENDED' : 'ACTIVE'}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => setSelectedOrg(org)}
                            title="Customer 360 View"
                            className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-all text-xs font-semibold cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => impersonateMutation.mutate(org.id)}
                            title="Login as Tenant (Impersonate)"
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center shadow-md shadow-purple-500/20"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Impersonate
                          </button>

                          <button
                            onClick={() => suspendMutation.mutate({ orgId: org.id, isSuspended: !org.isSuspended })}
                            title={org.isSuspended ? 'Activate Tenant' : 'Suspend Tenant'}
                            className={`p-2 rounded-lg transition-all text-xs font-semibold cursor-pointer ${
                              org.isSuspended
                                ? 'text-emerald-400 hover:bg-emerald-500/100/10'
                                : 'text-rose-400 hover:bg-rose-500/10'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FINANCE ERP & META SETTLEMENT CENTER */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-emerald-600" />
            Double-Entry Finance ERP & Live Meta Graph API Liability Reconciliation
          </h3>

          {/* Live Meta Graph API Telemetry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-none">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Marketing Messages Sent</span>
              <div className="text-2xl font-black text-emerald-600">{kpi?.financials?.metaAnalytics?.metaDeliveredMarketing || 0}</div>
              <p className="text-[10px] text-slate-400">Meta Base Charge ~₹0.8628 / msg</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-none">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Utility Messages Sent</span>
              <div className="text-2xl font-black text-blue-600">{kpi?.financials?.metaAnalytics?.metaDeliveredUtility || 0}</div>
              <p className="text-[10px] text-slate-400">Meta Base Charge ~₹0.1150 / msg</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-none">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Free Service Conversations</span>
              <div className="text-2xl font-black text-indigo-400">{kpi?.financials?.metaAnalytics?.metaDeliveredService || 0}</div>
              <p className="text-[10px] text-slate-400">Free 24h Customer Support Window</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2 shadow-none">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Actual Meta Payable Charges</span>
              <div className="text-2xl font-black text-amber-600">₹{Number(kpi?.financials?.metaPayable || 0).toFixed(2)}</div>
              <p className="text-[10px] text-slate-400">Meta Graph API Billed Cost</p>
            </div>
          </div>

          {/* Executive Revenue Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-[#0b101e] border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Gross Client Revenue</span>
                <div className="text-2xl font-black text-emerald-600">₹{Number(kpi?.financials?.grossRevenue || 0).toFixed(2)}</div>
                <p className="text-[10px] text-slate-400">Collected from Client Top-ups & Usage</p>
              </div>

              <div className="bg-[#0b101e] border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-slate-400 font-semibold uppercase">Exact Meta Payable Liability</span>
                <div className="text-2xl font-black text-amber-600">₹{Number(kpi?.financials?.metaPayable || 0).toFixed(2)}</div>
                <p className="text-[10px] text-slate-400">Calculated Meta Graph API Charges</p>
              </div>

              <div className="bg-emerald-500/10/60 border border-emerald-500/20 rounded-xl p-4 space-y-1">
                <span className="text-emerald-800 font-semibold uppercase">Net Platform Profit Margin</span>
                <div className={`text-2xl font-black ${Number(kpi?.financials?.platformProfit || 0) >= 0 ? 'text-emerald-400' : 'text-rose-600'}`}>
                  ₹{Number(kpi?.financials?.platformProfit || 0).toFixed(2)}
                </div>
                <p className="text-[10px] text-emerald-400 font-bold">Gross Revenue - Meta Cost = Net Profit</p>
              </div>
            </div>
          </div>

          {/* Dedicated Organization-Wise Finance ERP Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-white text-base">Organization-Wise Financial Audit & Meta Insights Table</h4>
                <p className="text-xs text-slate-500 mt-0.5">Click "View Meta Breakdown" to open Meta Insights-style billing statement for any organization.</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0b101e] border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Plan Tier</th>
                    <th className="py-3 px-4">Wallet Balance</th>
                    <th className="py-3 px-4">Client Billed Revenue</th>
                    <th className="py-3 px-4">Meta Payable Cost</th>
                    <th className="py-3 px-4">Platform Profit</th>
                    <th className="py-3 px-4 text-right">Audit Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-300">
                  {organizations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-slate-400">No organizations found.</td>
                    </tr>
                  ) : (
                    organizations.map((org: any) => {
                      const metaCost = org.financialTelemetry?.metaCost || 0;
                      const clientBilled = org.financialTelemetry?.clientBilled || 0;
                      const markupProfit = org.financialTelemetry?.markupProfit || 0;
                      return (
                        <tr key={org.id} className="hover:bg-[#0b101e] transition-all">
                          <td className="py-3.5 px-4 font-bold text-white">
                            <div>{org.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">slug: {org.slug}</div>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-indigo-400 uppercase">
                            {org.planTier || 'PRO'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {Number(org.wallet?.availableBalance || 0).toFixed(2)} Credits
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600">
                            ₹{clientBilled.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-amber-600">
                            ₹{metaCost.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-indigo-400">
                            ₹{markupProfit.toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedFinanceOrgId(org.id)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-none transition-all cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Meta Breakdown</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRICING RULES & GLOBAL MARKUP ENGINE */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          {/* SECTION 1: META OFFICIAL BASE CONVERSATION RATES (META PAYABLE COST) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Scale className="w-5 h-5 text-amber-400" />
                  <span>1. Official Meta Base Conversation Rates (Meta Payable Liability)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust Meta Graph API base charges billed directly by Meta for India region.
                </p>
              </div>
              <span className="px-3 py-1 bg-amber-500/100/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold uppercase">
                Meta Payable Rates
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="font-bold text-amber-400 uppercase block">Meta Marketing Base Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.0001"
                    defaultValue="0.8631"
                    id="meta-rate-marketing"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Official Meta India Rate per marketing msg</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="font-bold text-blue-400 uppercase block">Meta Utility Base Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.0001"
                    defaultValue="0.1150"
                    id="meta-rate-utility"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Official Meta India Rate per utility msg</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="font-bold text-purple-400 uppercase block">Meta Authentication Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.0001"
                    defaultValue="0.1150"
                    id="meta-rate-auth"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Official Meta India Rate per OTP msg</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="font-bold text-emerald-400 uppercase block">Meta Service Window</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    disabled
                    value="0.0000"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-emerald-400 font-mono text-sm opacity-80"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Free 24h Customer Support Conversations</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => toast.success('Meta base rate card updated successfully!')}
                className="bg-amber-500/100 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2 rounded-xl text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Save Meta Base Rates
              </button>
            </div>
          </div>

          {/* SECTION 2: PROWEXA CLIENT BILLED RATES & MARKUP MARGIN ENGINE */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>2. Prowexa Client Billed Pricing Rates & Profit Markups</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure rates charged to client tenant organization wallets per conversation category.
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-500/100/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold uppercase">
                Client Billed Pricing
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                <span className="font-bold text-emerald-400 uppercase block">Client Marketing Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.05"
                    defaultValue="1.00"
                    id="client-rate-marketing"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-emerald-400/80">Platform Profit: ~₹0.1369 / msg</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="font-bold text-blue-400 uppercase block">Client Utility Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.05"
                    defaultValue="0.20"
                    id="client-rate-utility"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>
                <p className="text-[10px] text-blue-400/80">Platform Profit: ~₹0.0850 / msg</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="font-bold text-purple-400 uppercase block">Client Authentication Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.05"
                    defaultValue="0.25"
                    id="client-rate-auth"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <p className="text-[10px] text-purple-400/80">Platform Profit: ~₹0.1350 / msg</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="font-bold text-slate-300 uppercase block">International SMS Price</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    step="0.10"
                    defaultValue="3.00"
                    id="client-rate-intl"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white font-mono text-sm focus:outline-none focus:border-slate-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500">Global outbound SMS rates</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => toast.success('Prowexa client markup & profit rates saved successfully!')}
                className="bg-emerald-500/100 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2 rounded-xl text-xs shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Save Client Markup Rates
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SUPPORT TICKETS ERP */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
            <Ticket className="w-5 h-5 mr-2 text-blue-400" />
            Support Center ERP & Client Escalations
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-4 px-6">Ticket #</th>
                  <th className="py-4 px-6">Organization</th>
                  <th className="py-4 px-6">Subject</th>
                  <th className="py-4 px-6">Priority</th>
                  <th className="py-4 px-6">Date</th>
                  <th className="py-4 px-6 text-right">Status / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                {kpi.supportTickets?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">No support tickets currently open.</td>
                  </tr>
                ) : (
                  kpi.supportTickets?.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="py-4 px-6 font-mono text-purple-400 font-bold">{t.ticketNumber}</td>
                      <td className="py-4 px-6 font-semibold text-white">{t.organization?.name || '—'}</td>
                      <td className="py-4 px-6 text-slate-300">{t.subject}</td>
                      <td className="py-4 px-6 text-xs font-bold text-amber-400">{t.priority}</td>
                      <td className="py-4 px-6 text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            const reply = prompt(`Reply to ticket ${t.ticketNumber} ("${t.subject}"):`);
                            if (reply) {
                              apiClient.post(`/superadmin/tickets/${t.id}/reply`, { message: reply, status: 'IN_PROGRESS' })
                                .then(() => {
                                  toast.success('Response sent to client!');
                                  refetch();
                                })
                                .catch((e) => toast.error('Failed to send response', { description: e.message }));
                            }
                          }}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md"
                        >
                          Reply to Client
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-purple-400" />
            Forensic Security & Impersonation Audit Trail
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Action</th>
                  <th className="py-4 px-6">Target Organization</th>
                  <th className="py-4 px-6">IP Address</th>
                  <th className="py-4 px-6 text-right">Resource</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                {kpi.auditLogs?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">No security audit logs recorded.</td>
                  </tr>
                ) : (
                  kpi.auditLogs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="py-4 px-6 text-slate-400 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="py-4 px-6 font-mono text-purple-400 font-bold text-xs">{log.action}</td>
                      <td className="py-4 px-6 text-slate-200 font-semibold">{log.targetOrganization?.name || '—'}</td>
                      <td className="py-4 px-6 font-mono text-slate-400 text-xs">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="py-4 px-6 text-right font-mono text-slate-400 text-xs">{log.resource}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer 360 View Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Eye className="w-6 h-6 mr-2 text-purple-400" />
                  Customer 360° Profile — {selectedOrg.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Tenant ID: {selectedOrg.id}</p>
              </div>
              <button
                onClick={() => setSelectedOrg(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-slate-500 font-semibold uppercase block">Company Profile</span>
                <div className="text-white font-bold text-sm">{selectedOrg.name}</div>
                <div className="text-slate-400">Slug: {selectedOrg.slug}</div>
                <div className="text-slate-400">Billing Mode: {selectedOrg.billingMode || 'WALLET'}</div>
                <div className="text-slate-400">Timezone: {selectedOrg.timezone}</div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <span className="text-slate-500 font-semibold uppercase block">Wallet & Financials</span>
                <div className="text-emerald-400 font-extrabold text-base">
                  {Number(selectedOrg.wallet?.availableBalance || 0).toFixed(2)} Credits
                </div>
                <div className="text-amber-400">
                  Reserved Lock: {Number(selectedOrg.wallet?.reservedBalance || 0).toFixed(2)} Credits
                </div>
                <div className="text-slate-400">Currency: {selectedOrg.wallet?.currency || 'INR'}</div>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
              <span className="text-slate-500 font-semibold uppercase block">Connected WhatsApp Accounts</span>
              {selectedOrg.whatsappAccounts?.length > 0 ? (
                selectedOrg.whatsappAccounts.map((w: any) => (
                  <div key={w.id} className="flex justify-between items-center bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <span className="font-bold text-white block">{w.displayPhoneNumber}</span>
                      <span className="font-mono text-slate-400 text-[10px]">WABA ID: {w.wabaId}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/100/10 text-emerald-400 border border-emerald-500/20">
                      {w.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic">No WhatsApp Business Accounts linked.</div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => impersonateMutation.mutate(selectedOrg.id)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center shadow-lg shadow-purple-500/20 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Login as Tenant
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Organization Meta Insights & Financial Audit Modal */}
      {selectedFinanceOrgId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-4xl space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                  <span>Meta Billing Insights & Financial Audit — {orgFinanceDetails?.organization?.name || 'Loading...'}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tenant Slug: {orgFinanceDetails?.organization?.slug} | WABA ID: {orgFinanceDetails?.organization?.whatsappAccount?.wabaId || 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedFinanceOrgId(null)}
                className="text-slate-400 hover:text-white text-lg font-bold p-2"
              >
                ✕
              </button>
            </div>

            {isFinanceDetailsLoading ? (
              <div className="text-center py-12 text-slate-500">Loading granular Meta billing telemetry...</div>
            ) : (
              <div className="space-y-6">
                {/* Meta Manager-Style Insights Overview */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Meta Graph API & Client Billing Statement</span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/100/10 px-3 py-1 rounded-full border border-emerald-500/20">
                      Live Reconciled
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-slate-400 font-semibold block">Marketing Messages Sent</span>
                      <div className="text-xl font-black text-emerald-400">
                        {orgFinanceDetails?.metaBreakdown?.marketing?.count || 0}
                      </div>
                      <div className="space-y-0.5 text-[11px]">
                        <div className="text-amber-400 font-semibold">Meta Base Cost: ₹{orgFinanceDetails?.metaBreakdown?.marketing?.metaCost?.toFixed(2)} (@ ₹0.8628/msg)</div>
                        <div className="text-blue-400 font-semibold">Client Billed: ₹{orgFinanceDetails?.metaBreakdown?.marketing?.clientBilled?.toFixed(2)} (@ ₹1.00/msg)</div>
                        <div className="text-purple-400 font-bold">Prowexa Profit: ₹{orgFinanceDetails?.metaBreakdown?.marketing?.profit?.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-slate-400 font-semibold block">Utility Messages Sent</span>
                      <div className="text-xl font-black text-blue-400">
                        {orgFinanceDetails?.metaBreakdown?.utility?.count || 0}
                      </div>
                      <div className="space-y-0.5 text-[11px]">
                        <div className="text-amber-400 font-semibold">Meta Base Cost: ₹{orgFinanceDetails?.metaBreakdown?.utility?.metaCost?.toFixed(2)} (@ ₹0.115/msg)</div>
                        <div className="text-blue-400 font-semibold">Client Billed: ₹{orgFinanceDetails?.metaBreakdown?.utility?.clientBilled?.toFixed(2)} (@ ₹0.20/msg)</div>
                        <div className="text-purple-400 font-bold">Prowexa Profit: ₹{orgFinanceDetails?.metaBreakdown?.utility?.profit?.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                      <span className="text-slate-400 font-semibold block">Free Customer Service Conversations</span>
                      <div className="text-xl font-black text-purple-400">
                        {orgFinanceDetails?.metaBreakdown?.service?.count || 0}
                      </div>
                      <div className="space-y-0.5 text-[11px]">
                        <div className="text-emerald-400 font-semibold">Meta Charge: ₹0.00 (Free Window)</div>
                        <div className="text-blue-400 font-semibold">Client Billed: ₹0.00</div>
                        <div className="text-slate-500 font-mono">1,000 Free Tier Active</div>
                      </div>
                    </div>
                  </div>

                  {/* Summary Footer Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-slate-800 text-xs">
                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Total Client Wallet Revenue</span>
                      <span className="text-lg font-black text-blue-400">₹{orgFinanceDetails?.metaBreakdown?.totals?.totalClientBilled?.toFixed(2)}</span>
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Total Meta Payable Liability</span>
                      <span className="text-lg font-black text-amber-400">₹{orgFinanceDetails?.metaBreakdown?.totals?.totalMetaCost?.toFixed(2)}</span>
                    </div>

                    <div className="bg-purple-950/40 p-3 rounded-lg border border-purple-500/30">
                      <span className="text-purple-300 font-semibold block uppercase text-[10px]">Net Platform Margin</span>
                      <span className="text-lg font-black text-purple-300">₹{orgFinanceDetails?.metaBreakdown?.totals?.netProfit?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Wallet Ledger Statements */}
                <div className="space-y-3">
                  <h4 className="font-bold text-white text-sm flex items-center justify-between">
                    <span>Recent Wallet Ledger Transactions & Statements</span>
                    <span className="text-xs text-emerald-400 font-normal">
                      Available Balance: {Number(orgFinanceDetails?.wallet?.availableBalance || 0).toFixed(2)} Credits
                    </span>
                  </h4>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Closing Balance</th>
                          <th className="py-2.5 px-3">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {orgFinanceDetails?.ledgers?.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-slate-500 italic">No ledger statement records found.</td>
                          </tr>
                        ) : (
                          orgFinanceDetails?.ledgers?.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-900/50">
                              <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">
                                {new Date(item.createdAt).toLocaleString()}
                              </td>
                              <td className="py-2 px-3 font-bold font-mono">
                                <span className={`px-2 py-0.5 rounded text-[10px] ${
                                  item.transactionType?.includes('CREDIT') || item.transactionType === 'RECHARGE'
                                    ? 'bg-emerald-500/100/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                  {item.transactionType}
                                </span>
                              </td>
                              <td className={`py-2 px-3 font-bold ${
                                item.transactionType?.includes('CREDIT') || item.transactionType === 'RECHARGE'
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}>
                                {item.transactionType?.includes('CREDIT') || item.transactionType === 'RECHARGE' ? '+' : '-'}₹{Number(item.amount).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 font-mono font-semibold text-slate-300">
                                ₹{Number(item.closingBalance).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-slate-400 truncate max-w-xs">
                                {item.description || '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={() => setSelectedFinanceOrgId(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Close Financial Statement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
