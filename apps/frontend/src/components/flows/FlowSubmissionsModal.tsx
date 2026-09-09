import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Database } from 'lucide-react';
import { apiClient } from '../../services/api.client';

interface FlowSubmissionsModalProps {
  flowId: string | null;
  flowName?: string;
  onClose: () => void;
}

export const FlowSubmissionsModal: React.FC<FlowSubmissionsModalProps> = ({ flowId, flowName, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['flow-submissions', flowId],
    queryFn: async () => {
      const res = await apiClient.get(`/flows/${flowId}/submissions`);
      return res.data.data;
    },
    enabled: Boolean(flowId),
  });

  if (!flowId) return null;

  const submissions = data?.submissions || [];
  // Union of every field key ever collected, so the table has a stable set
  // of columns even though different runs of the flow (or edits to it over
  // time) can collect different variables.
  const columns: string[] = Array.from(
    new Set(submissions.flatMap((s: any) => Object.keys(s.data || {})))
  ) as string[];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
          <h3 className="text-base font-bold text-white flex items-center">
            <Database className="w-5 h-5 mr-2 text-emerald-400" />
            Collected Data — {flowName || 'Flow'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {isLoading ? (
            <div className="text-center py-12 text-slate-500 text-xs">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No completed runs yet — data collected via this flow's "Save Data" node will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Phone</th>
                    {columns.map((col) => (
                      <th key={col} className="py-3 px-4">{col}</th>
                    ))}
                    <th className="py-3 px-4">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {submissions.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">
                        {[s.contact?.firstName, s.contact?.lastName].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-400">{s.contact?.phoneNumber}</td>
                      {columns.map((col) => (
                        <td key={col} className="py-3 px-4 text-slate-300">{String(s.data?.[col] ?? '—')}</td>
                      ))}
                      <td className="py-3 px-4 text-slate-400">{new Date(s.completedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
