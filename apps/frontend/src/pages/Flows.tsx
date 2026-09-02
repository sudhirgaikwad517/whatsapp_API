import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { GitFork, Plus, Edit3, Trash2, Power, Zap, MessageSquare, Bot } from 'lucide-react';
import { apiClient } from '../services/api.client';
import { FlowBuilder } from '../components/flows/FlowBuilder';
import { confirmAction } from '../components/ui/ConfirmDialog';

export const Flows: React.FC = () => {
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const queryClient = useQueryClient();

  const { data: flows, isLoading } = useQuery({
    queryKey: ['flows-list'],
    queryFn: async () => {
      const res = await apiClient.get('/flows');
      return res.data.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/flows/${id}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows-list'] });
      toast.success('Flow deleted successfully.');
    },
    onError: (err: any) => {
      toast.error('Failed to delete flow', { description: err.message });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiClient.put(`/flows/${id}`, { isActive });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flows-list'] });
    },
  });

  if (activeFlowId || isCreating) {
    return (
      <FlowBuilder
        flowId={activeFlowId}
        onClose={() => {
          setActiveFlowId(null);
          setIsCreating(false);
          queryClient.invalidateQueries({ queryKey: ['flows-list'] });
        }}
      />
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center">
            <GitFork className="w-6 h-6 sm:w-7 sm:h-7 mr-3 text-emerald-400 shrink-0" />
            <span>Visual WhatsApp Chatbot Flow Builder</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Build interactive multi-step chatbot flows with drag-and-drop nodes & automated triggers.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="w-full sm:w-auto justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-emerald-500/20 text-sm transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 mr-2 stroke-[3]" />
          Create Chatbot Flow
        </button>
      </div>

      {/* Flows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-slate-500 text-xs">Loading chatbot flows...</div>
        ) : !flows || flows.length === 0 ? (
          <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <Bot className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Chatbot Flows Created Yet</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Create visual drag-and-drop flows to auto-reply to customer keywords like "hi", "pricing", or "support" with interactive buttons!
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              Build Your First Flow
            </button>
          </div>
        ) : (
          flows.map((flow: any) => (
            <div key={flow.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${flow.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                      {flow.isActive ? 'Active Flow' : 'Disabled'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleMutation.mutate({ id: flow.id, isActive: !flow.isActive })}
                    className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer ${
                      flow.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                    title="Toggle Active Status"
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base truncate">{flow.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-xs font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 truncate">
                      Keyword: "{flow.triggerKeyword || 'None'}"
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500">
                  Updated: {new Date(flow.updatedAt).toLocaleDateString()}
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveFlowId(flow.id)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs border border-slate-700 transition-all flex items-center cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1" />
                    Edit Flow
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await confirmAction({
                        title: `Delete chatbot flow "${flow.name}"?`,
                        message: 'This cannot be undone.',
                        danger: true,
                        confirmLabel: 'Delete',
                      });
                      if (ok) deleteMutation.mutate(flow.id);
                    }}
                    className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                    title="Delete Flow"
                    aria-label="Delete flow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
