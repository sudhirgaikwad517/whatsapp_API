import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Plus, Trash2, Tag, CheckCircle2, XCircle, X, Send, Sparkles } from 'lucide-react';
import { apiClient } from '../services/api.client';

interface Rule {
  id: string;
  name: string;
  keywords: string[];
  replyMessage: string;
  matchType: string;
  isActive: boolean;
  createdAt: string;
}

export const AutoResponder: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [rawKeywords, setRawKeywords] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  // Fetch rules dynamically from backend
  const { data: rules, isLoading } = useQuery<Rule[]>({
    queryKey: ['auto-responder-rules'],
    queryFn: async () => {
      const res = await apiClient.get('/auto-responder');
      return res.data.data;
    },
  });

  // Create rule mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const keywords = rawKeywords.split(',').map((k) => k.trim()).filter(Boolean);
      const res = await apiClient.post('/auto-responder', {
        name,
        keywords,
        replyMessage,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-responder-rules'] });
      setIsModalOpen(false);
      setName('');
      setRawKeywords('');
      setReplyMessage('');
      setError('');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to create auto-reply rule.');
    },
  });

  // Delete rule mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/auto-responder/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-responder-rules'] });
    },
  });

  // Toggle active rule mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiClient.put(`/auto-responder/${id}`, { isActive: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-responder-rules'] });
    },
  });

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-2xl backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Bot className="w-6 h-6 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">Automated Reply Bot Manager</h1>
          </div>
          <p className="text-xs text-slate-400">
            Create custom keyword triggers (e.g. "hi", "hiii", "hello", "price", "sample") and instant chatbot replies for your organization.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Keyword Rule</span>
        </button>
      </div>

      {/* Rules Table Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-xs">Loading auto-reply chatbot rules...</div>
        ) : !rules || rules.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Bot className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-400 font-semibold">No custom keyword rules created yet.</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click "Add New Keyword Rule" to set up your first automated WhatsApp chatbot response!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6">Rule Name</th>
                  <th className="py-4 px-6">Trigger Keywords</th>
                  <th className="py-4 px-6">Automated Reply Message</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-4 px-6 font-bold text-white flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{rule.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {rule.keywords.map((k) => (
                          <span
                            key={k}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[11px]"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-300 max-w-md whitespace-pre-line leading-relaxed">
                      {rule.replyMessage}
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => toggleActiveMutation.mutate({ id: rule.id, isActive: rule.isActive })}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border cursor-pointer transition-all ${
                          rule.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {rule.isActive ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ACTIVE</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" />
                            <span>INACTIVE</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Delete rule "${rule.name}"?`)) {
                            deleteMutation.mutate(rule.id);
                          }
                        }}
                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Rule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center">
                <Bot className="w-5 h-5 mr-2 text-emerald-400" />
                Add Automated Reply Rule
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg">
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
                createMutation.mutate();
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Greeting Rule, Sample Request"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Trigger Keywords (Comma Separated)
                </label>
                <input
                  type="text"
                  required
                  placeholder="hi, hiii, HIIII, hello, hey, start, sample"
                  value={rawKeywords}
                  onChange={(e) => setRawKeywords(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  When a customer texts ANY of these keywords, the automated reply will be sent.
                </p>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Automated Reply Message
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="👋 Hello! Thank you for reaching out to Shrishti Dairy Farm. How can we assist you today?"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 font-medium hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !name || !rawKeywords || !replyMessage}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center cursor-pointer"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  {createMutation.isPending ? 'Saving Rule...' : 'Save Keyword Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
