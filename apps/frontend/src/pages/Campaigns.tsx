import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Calendar, CheckCircle2, Clock, Trash2, RotateCw, BarChart3, Eye } from 'lucide-react';
import { apiClient } from '../services/api.client';
import { CreateCampaignModal } from '../components/campaigns/CreateCampaignModal';
import { CampaignAnalyticsModal } from '../components/campaigns/CampaignAnalyticsModal';

export const Campaigns: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const res = await apiClient.get('/campaigns');
      return res.data.data;
    },
    refetchInterval: 3000,
  });

  const handleRetryCampaign = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setRetryingId(id);
      const res = await apiClient.post(`/campaigns/${id}/retry`);
      alert(res.data.data?.message || `Campaign "${name}" resumed! Re-queued messages for dispatch.`);
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (err: any) {
      alert(`Failed to retry campaign: ${err?.response?.data?.error?.message || err.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const handleDeleteCampaign = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete campaign "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(id);
      await apiClient.delete(`/campaigns/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    } catch (err: any) {
      alert(`Failed to delete campaign: ${err?.response?.data?.error?.message || err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Marketing Campaigns</h1>
          <p className="text-sm text-slate-400 mt-1">Bulk WhatsApp Template Broadcast Manager & Analytics</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center shadow-lg shadow-emerald-500/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4 mr-2 stroke-[3]" />
          Create Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading campaign dispatches...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-4 px-6">Campaign Name</th>
                <th className="py-4 px-6">Template</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Total Audience</th>
                <th className="py-4 px-6">Sent / Delivered / Read</th>
                <th className="py-4 px-6">Rates (Del / Read)</th>
                <th className="py-4 px-6">Created At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
              {campaigns?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No marketing campaigns created yet. Click "Create Campaign" to launch a broadcast.
                  </td>
                </tr>
              ) : (
                campaigns?.map((camp: any) => (
                  <tr
                    key={camp.id}
                    onClick={() => setSelectedAnalyticsId(camp.id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-all"
                  >
                    <td className="py-4 px-6 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <span>{camp.name}</span>
                        <BarChart3 className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100" />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-400">{camp.template?.name || '—'}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          camp.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : camp.status === 'PROCESSING'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-semibold">{camp.totalTarget?.toLocaleString()} contacts</td>
                    <td className="py-4 px-6 text-slate-300 text-xs">
                      {camp.sentCount} / <span className="text-emerald-400 font-semibold">{camp.deliveredCount}</span> /{' '}
                      <span className="text-purple-400 font-semibold">{camp.readCount}</span>
                    </td>
                    <td className="py-4 px-6 text-xs">
                      <span className="text-emerald-400 font-bold">{camp.deliveryRate}%</span> /{' '}
                      <span className="text-purple-400 font-bold">{camp.readRate}%</span>
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-xs">
                      {new Date(camp.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAnalyticsId(camp.id);
                          }}
                          title="View Detailed Analytics & Status Tabs"
                          className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center transition-all"
                        >
                          <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                          Analytics
                        </button>
                        {(camp.status === 'PAUSED' || camp.status === 'PROCESSING') && (
                          <button
                            onClick={(e) => handleRetryCampaign(camp.id, camp.name, e)}
                            disabled={retryingId === camp.id}
                            title="Resume Pending Unsent Messages"
                            className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-semibold flex items-center transition-all disabled:opacity-50"
                          >
                            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${retryingId === camp.id ? 'animate-spin' : ''}`} />
                            Resume
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteCampaign(camp.id, camp.name, e)}
                          disabled={deletingId === camp.id}
                          title="Delete Campaign"
                          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <CreateCampaignModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <CampaignAnalyticsModal
        isOpen={Boolean(selectedAnalyticsId)}
        campaignId={selectedAnalyticsId}
        onClose={() => setSelectedAnalyticsId(null)}
      />
    </div>
  );
};
