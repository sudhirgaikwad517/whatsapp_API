import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Send, CheckCircle2, Eye, MessageSquare, AlertTriangle, Clock, History, User } from 'lucide-react';
import { apiClient } from '../../services/api.client';

interface ContactTimelineModalProps {
  isOpen: boolean;
  contactId: string | null;
  onClose: () => void;
}

export const ContactTimelineModal: React.FC<ContactTimelineModalProps> = ({
  isOpen,
  contactId,
  onClose,
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['contact-timeline', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      const res = await apiClient.get(`/contacts/${contactId}/timeline`);
      return res.data.data;
    },
    enabled: isOpen && Boolean(contactId),
  });

  if (!isOpen || !contactId) return null;

  const contact = data?.contact;
  const timeline = data?.timeline || [];

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'CAMPAIGN_SENT':
        return <Send className="w-4 h-4 text-sky-400" />;
      case 'CAMPAIGN_DELIVERED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'CAMPAIGN_READ':
        return <Eye className="w-4 h-4 text-purple-400" />;
      case 'CAMPAIGN_REPLIED':
      case 'INBOUND_MESSAGE':
        return <MessageSquare className="w-4 h-4 text-amber-400" />;
      case 'CAMPAIGN_FAILED':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {contact?.firstName || 'Contact Timeline'}
              </h3>
              <p className="text-xs text-slate-400 font-mono">{contact?.phoneNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center">
            <History className="w-4 h-4 mr-2 text-emerald-400" />
            Communication Activity History
          </h4>

          {isLoading ? (
            <div className="text-center py-8 text-slate-500 text-xs">Loading activity timeline...</div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">No campaign activities recorded yet.</div>
          ) : (
            <div className="relative pl-6 space-y-6 border-l-2 border-slate-800 ml-2">
              {timeline.map((item: any) => (
                <div key={item.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-[31px] top-0.5 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center">
                    {getEventIcon(item.type)}
                  </div>

                  <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-2xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{item.title}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-slate-400">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
