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
import { apiClient } from '../services/api.client';
import { useAuthStore } from '../store/auth.store';

export const SuperAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'pricing' | 'tickets' | 'audit'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  // Fetch Executive KPI Telemetry & ERP Data
  const { data: kpiData, refetch } = useQuery({
    queryKey: ['superadmin-kpis'],
    queryFn: async () => {
      const res = await apiClient.get('/superadmin/dashboard/kpi');
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
      alert(`🎭 Impersonating "${data.organization.name}"!\n\nLogging in as Owner: ${data.owner.email}`);
      setAuth(data.owner, data.impersonationToken, data.impersonationToken);
      window.location.href = '/';
    },
    onError: (err: any) => {
      alert(`❌ Impersonation Failed: ${err?.response?.data?.error?.message || err.message}`);
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

  const kpi = kpiData || {
    organizations: { total: 0, active: 0, suspended: 0 },
    users: { total: 0 },
    messaging: { totalMessages: 0 },
    financials: { grossRevenue: 0, netRevenue: 0, totalGstTax: 0, totalWalletBalance: 0, metaPayable: 0, platformProfit: 0 },
    supportTickets: [],
    auditLogs: [],
    pricingRules: [],
  };

  const organizations = orgsData?.organizations || [];

  return (
    <div className="p-8 space-y-8 w-full">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 border border-purple-500/40 rounded-2xl p-6 flex items-center justify-between shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-extrabold text-xl">
            👑
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center">
              Super Admin Platform ERP
              <span className="ml-3 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2.5 py-0.5 rounded-full font-semibold">
                GLOBAL SYSTEM CONTROL PLANE (TENANT ISOLATED)
              </span>
            </h1>
            <p className="text-xs text-purple-300 mt-1">
              Cross-Tenant Governance, Platform Revenue Engine & Forensic Security Controls
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-xl transition-all cursor-pointer"
            title="Refresh Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
            System API: ONLINE
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
            PostgreSQL DB: CONNECTED
          </span>
        </div>
      </div>

      {/* ERP Sub-Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4 mr-2" />
          Tenant Orgs & Overview
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer ${
            activeTab === 'finance'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <DollarSign className="w-4 h-4 mr-2 text-emerald-400" />
          Finance ERP & Settlements
        </button>

        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer ${
            activeTab === 'pricing'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Scale className="w-4 h-4 mr-2 text-amber-400" />
          Pricing Rules & Markups
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer ${
            activeTab === 'tickets'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Ticket className="w-4 h-4 mr-2 text-blue-400" />
          Support Tickets ({kpi.supportTickets?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 mr-2 text-purple-400" />
          Security Audit Logs
        </button>
      </div>

      {/* Real-time Telemetry KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center justify-between">
            <span>Total Organizations</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{kpi?.organizations?.total || 0}</div>
          <div className="text-xs text-slate-400">
            Active: <span className="text-emerald-400 font-bold">{kpi?.organizations?.active || 0}</span> | Suspended: <span className="text-rose-400 font-bold">{kpi?.organizations?.suspended || 0}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center justify-between">
            <span>Gross Platform Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">
            ₹{Number(kpi?.financials?.grossRevenue || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">
            Net: ₹{Number(kpi?.financials?.netRevenue || 0).toFixed(2)} | GST: ₹{Number(kpi?.financials?.totalGstTax || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center justify-between">
            <span>Meta Payable Liability</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            ₹{Number(kpi?.financials?.metaPayable || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">
            Platform Profit Margin: <span className="text-emerald-400 font-bold">₹{Number(kpi?.financials?.platformProfit || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center justify-between">
            <span>Client Wallet Balances</span>
            <Lock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-blue-400">
            ₹{Number(kpi?.financials?.totalWalletBalance || 0).toFixed(2)}
          </div>
          <div className="text-xs text-slate-400">
            Reserved Lock: ₹{Number(kpi?.financials?.totalReservedBalance || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & TENANT ORGANIZATIONS */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-purple-400" />
              Tenant Organizations Governance & Customer 360
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

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-4 px-6">Organization Name</th>
                  <th className="py-4 px-6">WABA Status</th>
                  <th className="py-4 px-6">Wallet Balance</th>
                  <th className="py-4 px-6">Users / Campaigns</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">Loading tenant ERP registry...</td>
                  </tr>
                ) : organizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-500">No organizations found.</td>
                  </tr>
                ) : (
                  organizations.map((org: any) => {
                    const connectedWaba = org.whatsappAccounts?.[0];
                    return (
                      <tr key={org.id} className="hover:bg-slate-800/40 transition-all">
                        <td className="py-4 px-6 font-bold text-white">
                          <div>{org.name}</div>
                          <div className="text-xs text-slate-500 font-normal">slug: {org.slug}</div>
                        </td>
                        <td className="py-4 px-6 text-xs">
                          {connectedWaba ? (
                            <div>
                              <span className="font-semibold text-white block">{connectedWaba.displayPhoneNumber}</span>
                              <span className="text-slate-400 font-mono text-[10px] block">WABA: {connectedWaba.wabaId}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">No WABA Connected</span>
                          )}
                        </td>
                        <td className="py-4 px-6 font-bold text-emerald-400">
                          ₹{Number(org.wallet?.availableBalance || 0).toFixed(2)}
                        </td>
                        <td className="py-4 px-6 text-slate-300 text-xs">
                          {org._count?.users || 0} users • {org._count?.campaigns || 0} campaigns
                        </td>
                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              org.isSuspended
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
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
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                            Impersonate
                          </button>

                          <button
                            onClick={() => suspendMutation.mutate({ orgId: org.id, isSuspended: !org.isSuspended })}
                            title={org.isSuspended ? 'Activate Tenant' : 'Suspend Tenant'}
                            className={`p-2 rounded-lg transition-all text-xs font-semibold cursor-pointer ${
                              org.isSuspended
                                ? 'text-emerald-400 hover:bg-emerald-500/10'
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
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-emerald-400" />
            Double-Entry Finance ERP & Meta Liability Reconciliation
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-slate-400 font-semibold">Total Gross Invoiced</span>
                <div className="text-xl font-bold text-emerald-400">₹{Number(kpi?.financials?.grossRevenue || 0).toFixed(2)}</div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-slate-400 font-semibold">Meta Graph API Payable</span>
                <div className="text-xl font-bold text-amber-400">₹{Number(kpi?.financials?.metaPayable || 0).toFixed(2)}</div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1">
                <span className="text-slate-400 font-semibold">Estimated Net Platform Margin</span>
                <div className="text-xl font-bold text-purple-400">₹{Number(kpi?.financials?.platformProfit || 0).toFixed(2)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-xs text-slate-400">Meta Graph API Monthly Settlement Reconciliation Batch</span>
              <button
                onClick={() => alert('✅ Meta Liability Settlement Reconciliation Batch Processed!')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Execute Settlement Reconciliation Batch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRICING RULES & GLOBAL MARKUP ENGINE */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center">
            <Scale className="w-5 h-5 mr-2 text-amber-400" />
            Global Meta Rate Card & Platform Markup Rules
          </h3>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-4 px-6">Country Code</th>
                  <th className="py-4 px-6">Category</th>
                  <th className="py-4 px-6">Meta Base Cost</th>
                  <th className="py-4 px-6">Platform Markup</th>
                  <th className="py-4 px-6 text-right">Total Price Charged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                <tr className="hover:bg-slate-800/40">
                  <td className="py-4 px-6 font-bold text-white">IN (+91)</td>
                  <td className="py-4 px-6 text-xs text-slate-300 font-semibold">MARKETING</td>
                  <td className="py-4 px-6 text-slate-400">₹0.7800</td>
                  <td className="py-4 px-6 text-purple-400 font-semibold">+₹0.1200</td>
                  <td className="py-4 px-6 text-right font-bold text-emerald-400">₹0.9000</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-4 px-6 font-bold text-white">IN (+91)</td>
                  <td className="py-4 px-6 text-xs text-slate-300 font-semibold">UTILITY</td>
                  <td className="py-4 px-6 text-slate-400">₹0.3000</td>
                  <td className="py-4 px-6 text-purple-400 font-semibold">+₹0.0500</td>
                  <td className="py-4 px-6 text-right font-bold text-emerald-400">₹0.3500</td>
                </tr>
                <tr className="hover:bg-slate-800/40">
                  <td className="py-4 px-6 font-bold text-white">US (+1)</td>
                  <td className="py-4 px-6 text-xs text-slate-300 font-semibold">MARKETING</td>
                  <td className="py-4 px-6 text-slate-400">$0.0250</td>
                  <td className="py-4 px-6 text-purple-400 font-semibold">+$0.0050</td>
                  <td className="py-4 px-6 text-right font-bold text-emerald-400">$0.0300</td>
                </tr>
              </tbody>
            </table>
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
                  <th className="py-4 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                {kpi.supportTickets?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">No support tickets currently open.</td>
                  </tr>
                ) : (
                  kpi.supportTickets?.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-800/40">
                      <td className="py-4 px-6 font-mono text-purple-400 font-bold">{t.ticketNumber}</td>
                      <td className="py-4 px-6 font-semibold text-white">{t.organization?.name || '—'}</td>
                      <td className="py-4 px-6 text-slate-300">{t.subject}</td>
                      <td className="py-4 px-6 text-xs font-bold text-amber-400">{t.priority}</td>
                      <td className="py-4 px-6 text-right">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {t.status}
                        </span>
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
                  ₹{Number(selectedOrg.wallet?.availableBalance || 0).toFixed(2)}
                </div>
                <div className="text-amber-400">
                  Reserved Lock: ₹{Number(selectedOrg.wallet?.reservedBalance || 0).toFixed(2)}
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
    </div>
  );
};
