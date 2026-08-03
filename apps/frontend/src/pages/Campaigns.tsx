import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Calendar, CheckCircle2, Clock, Trash2, RotateCw } from 'lucide-react';
import { apiClient } from '../services/api.client';
import { CreateCampaignModal } from '../components/campaigns/CreateCampaignModal';

export const Campaigns: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  const handleRetryCampaign = async (id: string, name: string) => {
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

  const handleDeleteCampaign = async (id: string, name: string) => {
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
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Marketing Campaigns</h1>
          <p className="text-sm text-slate-400 mt-1">Bulk WhatsApp Template Broadcast Manager</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center shadow-lg shadow-emerald-500/20 transition-all text-sm"
        >
          <Plus className="w-4 h-4 mr-2 stroke-[3]" />
          Create Campaign
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading campaign dispatches...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-4 px-6">Campaign Name</th>
                <th className="py-4 px-6">Template</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Target Audience</th>
                <th className="py-4 px-6">Sent / Delivered</th>
                <th className="py-4 px-6">Created At</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
              {campaigns?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No marketing campaigns created yet. Click "Create Campaign" to launch a broadcast.
                  </td>
                </tr>
              ) : (
                campaigns?.map((camp: any) => (
                  <tr key={camp.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-4 px-6 font-semibold text-white">{camp.name}</td>
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
                    <td className="py-4 px-6 font-semibold">{camp.totalTarget.toLocaleString()} contacts</td>
                    <td className="py-4 px-6 text-slate-300">
                      {camp.sentCount} / <span className="text-emerald-400 font-semibold">{camp.deliveredCount}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-400 text-xs">
                      {new Date(camp.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right flex items-center justify-end space-x-2">
                      {camp.sentCount < camp.totalTarget && (
                        <button
                          onClick={() => handleRetryCampaign(camp.id, camp.name)}
                          disabled={retryingId === camp.id}
                          title="Retry/Resume Unsent Campaign Messages"
                          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-semibold flex items-center transition-all disabled:opacity-50"
                        >
                          <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${retryingId === camp.id ? 'animate-spin' : ''}`} />
                          Retry
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                        disabled={deletingId === camp.id}
                        title="Delete Campaign"
                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <CreateCampaignModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
    </div>
  );
};
