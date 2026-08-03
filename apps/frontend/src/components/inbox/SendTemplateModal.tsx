import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Send, FileCode2, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../services/api.client';

interface SendTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  onSuccess?: () => void;
}

export const SendTemplateModal: React.FC<SendTemplateModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates-list'],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/templates');
      return res.data.data;
    },
    enabled: isOpen,
  });

  const sendMutation = useMutation({
    mutationFn: async (tpl: any) => {
      const res = await apiClient.post(`/inbox/conversations/${conversationId}/template`, {
        templateName: tpl.name,
        language: tpl.language,
        components: [],
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      onSuccess?.();
      onClose();
    },
  });

  if (!isOpen) return null;

  const selectedTemplate = templates?.find((t: any) => t.id === selectedTemplateId);
  const bodyComponent = Array.isArray(selectedTemplate?.components)
    ? selectedTemplate.components.find((c: any) => c.type === 'BODY')
    : null;

  const handleSend = () => {
    if (!selectedTemplate) return;
    sendMutation.mutate(selectedTemplate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Send Meta Template Message</h3>
              <p className="text-xs text-slate-400">Re-engage contact after 24h window expiration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading approved Meta templates...</div>
          ) : !templates || templates.length === 0 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>No approved WhatsApp templates found. Please sync templates in Settings/Templates.</span>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Approved Template
                </label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">-- Choose Template --</option>
                  {templates.map((tpl: any) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} ({tpl.language}) • {tpl.category}
                    </option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-emerald-400 font-semibold">{selectedTemplate.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {selectedTemplate.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap pt-1">
                    {bodyComponent?.text || 'No preview available'}
                  </p>
                </div>
              )}
            </>
          )}

          {sendMutation.isError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
              {(sendMutation.error as any)?.response?.data?.error?.message || 'Failed to dispatch template message.'}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-6 border-t border-slate-800 flex justify-end space-x-3 bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!selectedTemplateId || sendMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl flex items-center text-sm shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4 mr-2" />
            {sendMutation.isPending ? 'Sending...' : 'Send Template'}
          </button>
        </div>
      </div>
    </div>
  );
};
