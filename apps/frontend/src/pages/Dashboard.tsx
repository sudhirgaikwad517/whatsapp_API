import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Send, CheckCheck, Eye, AlertCircle, Users, MessageSquare } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const Dashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/overview');
      return res.data.data;
    },
  });

  const stats = [
    { label: 'Total Contacts', value: data?.totalContacts ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Active Conversations', value: data?.totalConversations ?? 0, icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Messages Sent', value: data?.totalMessagesSent ?? 0, icon: Send, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Messages Delivered', value: data?.totalMessagesDelivered ?? 0, icon: CheckCheck, color: 'text-teal-400', bg: 'bg-teal-500/10' },
    { label: 'Messages Read', value: data?.totalMessagesRead ?? 0, icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Messages Failed', value: data?.totalMessagesFailed ?? 0, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
  ];

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard Analytics</h1>
        <p className="text-sm text-slate-400 mt-1">Realtime Meta WhatsApp Cloud API Delivery Performance</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading performance metrics...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stats.map((stat, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-between shadow-xl">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{stat.label}</p>
                  <h3 className="text-3xl font-extrabold text-white mt-1">{stat.value.toLocaleString()}</h3>
                </div>
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h4 className="font-semibold text-white">Delivery Success Rate</h4>
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl font-extrabold text-emerald-400">{data?.metrics?.deliveryRatePercent ?? 0}%</span>
                <span className="text-xs text-slate-400">Delivered vs Sent</span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${data?.metrics?.deliveryRatePercent ?? 0}%` }} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h4 className="font-semibold text-white">Read Engagement Rate</h4>
              <div className="flex items-baseline space-x-3">
                <span className="text-4xl font-extrabold text-teal-400">{data?.metrics?.readRatePercent ?? 0}%</span>
                <span className="text-xs text-slate-400">Read vs Delivered</span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${data?.metrics?.readRatePercent ?? 0}%` }} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
