import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Send, CheckCheck, Eye, AlertTriangle, Users, MessageSquare, Clock, RefreshCw } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const Analytics: React.FC = () => {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/overview');
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  const { data: slaData } = useQuery({
    queryKey: ['analytics-sla'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/sla');
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
      ) : isError ? (
        <div className="text-center py-12 space-y-3">
          <p className="text-sm text-rose-400">Couldn't load analytics right now. Please check your connection and try again.</p>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold border border-slate-700 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
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

          {/* SLA Performance & Multi-Agent Leaderboard Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-emerald-400" />
                  <span>SLA Response Metrics & Agent Performance Leaderboard</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tracks First Response Time (FRT), resolution velocity & Round-Robin workload distribution per team agent.
                </p>
              </div>
            </div>

            {/* SLA Stat Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Avg First Response Time (FRT)</span>
                <p className="text-2xl font-black text-emerald-400">
                  {slaData?.avgFRTMinutes ? `${slaData.avgFRTMinutes} mins` : 'Immediate (<1m)'}
                </p>
                <span className="text-[10px] text-slate-500 block">Time to first outbound agent reply</span>
              </div>

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Avg Resolution Time</span>
                <p className="text-2xl font-black text-sky-400">
                  {slaData?.avgResolutionMinutes ? `${slaData.avgResolutionMinutes} mins` : 'N/A'}
                </p>
                <span className="text-[10px] text-slate-500 block">Time to close/resolve chat</span>
              </div>

              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400 uppercase">Active Conversations Managed</span>
                <p className="text-2xl font-black text-purple-400">
                  {slaData?.totalConversations || 0}
                </p>
                <span className="text-[10px] text-slate-500 block">Multi-agent Round-Robin assigned</span>
              </div>
            </div>

            {/* Agent Leaderboard Table */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Agent Name</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Assigned Chats</th>
                    <th className="py-3.5 px-4">Resolved Chats</th>
                    <th className="py-3.5 px-4 text-right">Avg FRT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {!slaData?.agentLeaderboard || slaData.agentLeaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-500">
                        No team agents assigned to conversations yet.
                      </td>
                    </tr>
                  ) : (
                    slaData.agentLeaderboard.map((agent: any) => (
                      <tr key={agent.agentId} className="hover:bg-slate-900/50 transition-all">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{agent.name}</div>
                          <div className="text-[10px] text-slate-500">{agent.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] uppercase font-bold">
                            {agent.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          {agent.totalAssigned}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                          {agent.resolvedCount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-purple-300">
                          {agent.avgFRTMinutes ? `${agent.avgFRTMinutes}m` : '<1m'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
