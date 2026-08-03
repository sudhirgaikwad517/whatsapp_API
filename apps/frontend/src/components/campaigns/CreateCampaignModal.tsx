import React, { useState } from 'react';
import { X, Megaphone, CheckCircle, Send } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api.client';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  // Fetch approved Meta templates
  const { data: templates } = useQuery({
    queryKey: ['templates-list'],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/templates');
      return res.data.data;
    },
    enabled: isOpen,
  });

  const launchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/campaigns', {
        name,
        templateId,
        headerMediaUrl,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setName('');
      setTemplateId('');
      setHeaderMediaUrl('');
      setError('');
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to launch marketing campaign.');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Megaphone className="w-5 h-5 mr-2 text-emerald-400" />
            Launch Bulk WhatsApp Campaign
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            launchMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Campaign Broadcast Name
            </label>
            <input
              type="text"
              required
              placeholder="Summer Discount Sale 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Select Approved WhatsApp Template
            </label>
            {templates && templates.length > 0 ? (
              <select
                required
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Choose Approved Template --</option>
                {templates.map((tpl: any) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.language}) — [{tpl.status}]
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                placeholder="Template name e.g. hello_world"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Header Image / Media URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://your-domain.com/dairy-banner.jpg (or Imgur / PostImages link)"
              value={headerMediaUrl}
              onChange={(e) => setHeaderMediaUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Provide a public image link (JPG/PNG). Leave blank for text-only templates.
            </p>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={launchMutation.isPending || !name || !templateId}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {launchMutation.isPending ? 'Enqueuing Broadcast...' : 'Launch Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
