import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Zap, ShieldCheck, ArrowUpRight, PlusCircle, Sparkles, CheckCircle2, History } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const Billing: React.FC = () => {
  const [rechargeAmount, setRechargeAmount] = useState('1000');
  const queryClient = useQueryClient();

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: async () => {
      const res = await apiClient.get('/billing/wallet');
      return res.data.data;
    },
  });

  const { data: creditsData } = useQuery({
    queryKey: ['ai-credits-balance'],
    queryFn: async () => {
      const res = await apiClient.get('/billing/credits');
      return res.data.data;
    },
  });

  const { data: ledgerData } = useQuery({
    queryKey: ['wallet-ledger'],
    queryFn: async () => {
      const res = await apiClient.get('/billing/ledger');
      return res.data.data;
    },
  });

  const topupCreditsMutation = useMutation({
    mutationFn: async (bundleAmount: number) => {
      const res = await apiClient.post('/billing/topup-credits', { amount: bundleAmount });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-credits-balance'] });
      alert('🪙 AI Credits Bundle added successfully!');
    },
    onError: (err: any) => {
      alert(`Top-up failed: ${err.message}`);
    },
  });

  const walletRechargeMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiClient.post('/billing/recharge-wallet', { amount });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-ledger'] });
      alert('💳 Wallet Balance recharged successfully!');
    },
    onError: (err: any) => {
      alert(`Recharge failed: ${err.message}`);
    },
  });

  const availableBalance = walletData?.availableBalance ? Number(walletData.availableBalance) : 0;
  const aiCredits = creditsData?.aiCreditsBalance ?? 1000;
  const planTier = creditsData?.planTier ?? 'PRO';

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 text-slate-100 w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-emerald-400" />
            <span>Billing, Wallet & AI Credits</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your prepaid WhatsApp message wallet, AI credits bundles, and subscription plan.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-emerald-400 shadow-lg">
          <ShieldCheck className="w-4 h-4" />
          <span>Active Plan: {planTier} TIER</span>
        </div>
      </div>

      {/* ── Top Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Outbound Wallet Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prepaid Wallet Balance</span>
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">₹</span>
          </div>
          <div>
            <div className="text-4xl font-black text-white">₹{availableBalance.toFixed(2)}</div>
            <p className="text-xs text-slate-400 mt-1">Used for Meta WhatsApp outbound broadcasts & utility messages.</p>
          </div>
          <div className="pt-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                placeholder="Amount ₹"
              />
              <button
                onClick={() => walletRechargeMutation.mutate(Number(rechargeAmount))}
                disabled={walletRechargeMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                Recharge
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: AI & Automation Credits */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">AI & Automation Credits</span>
            <span className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-4xl font-black text-white">{aiCredits.toLocaleString()}</div>
            <p className="text-xs text-slate-400 mt-1">Used for Gemini AI Copilot replies & Autonomous Order Bots.</p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => topupCreditsMutation.mutate(500)}
              disabled={topupCreditsMutation.isPending}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-lg shadow-purple-500/20 cursor-pointer flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Buy 1,000 Credits (₹500)</span>
            </button>
          </div>
        </div>

        {/* Card 3: Subscription Plan Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Subscription</span>
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-white">{planTier} Plan</div>
            <p className="text-xs text-slate-400 mt-1">Unlimited Chatbot Flows & Autonomous Commerce Bot enabled.</p>
          </div>
          <div className="pt-2">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5 text-slate-300">
              <div className="flex justify-between">
                <span>Agent Seats:</span>
                <span className="font-bold text-white">5 Included</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Credits:</span>
                <span className="font-bold text-purple-400">2,500 / mo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI Credits Bundles Rate Card ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span>Top Up AI & Automation Credits</span>
        </h3>
        <p className="text-xs text-slate-400">
          No external API keys required! Credits are automatically deducted when Gemini 1.5 AI Copilot or Autonomous Commerce Bot executes.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-purple-500/50 transition-all">
            <div className="text-xs font-bold text-purple-400 uppercase">Mini Credit Pack</div>
            <div className="text-2xl font-black text-white">₹500 <span className="text-xs font-normal text-slate-400">/ one-time</span></div>
            <p className="text-xs text-slate-400">Includes 1,000 AI Credits (₹0.50 per credit)</p>
            <button
              onClick={() => topupCreditsMutation.mutate(500)}
              className="w-full bg-slate-900 hover:bg-purple-600 text-white font-bold py-2 rounded-lg text-xs border border-slate-700 hover:border-purple-500 transition-all cursor-pointer"
            >
              Get 1,000 Credits
            </button>
          </div>

          <div className="bg-slate-950 border border-purple-500/50 rounded-xl p-5 space-y-3 relative shadow-lg shadow-purple-500/10">
            <div className="absolute -top-3 right-4 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Most Popular</div>
            <div className="text-xs font-bold text-purple-400 uppercase">Growth Credit Pack</div>
            <div className="text-2xl font-black text-white">₹1,500 <span className="text-xs font-normal text-slate-400">/ one-time</span></div>
            <p className="text-xs text-slate-400">Includes 3,500 AI Credits (₹0.42 per credit)</p>
            <button
              onClick={() => topupCreditsMutation.mutate(1500)}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-lg text-xs transition-all cursor-pointer shadow-lg shadow-purple-500/20"
            >
              Get 3,500 Credits
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3 hover:border-purple-500/50 transition-all">
            <div className="text-xs font-bold text-purple-400 uppercase">Power Credit Pack</div>
            <div className="text-2xl font-black text-white">₹3,500 <span className="text-xs font-normal text-slate-400">/ one-time</span></div>
            <p className="text-xs text-slate-400">Includes 10,000 AI Credits (₹0.35 per credit)</p>
            <button
              onClick={() => topupCreditsMutation.mutate(3500)}
              className="w-full bg-slate-900 hover:bg-purple-600 text-white font-bold py-2 rounded-lg text-xs border border-slate-700 hover:border-purple-500 transition-all cursor-pointer"
            >
              Get 10,000 Credits
            </button>
          </div>
        </div>
      </div>

      {/* ── Wallet Ledger Receipts Table ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          <span>Wallet Ledger Receipts & Audit History</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 uppercase font-semibold">
                <th className="pb-3">Transaction Type</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Closing Balance</th>
                <th className="pb-3">Description</th>
                <th className="pb-3">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {Array.isArray(ledgerData) && ledgerData.length > 0 ? (
                ledgerData.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-all">
                    <td className="py-3 font-semibold text-white uppercase">{item.transactionType}</td>
                    <td className={`py-3 font-bold ${item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.amount >= 0 ? `+₹${item.amount}` : `-₹${Math.abs(item.amount)}`}
                    </td>
                    <td className="py-3 font-mono text-slate-200">₹{item.closingBalance}</td>
                    <td className="py-3 text-slate-400">{item.description}</td>
                    <td className="py-3 text-slate-400">{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No wallet transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
