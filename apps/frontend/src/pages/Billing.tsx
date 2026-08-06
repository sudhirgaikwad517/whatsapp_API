import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Zap,
  ShieldCheck,
  PlusCircle,
  Sparkles,
  History,
  AlertTriangle,
  FileText,
  Download,
  TrendingDown,
  MessageSquare,
  Send,
  DollarSign,
} from 'lucide-react';
import { apiClient } from '../services/api.client';

export const Billing: React.FC = () => {
  const [rechargeAmount, setRechargeAmount] = useState('1000');
  const queryClient = useQueryClient();

  const { data: walletData } = useQuery({
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

  const { data: invoicesData } = useQuery({
    queryKey: ['billing-invoices'],
    queryFn: async () => {
      const res = await apiClient.get('/billing/invoices');
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
    mutationFn: async (payload: { amount: number; razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string; isMock?: boolean }) => {
      const res = await apiClient.post('/billing/recharge-wallet', payload);
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

  const createRazorpayOrderMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiClient.post('/billing/create-razorpay-order', { amount });
      return res.data.data;
    },
    onSuccess: (data, amount) => {
      if (data.isMock) {
        alert('Razorpay Keys are missing on the server! Cannot process real payments. Please configure RAZORPAY_KEY_ID in your .env file.');
        return;
      }

      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: 'Prowexa SaaS Platform',
        description: 'Wallet Recharge',
        order_id: data.id,
        handler: function (response: any) {
          walletRechargeMutation.mutate({
            amount,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            isMock: false
          });
        },
        prefill: {
          name: 'Prowexa Organization',
        },
        theme: {
          color: '#10b981',
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    },
    onError: (err: any) => {
      alert(`Failed to initiate recharge: ${err.message}`);
    },
  });

  // Calculate available balance & negative overdraft state
  const rawBalance = walletData?.availableBalance !== undefined
    ? Number(walletData.availableBalance)
    : walletData?.wallet?.availableBalance !== undefined
    ? Number(walletData.wallet.availableBalance)
    : 0;

  const usage = walletData?.usage || {
    marketingSent: 0,
    utilitySent: 0,
    serviceCount: 0,
    totalChargesBilled: 0,
  };

  const isNegative = rawBalance < 0;
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

      {/* ── Overdraft Warning Banner (if minus balance) ── */}
      {isNegative && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3 shadow-xl">
          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-300">Outstanding Overdraft Balance Warning (-₹{Math.abs(rawBalance).toFixed(2)})</h4>
            <p className="text-xs text-rose-200/80">
              Your wallet balance is in negative due to outbound campaign messaging usage. Please recharge your wallet to clear the outstanding balance and maintain uninterrupted services.
            </p>
          </div>
        </div>
      )}

      {/* ── Top Overview Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Outbound Wallet Balance */}
        <div className={`bg-slate-900 border ${isNegative ? 'border-rose-500/40 bg-rose-950/10' : 'border-slate-800'} rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden group`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prepaid Wallet Balance</span>
            <span className={`p-2 ${isNegative ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'} rounded-lg font-bold`}>
              ₹
            </span>
          </div>
          <div>
            <div className={`text-4xl font-black ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isNegative ? `-₹${Math.abs(rawBalance).toFixed(2)}` : `₹${rawBalance.toFixed(2)}`}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isNegative ? 'Negative overdraft balance.' : 'Used for Meta WhatsApp outbound broadcasts & utility messages.'}
            </p>
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
                onClick={() => createRazorpayOrderMutation.mutate(Number(rechargeAmount))}
                disabled={createRazorpayOrderMutation.isPending || walletRechargeMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
              >
                {createRazorpayOrderMutation.isPending ? 'Processing...' : 'Recharge'}
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: AI & Automation Credits */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden group">
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

        {/* Card 3: Total Charges Incurred Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Billed Charges</span>
            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-blue-400">
              ₹{Number(usage.totalChargesBilled || 0).toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Total accumulated messaging debits across all campaigns.</p>
          </div>
          <div className="pt-2">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span>Marketing Sent:</span>
                <span className="font-bold text-emerald-400">{usage.marketingSent || 0} msgs</span>
              </div>
              <div className="flex justify-between">
                <span>Utility Sent:</span>
                <span className="font-bold text-blue-400">{usage.utilitySent || 0} msgs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Detailed Message Usage & Billed Charges Breakdown Card ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>WhatsApp Message Usage & Charges Breakdown</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Real-time breakdown of messages delivered and charges billed to your wallet.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-slate-400 font-semibold uppercase block text-[10px]">Marketing Messages</span>
            <div className="text-2xl font-black text-emerald-400">{usage.marketingSent || 0}</div>
            <div className="text-slate-400 space-y-0.5 text-[11px]">
              <div>Rate: ₹1.00 / msg</div>
              <div className="text-emerald-400 font-bold">Total: ₹{((usage.marketingSent || 0) * 1.00).toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-slate-400 font-semibold uppercase block text-[10px]">Utility Messages</span>
            <div className="text-2xl font-black text-blue-400">{usage.utilitySent || 0}</div>
            <div className="text-slate-400 space-y-0.5 text-[11px]">
              <div>Rate: ₹0.20 / msg</div>
              <div className="text-blue-400 font-bold">Total: ₹{((usage.utilitySent || 0) * 0.20).toFixed(2)}</div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-slate-400 font-semibold uppercase block text-[10px]">Free Service Conversations</span>
            <div className="text-2xl font-black text-purple-400">{usage.serviceCount || 0}</div>
            <div className="text-slate-400 space-y-0.5 text-[11px]">
              <div>Rate: ₹0.00 (Free Window)</div>
              <div className="text-purple-400 font-bold">Total: ₹0.00</div>
            </div>
          </div>

          <div className="bg-slate-950 border border-emerald-500/30 rounded-xl p-4 space-y-2 bg-emerald-500/5">
            <span className="text-emerald-400 font-semibold uppercase block text-[10px]">Total Billed Charges</span>
            <div className="text-2xl font-black text-emerald-400">
              ₹{Number(usage.totalChargesBilled || 0).toFixed(2)}
            </div>
            <div className="text-slate-400 text-[11px]">
              Cumulative Debits Deducted
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

      {/* ── Wallet Ledger Receipts Table (Responsive Mobile Fix) ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-400" />
          <span>Wallet Ledger Receipts & Audit History</span>
        </h3>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap">Date & Time</th>
                <th className="py-3 px-4 whitespace-nowrap">Transaction Type</th>
                <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                <th className="py-3 px-4 whitespace-nowrap">Closing Balance</th>
                <th className="py-3 px-4 whitespace-nowrap">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {Array.isArray(ledgerData) && ledgerData.length > 0 ? (
                ledgerData.map((item: any) => {
                  const isCredit = item.transactionType?.includes('CREDIT') || item.transactionType === 'RECHARGE';
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-all">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                          isCredit
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {item.transactionType}
                        </span>
                      </td>
                      <td className={`py-3 px-4 whitespace-nowrap font-bold font-mono text-sm ${
                        isCredit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isCredit ? `+₹${Number(item.amount).toFixed(2)}` : `-₹${Number(Math.abs(item.amount)).toFixed(2)}`}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-white">
                        ₹{Number(item.closingBalance).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                        {item.description || '—'}
                      </td>
                    </tr>
                  );
                })
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

      {/* ── Tax Invoices & Billing Receipts Section ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span>Tax Invoices & Official Billing Receipts</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">Download official GST tax invoices for wallet top-ups and subscriptions.</p>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[10px] tracking-wider">
                <th className="py-3 px-4 whitespace-nowrap">Invoice #</th>
                <th className="py-3 px-4 whitespace-nowrap">Issue Date</th>
                <th className="py-3 px-4 whitespace-nowrap">Amount</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {Array.isArray(invoicesData) && invoicesData.length > 0 ? (
                invoicesData.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-white">
                      {inv.invoiceNumber || inv.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-bold text-emerald-400 font-mono">
                      ₹{Number(inv.totalAmount || inv.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {inv.status || 'PAID'}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => alert(`📄 Downloading Official GST Invoice ${inv.invoiceNumber || 'INV-001'}...`)}
                        className="px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No tax invoices generated yet.
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
