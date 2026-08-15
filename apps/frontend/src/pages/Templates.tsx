import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileCode2, RefreshCw, CheckCircle2, MessageSquare, Plus } from 'lucide-react';
import { apiClient } from '../services/api.client';
import { CreateTemplateModal } from '../components/templates/CreateTemplateModal';
import { EditTemplateModal } from '../components/templates/EditTemplateModal';

export const Templates: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates-list'],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/templates');
      return res.data.data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/whatsapp/templates/sync');
      return res.data.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['templates-list'] });
      alert(`✅ Success! Synced ${data?.syncedCount || 0} template(s) from Meta Graph API!`);
    },
    onError: (err: any) => {
      alert(`❌ Sync Failed: ${err?.response?.data?.error?.message || err.message}`);
    },
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 w-full min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center">
            <FileCode2 className="w-6 h-6 sm:w-7 sm:h-7 mr-3 text-emerald-400 shrink-0" />
            <span>Meta Message Templates</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Create, Submit & Manage Official Graph API Approved WhatsApp Templates (In-Dashboard Management)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 sm:ml-auto">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span>Create Meta Template</span>
          </button>

          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center border border-slate-700 text-xs sm:text-sm transition-all disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 mr-2 stroke-[2.5] ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync Meta Templates'}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading templates...</div>
      ) : templates?.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
          <FileCode2 className="w-12 h-12 text-emerald-400 mx-auto stroke-1" />
          <h3 className="text-lg font-bold text-white">Meta Graph API Template Synchronization</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Click "Sync Meta Templates" above to import your Meta Business Manager approved templates (Utility, Marketing, Authentication).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates?.map((tpl: any) => {
            const bodyComponent = Array.isArray(tpl.components)
              ? tpl.components.find((c: any) => c.type === 'BODY')
              : null;
            const bodyText = bodyComponent?.text || 'No text body defined';

            return (
              <div key={tpl.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-xl">
                {/* Header info */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-emerald-400 truncate">{tpl.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                      {tpl.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase font-semibold">{tpl.category}</span>
                    <span>•</span>
                    <span className="font-mono">{tpl.language}</span>
                  </div>
                </div>

                {/* Simulated Phone Chat Bubble */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2 relative font-sans">
                  <div className="flex items-center text-[10px] text-slate-500 mb-1">
                    <MessageSquare className="w-3 h-3 mr-1 text-emerald-500" />
                    WhatsApp Business Template Preview
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                    {bodyText}
                  </p>
                </div>

                {/* Footer */}
                <div className="text-[10px] text-slate-500 flex justify-between items-center border-t border-slate-800/60 pt-3">
                  <span>ID: {tpl.metaTemplateId || tpl.id.slice(0, 8)}</span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setEditingTemplate(tpl)}
                      className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors"
                    >
                      Edit Config
                    </button>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateTemplateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />
      <EditTemplateModal isOpen={!!editingTemplate} onClose={() => setEditingTemplate(null)} template={editingTemplate} />
    </div>
  );
};
