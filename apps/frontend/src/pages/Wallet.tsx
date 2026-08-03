import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet as WalletIcon, ArrowUpRight, ArrowDownLeft, ShieldCheck, Lock, CreditCard, PlusCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const Wallet: React.FC = () => {
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('1000');
  const queryClient = useQueryClient();

  const { data: walletData, isLoading } = useQuery({
    queryKey: ['wallet-details'],
    queryFn: async () => {
      const res = await apiClient.get('/billing/wallet');
      return res.data.data;
    },
    refetchInterval: 5000,
  });

  const rechargeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/billing/wallet/recharge', {
        amount: Number(rechargeAmount),
        gateway: 'RAZORPAY',
      });
      return res.data.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['wallet-details'] });
      alert(`🎉 Success! Wallet recharged with ₹${rechargeAmount}. New Balance: ₹${data.wallet.availableBalance}`);
      setIsRechargeOpen(false);
    },
    onError: (err: any) => {
      alert(`❌ Recharge Failed: ${err?.response?.data?.error?.message || err.message}`);
    },
  });

  const wallet = walletData?.wallet || {
    availableBalance: '500.00',
    reservedBalance: '0.00',
    currency: 'INR',
    isFrozen: false,
  };

  const spendable = Number(wallet.availableBalance) - Number(wallet.reservedBalance);
  const ledgers = walletData?.ledgers || [];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center">
            <WalletIcon className="w-7 h-7 mr-3 text-emerald-400" />
            FinTech Wallet & Double-Entry Ledger
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            2-Phase Lock Reservation Engine & Immutable Financial Ledger
          </p>
        </div>

        <button
          onClick={() => setIsRechargeOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-emerald-500/20 text-sm transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4 mr-2 stroke-[3]" />
          Top-Up Wallet
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 relative overflow-hidden shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Spendable Balance</div>
          <div className="text-3xl font-extrabold text-white">₹{spendable.toFixed(2)}</div>
          <div className="text-xs text-emerald-400 flex items-center font-medium">
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Available for immediate dispatches
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Available Balance</div>
          <div className="text-2xl font-bold text-slate-200">₹{Number(wallet.availableBalance).toFixed(2)}</div>
          <div className="text-xs text-slate-500">Gross Total Account Funds</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 flex items-center">
            <Lock className="w-3.5 h-3.5 mr-1 text-amber-400" />
            2-Phase Reserved Funds
          </div>
          <div className="text-2xl font-bold text-amber-400">₹{Number(wallet.reservedBalance).toFixed(2)}</div>
          <div className="text-xs text-slate-500">Locked during pending dispatches</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-2 shadow-xl">
          <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Billing Mode</div>
          <div className="text-lg font-bold text-emerald-400 flex items-center mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
            PREPAID WALLET
          </div>
          <div className="text-xs text-slate-500">Prowexa Enterprise Rate Card</div>
        </div>
      </div>

      {/* Immutable Ledger Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white tracking-tight">Immutable Wallet Ledger Transactions</h3>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Type</th>
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Amount</th>
                <th className="py-4 px-6">Opening Balance</th>
                <th className="py-4 px-6 text-right">Closing Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">Loading ledger audit logs...</td>
                </tr>
              ) : ledgers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No wallet transactions recorded yet. Click "Top-Up Wallet" to add funds.
                  </td>
                </tr>
              ) : (
                ledgers.map((item: any) => {
                  const isCredit = item.transactionType === 'RECHARGE' || item.transactionType === 'BONUS';
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-all">
                      <td className="py-4 px-6 text-slate-400 text-xs">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isCredit
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                          )}
                          {item.transactionType}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-white">{item.description || '—'}</td>
                      <td className={`py-4 px-6 font-bold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isCredit ? '+' : '-'}₹{Number(item.amount).toFixed(2)}
                      </td>
                      <td className="py-4 px-6 text-slate-400">₹{Number(item.openingBalance).toFixed(2)}</td>
                      <td className="py-4 px-6 text-right font-bold text-white">
                        ₹{Number(item.closingBalance).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Invoices Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white tracking-tight">Official GST Tax Invoices & Receipts</h3>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-4 px-6">Invoice #</th>
                <th className="py-4 px-6">Gateway</th>
                <th className="py-4 px-6">Subtotal</th>
                <th className="py-4 px-6">18% GST Tax</th>
                <th className="py-4 px-6">Grand Total</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Download Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
              <tr className="hover:bg-slate-800/40 transition-all">
                <td className="py-4 px-6 font-mono text-emerald-400 font-bold">INV-2026-00109</td>
                <td className="py-4 px-6 text-slate-300 font-semibold">RAZORPAY</td>
                <td className="py-4 px-6 text-slate-300">₹847.46</td>
                <td className="py-4 px-6 text-slate-400">₹152.54</td>
                <td className="py-4 px-6 font-extrabold text-white">₹1,000.00</td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    PAID
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <button
                    onClick={() => {
                      const invoiceNumber = 'INV-2026-00109';
                      const subtotal = '847.46';
                      const tax = '152.54';
                      const grandTotal = '1,000.00';
                      const dateStr = new Date().toLocaleDateString();

                      const printWindow = window.open('', '_blank', 'width=850,height=950');
                      if (printWindow) {
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <title>Tax Invoice - ${invoiceNumber}</title>
                              <style>
                                body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #0f172a; background: #fff; }
                                .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
                                .title { font-size: 22px; font-weight: 800; color: #0f172a; }
                                .badge { background: #dcfce7; color: #15803d; font-weight: 800; padding: 6px 14px; border-radius: 20px; font-size: 11px; display: inline-block; }
                                .table { width: 100%; border-collapse: collapse; margin-top: 30px; }
                                .table th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 12px; text-align: left; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #475569; }
                                .table td { border-bottom: 1px solid #e2e8f0; padding: 14px 12px; font-size: 13px; }
                                .totals { margin-top: 30px; float: right; width: 320px; }
                                .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #334155; }
                                .grand-total { border-top: 2px solid #0f172a; font-weight: 800; font-size: 16px; color: #059669; padding-top: 10px; margin-top: 6px; }
                                .footer { margin-top: 120px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <div>
                                  <div class="title">PROWEXA TECHNOLOGIES PVT. LTD.</div>
                                  <div style="font-size: 12px; color: #64748b; margin-top: 4px;">GSTIN: 27AAAAA0000A1Z5 | PAN: AAAAA0000A</div>
                                  <div style="font-size: 12px; color: #64748b;">Enterprise WhatsApp Cloud API SaaS Engine</div>
                                </div>
                                <div style="text-align: right;">
                                  <div class="badge">OFFICIAL GST TAX INVOICE</div>
                                  <div style="font-size: 14px; font-weight: 800; margin-top: 8px; color: #0f172a;">${invoiceNumber}</div>
                                  <div style="font-size: 12px; color: #64748b;">Date: ${dateStr}</div>
                                </div>
                              </div>

                              <table class="table">
                                <thead>
                                  <tr>
                                    <th>Item Description</th>
                                    <th>Qty</th>
                                    <th>Rate (INR)</th>
                                    <th style="text-align: right;">Amount (INR)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>
                                      <strong>Prowexa SaaS Wallet Top-Up</strong><br/>
                                      <span style="font-size: 11px; color: #64748b;">Prepaid WhatsApp Marketing & API Credits</span>
                                    </td>
                                    <td>1</td>
                                    <td>₹${subtotal}</td>
                                    <td style="text-align: right; font-weight: 700;">₹${subtotal}</td>
                                  </tr>
                                </tbody>
                              </table>

                              <div class="totals">
                                <div class="total-row"><span>Subtotal:</span><span>₹${subtotal}</span></div>
                                <div class="total-row"><span>18% GST (CGST 9% + SGST 9%):</span><span>₹${tax}</span></div>
                                <div class="total-row grand-total"><span>Grand Total Paid:</span><span>₹${grandTotal}</span></div>
                              </div>

                              <div style="clear: both;"></div>

                              <div class="footer">
                                This is a computer-generated tax invoice and requires no physical signature.<br/>
                                Prowexa Technologies Pvt. Ltd. • https://prowexa.com • support@prowexa.com
                              </div>

                              <script>
                                window.onload = function() { window.print(); }
                              </script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all text-xs font-semibold cursor-pointer inline-flex items-center"
                  >
                    Download PDF
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Recharge Modal */}
      {isRechargeOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-emerald-400" />
                Recharge Wallet Balance
              </h3>
              <button
                onClick={() => setIsRechargeOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Select Recharge Amount (INR)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {['500', '1000', '2500', '5000'].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setRechargeAmount(amt)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        rechargeAmount === amt
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-bold"
                  placeholder="Enter custom amount"
                />
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Recharge Amount:</span>
                  <span className="text-white font-semibold">₹{Number(rechargeAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>18% GST:</span>
                  <span className="text-white font-semibold">₹{(Number(rechargeAmount || 0) * 0.18).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-1 font-bold text-emerald-400 text-sm">
                  <span>Total Payable:</span>
                  <span>₹{(Number(rechargeAmount || 0) * 1.18).toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => rechargeMutation.mutate()}
                disabled={rechargeMutation.isPending || !rechargeAmount || Number(rechargeAmount) <= 0}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {rechargeMutation.isPending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  `Pay ₹${(Number(rechargeAmount || 0) * 1.18).toFixed(2)} & Recharge`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
