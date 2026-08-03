import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Send, CheckCheck, Eye, AlertTriangle, Users, MessageSquare } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const Analytics: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/overview');
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-emerald-400" />
          Analytics & Performance Metrics
        </h1>
        <p className="text-sm text-slate-400 mt-1">Real-time WhatsApp Delivery, Engagement Ratios & Audience Insights</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading analytics metrics...</div>
      ) : (
        <>
          {/* Key Stat Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Total Outbound Sent</span>
                <Send className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-white">{data?.totalMessagesSent?.toLocaleString() || 0}</p>
              <p className="text-xs text-slate-500">Total Meta API dispatches</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Delivery Success Rate</span>
                <CheckCheck className="w-4 h-4 text-sky-400" />
              </div>
              <p className="text-3xl font-black text-sky-400">{data?.metrics?.deliveryRatePercent || 0}%</p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-sky-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(data?.metrics?.deliveryRatePercent || 0, 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Read Engagement Rate</span>
                <Eye className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-3xl font-black text-purple-400">{data?.metrics?.readRatePercent || 0}%</p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-purple-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(data?.metrics?.readRatePercent || 0, 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Audience Contacts</span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-3xl font-black text-emerald-400">{data?.totalContacts?.toLocaleString() || 0}</p>
              <p className="text-xs text-slate-500">Opted-in WhatsApp profiles</p>
            </div>
          </div>

          {/* Detailed Message Status Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <h3 className="text-lg font-bold text-white">Message Delivery Lifecycle Breakdown</h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Sent</span>
                <p className="text-2xl font-bold text-white">{data?.totalMessagesSent || 0}</p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Delivered</span>
                <p className="text-2xl font-bold text-sky-400">{data?.totalMessagesDelivered || 0}</p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Read</span>
                <p className="text-2xl font-bold text-purple-400">{data?.totalMessagesRead || 0}</p>
              </div>

              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Failed</span>
                <p className="text-2xl font-bold text-rose-400">{data?.totalMessagesFailed || 0}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
