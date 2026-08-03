import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  BarChart3,
  Send,
  CheckCircle2,
  Eye,
  MessageSquare,
  AlertTriangle,
  Clock,
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';

interface CampaignAnalyticsModalProps {
  isOpen: boolean;
  campaignId: string | null;
  onClose: () => void;
}

export const CampaignAnalyticsModal: React.FC<CampaignAnalyticsModalProps> = ({
  isOpen,
  campaignId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Fetch campaign analytics summary
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['campaign-analytics', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await apiClient.get(`/campaigns/${campaignId}/analytics`);
      return res.data.data;
    },
    enabled: isOpen && Boolean(campaignId),
    refetchInterval: 3000,
  });

  // Fetch tabbed recipient status records
  const { data: recipientsData, isLoading: isRecipientsLoading } = useQuery({
    queryKey: ['campaign-recipients', campaignId, activeTab, searchQuery, page],
    queryFn: async () => {
      if (!campaignId) return null;
      const res = await apiClient.get(`/campaigns/${campaignId}/recipients`, {
        params: {
          tab: activeTab,
          search: searchQuery,
          page,
          limit: 20,
        },
      });
      return res.data.data;
    },
    enabled: isOpen && Boolean(campaignId),
    refetchInterval: 3000,
  });

  if (!isOpen || !campaignId) return null;

  const tabs = [
    { id: 'ALL', label: 'All Audience', count: analytics?.totalTarget || 0, color: 'text-slate-300' },
    { id: 'SENT', label: 'Sent', count: analytics?.sentCount || 0, color: 'text-sky-400' },
    { id: 'DELIVERED', label: 'Delivered', count: analytics?.deliveredCount || 0, color: 'text-emerald-400' },
    { id: 'READ', label: 'Read', count: analytics?.readCount || 0, color: 'text-purple-400' },
    { id: 'REPLIED', label: 'Replied', count: analytics?.repliedCount || 0, color: 'text-amber-400' },
    { id: 'FAILED', label: 'Failed', count: analytics?.failedCount || 0, color: 'text-rose-400' },
    { id: 'PENDING', label: 'Pending', count: analytics?.pendingCount || 0, color: 'text-slate-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-3">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {analytics?.name || 'Campaign Analytics'}
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                {analytics?.status || 'PROCESSING'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Template: <span className="text-slate-200 font-semibold">{analytics?.template?.name || '—'}</span> • Created At:{' '}
              {analytics?.createdAt ? new Date(analytics.createdAt).toLocaleString() : '—'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── 1. Campaign Analytics KPI Cards ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Total Audience</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-white">{analytics?.totalTarget?.toLocaleString() || 0}</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-sky-400 text-xs font-semibold mb-1">
              <span>Sent Messages</span>
              <Send className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-bold text-sky-400">{analytics?.sentCount?.toLocaleString() || 0}</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold mb-1">
              <span>Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{analytics?.deliveredCount?.toLocaleString() || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Delivery Rate: {analytics?.deliveryRate || 0}%</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-purple-400 text-xs font-semibold mb-1">
              <span>Read</span>
              <Eye className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-purple-400">{analytics?.readCount?.toLocaleString() || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Read Rate: {analytics?.readRate || 0}%</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-amber-400 text-xs font-semibold mb-1">
              <span>Replies Received</span>
              <MessageSquare className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-400">{analytics?.repliedCount?.toLocaleString() || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">Reply Rate: {analytics?.replyRate || 0}%</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-rose-400 text-xs font-semibold mb-1">
              <span>Failed</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-bold text-rose-400">{analytics?.failedCount?.toLocaleString() || 0}</p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl col-span-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span>Delivery & Read Performance</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="space-y-1.5 mt-2">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Delivery: {analytics?.deliveryRate || 0}%</span>
                <span>Read: {analytics?.readRate || 0}%</span>
                <span>Reply: {analytics?.replyRate || 0}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div style={{ width: `${analytics?.deliveryRate || 0}%` }} className="bg-emerald-500 h-full" />
                <div style={{ width: `${analytics?.readRate || 0}%` }} className="bg-purple-500 h-full" />
                <div style={{ width: `${analytics?.replyRate || 0}%` }} className="bg-amber-500 h-full" />
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. Campaign Status Tabs ───────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 overflow-x-auto">
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setPage(1);
                    }}
                    className={`px-4 py-2.5 text-xs font-bold flex items-center space-x-2 border-b-2 transition-all whitespace-nowrap ${
                      isActive
                        ? 'border-emerald-500 text-white bg-slate-800/40'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] bg-slate-800 ${
                        isActive ? 'text-emerald-400 font-bold' : tab.color
                      }`}
                    >
                      {tab.count.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search contact or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 w-52"
              />
            </div>
          </div>

          {/* Recipient Table */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Phone (Snapshot)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Timestamps</th>
                  <th className="py-3 px-4">Meta Error Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {isRecipientsLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      Loading recipients data...
                    </td>
                  </tr>
                ) : recipientsData?.recipients?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-500">
                      No contact records found in "{activeTab}" tab.
                    </td>
                  </tr>
                ) : (
                  recipientsData?.recipients?.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-slate-900/50 transition-all">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {rec.nameSnapshot || rec.contact?.firstName || 'Customer'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        {rec.phoneNumberSnapshot || rec.contact?.phoneNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rec.status === 'SENT'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : rec.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : rec.status === 'READ'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : rec.status === 'REPLIED'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : rec.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px] space-y-0.5">
                        {rec.sentAt && <div>Sent: {new Date(rec.sentAt).toLocaleTimeString()}</div>}
                        {rec.deliveredAt && <div className="text-emerald-400">Delivered: {new Date(rec.deliveredAt).toLocaleTimeString()}</div>}
                        {rec.readAt && <div className="text-purple-400">Read: {new Date(rec.readAt).toLocaleTimeString()}</div>}
                        {rec.repliedAt && <div className="text-amber-400">Replied: {new Date(rec.repliedAt).toLocaleTimeString()}</div>}
                        {!rec.sentAt && !rec.deliveredAt && <div>Created: {new Date(rec.updatedAt).toLocaleTimeString()}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        {rec.status === 'FAILED' ? (
                          <div className="text-rose-400 bg-rose-500/10 border border-rose-500/20 p-1.5 rounded-lg text-[11px]">
                            <span className="font-bold">Code {rec.errorCode || 'ERR'}:</span>{' '}
                            {rec.errorMessage || 'Meta dispatch error'}
                          </div>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            {recipientsData && recipientsData.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-t border-slate-800 text-xs text-slate-400">
                <span>
                  Page {recipientsData.page} of {recipientsData.totalPages} ({recipientsData.total} Total)
                </span>
                <div className="flex space-x-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= recipientsData.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
