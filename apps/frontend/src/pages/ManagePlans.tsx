import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  Calculator,
  Sparkles,
  Users,
  Bot,
  GitFork,
  PhoneCall,
  Plus,
  Tag,
} from 'lucide-react';
import { apiClient } from '../services/api.client';
import { confirmAction } from '../components/ui/ConfirmDialog';
import { useAuthStore } from '../store/auth.store';
import { PRICING_PLANS, ADDON_CREDIT_PACKS, AI_CREDIT_CONSUMPTION_METRICS } from '../lib/pricing-data';

function getWebsiteUrl(tab: string): string {
  const envUrl = (import.meta as any).env?.VITE_WEBSITE_URL;
  if (envUrl) return `${envUrl}/?tab=${tab}`;
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return `http://localhost:3000/?tab=${tab}`;
  }
  return `https://wabtic.com/?tab=${tab}`;
}

const METRIC_ICONS: Record<string, React.ElementType> = { Sparkles, Bot, GitFork };

export const ManagePlans: React.FC = () => {
  const { user } = useAuthStore();
  const canPurchase = user?.role === 'BUSINESS_OWNER' || user?.role === 'MANAGER';
  const queryClient = useQueryClient();
  const [annual, setAnnual] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Calculator state
  const [calcPlanId, setCalcPlanId] = useState('pro');
  const selectedCalcPlan = PRICING_PLANS.find((p) => p.id === calcPlanId) || PRICING_PLANS[1];
  const [selectedAgentCount, setSelectedAgentCount] = useState(5);
  const basePriceValue = parseInt(selectedCalcPlan.monthlyPrice.replace(/[^0-9]/g, ''), 10);
  const extraAgents = Math.max(0, selectedAgentCount - selectedCalcPlan.agentSeatsCount);
  const extraAgentsCost = extraAgents * selectedCalcPlan.expansionCostValue;
  const totalCalculatedCost = basePriceValue + extraAgentsCost;

  const { data: creditsData } = useQuery({
    queryKey: ['ai-credits-balance'],
    queryFn: async () => {
      const res = await apiClient.get('/billing/credits');
      return res.data.data;
    },
  });
  const isPlanActive = !!creditsData?.planExpiryDate && new Date(creditsData.planExpiryDate) > new Date();
  const currentPlanTier = isPlanActive ? creditsData?.planTier : null;

  const purchasePlanMutation = useMutation({
    mutationFn: async (payload: {
      planTier: string;
      billingCycle: string;
      amount: number;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      const res = await apiClient.post('/billing/purchase-plan', payload);
      return res.data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-credits-balance'] });
      queryClient.invalidateQueries({ queryKey: ['billing-credits-layout'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      toast.success(`Successfully upgraded to ${variables.planTier}!`);
    },
    onError: (err: any) => {
      toast.error('Plan purchase failed', { description: err.response?.data?.error?.message || err.message });
    },
  });

  const topupCreditsMutation = useMutation({
    mutationFn: async (payload: { amount: number; razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }) => {
      const res = await apiClient.post('/billing/topup-credits', payload);
      return res.data.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['ai-credits-balance'] });
      queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
      toast.success(data.message || 'AI Credits Bundle added successfully!');
    },
    onError: (err: any) => {
      toast.error('Top-up failed', { description: err.response?.data?.error?.message || err.message });
    },
  });

  const handlePurchasePlan = async (planId: string, planTierRaw: string) => {
    const planTier = planTierRaw.toUpperCase();
    const billingCycle = annual ? 'ANNUAL' : 'MONTHLY';
    setProcessingId(planId);
    try {
      const validRes = await apiClient.post('/billing/validate-plan-purchase', { planTier, billingCycle });
      const quote = validRes.data.data;

      if (quote.discount > 0) {
        const proceed = await confirmAction({
          title: 'Prorated Upgrade',
          message: `Original Plan Price: ₹${quote.originalAmount}\nCredit for unused days: -₹${quote.discount}\nNet Amount: ₹${quote.finalAmount}\n\nTotal Payable (+18% GST): ₹${quote.payableAmount}\n\nProceed to payment?`,
          confirmLabel: 'Proceed to Payment',
        });
        if (!proceed) {
          setProcessingId(null);
          return;
        }
      }

      const orderRes = await apiClient.post('/billing/create-razorpay-order', { amount: quote.payableAmount });
      const orderData = orderRes.data.data;

      if (orderData.isMock) {
        toast.error('Razorpay keys are missing on the server. Cannot process plan purchases right now.');
        setProcessingId(null);
        return;
      }

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Prowexa SaaS Platform',
        description: `Upgrade to ${planTier} Plan`,
        order_id: orderData.id,
        handler: (response: any) => {
          purchasePlanMutation.mutate({
            planTier,
            billingCycle,
            amount: quote.payableAmount,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        theme: { color: '#10b981' },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast.error(`Payment failed: ${response.error?.description || 'Unknown error'}`);
      });
      rzp.open();
    } catch (err: any) {
      toast.error('Cannot purchase this plan right now', { description: err.response?.data?.error?.message || err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleBuyCredits = (packId: string, priceValue: number) => {
    setProcessingId(packId);
    const finalAmount = Number((priceValue * 1.18).toFixed(2));
    apiClient
      .post('/billing/create-razorpay-order', { amount: finalAmount })
      .then(async ({ data }) => {
        const orderData = data.data;
        if (orderData.isMock) {
          toast.error('Razorpay keys are missing on the server.');
          setProcessingId(null);
          return;
        }
        const options = {
          key: orderData.key,
          amount: orderData.amount,
          currency: orderData.currency,
          name: 'Prowexa SaaS Platform',
          description: `AI & Automation Credits Pack (₹${priceValue})`,
          order_id: orderData.id,
          handler: (response: any) => {
            topupCreditsMutation.mutate({
              amount: finalAmount,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          theme: { color: '#9333ea' },
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      })
      .catch((err: any) => {
        toast.error('Failed to initiate Razorpay order', { description: err.response?.data?.error?.message || err.message });
      })
      .finally(() => setProcessingId(null));
  };

  return (
    <div className="p-4 sm:p-8 space-y-10 sm:space-y-14">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Tag className="w-3.5 h-3.5" /> Manage Your Subscription Plan
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">Flexible Plans to Scale Your WhatsApp Commerce & Support</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto font-medium">
          Choose from transparent tiers with dedicated agent seats, AI copilot credits, and high-performance WhatsApp features.
        </p>

        <div className="pt-2 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-full border border-slate-800">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${!annual ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${annual ? 'bg-emerald-400 text-slate-950 shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-black">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3 Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-stretch">
        {PRICING_PLANS.map((plan) => {
          const currentPrice = annual ? plan.annualPrice : plan.monthlyPrice;
          const originalPrice = annual ? plan.annualOriginalPrice : plan.monthlyOriginalPrice;
          const billingText = annual ? 'billed annually' : 'billed monthly';
          const isCurrentPlan = currentPlanTier === plan.id.toUpperCase();

          const cardStyle =
            plan.id === 'starter'
              ? 'border-sky-800/80 bg-slate-900'
              : plan.id === 'pro'
              ? 'border-emerald-500 bg-slate-900 ring-2 ring-emerald-400/20'
              : 'border-purple-800/80 bg-slate-900';
          const buttonStyle =
            plan.id === 'starter'
              ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md'
              : plan.id === 'pro'
              ? 'bg-emerald-400 hover:bg-emerald-500 text-slate-950 shadow-md font-extrabold'
              : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md';

          return (
            <div key={plan.id} className={`rounded-3xl p-6 sm:p-8 border-2 flex flex-col justify-between relative shadow-xl ${cardStyle}`}>
              {plan.badge && !isCurrentPlan && (
                <div className="absolute -top-3.5 right-6 px-4 py-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-black border border-emerald-500 shadow-sm">
                  {plan.badge}
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3.5 right-6 px-4 py-1 rounded-full bg-white text-slate-950 text-xs font-black border border-slate-300 shadow-sm">
                  Current Plan
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-black text-white">{plan.title}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed min-h-[38px]">{plan.subtitle}</p>
                </div>

                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {originalPrice && <span className="text-sm font-bold text-slate-500 line-through">{originalPrice}</span>}
                    {annual && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold">20% OFF</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white tracking-tight">{currentPrice}</span>
                    <div className="text-xs text-slate-400 flex flex-col">
                      <span className="font-bold">/ Month</span>
                      <span className="text-[10px]">
                        {billingText} <br />
                        <span className="text-emerald-500 font-bold">+18% GST</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs">
                  <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-800/60">
                    <div className="flex items-center gap-2 text-slate-400 font-medium shrink-0 pt-0.5">
                      <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Agent Seats:</span>
                    </div>
                    <span className="font-bold text-white text-right leading-snug">{plan.agentSeats}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800/60">
                    <div className="flex items-center gap-2 text-slate-400 font-medium shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>AI Credits:</span>
                    </div>
                    <span className="font-bold text-white text-right">{plan.aiCredits}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800/60">
                    <div className="flex items-center gap-2 text-slate-400 font-medium shrink-0">
                      <PhoneCall className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>WhatsApp WABA:</span>
                    </div>
                    <span className="font-bold text-white text-right">{plan.wabaAccounts}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <div className="flex items-center gap-2 text-slate-400 font-medium shrink-0">
                      <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Extra Agent Cost:</span>
                    </div>
                    <span className="font-bold text-emerald-400 text-right">{plan.expansionCost}</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePurchasePlan(plan.id, plan.id)}
                  disabled={isCurrentPlan || !canPurchase || processingId === plan.id}
                  title={!canPurchase ? 'Only the org owner or a manager can make purchases.' : undefined}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${buttonStyle}`}
                >
                  <span>
                    {isCurrentPlan ? 'Current Plan' : processingId === plan.id ? 'Processing...' : isPlanActive ? 'Upgrade to This Plan' : 'Buy Now'}
                  </span>
                  {!isCurrentPlan && <ArrowRight className="w-4 h-4" />}
                </button>

                <div className="space-y-3 pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{plan.featuresHeader || 'Core Features Included'}</div>
                  <ul className="space-y-2.5 text-xs text-slate-300">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {plan.excludedFeatures && plan.excludedFeatures.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-800">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Features Excluded</div>
                    <ul className="space-y-2 text-xs text-slate-500 line-through">
                      {plan.excludedFeatures.map((exc, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <X className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 no-underline" />
                          <span className="no-underline">{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Commercial Terms Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block text-sm">Subscription is for Platform Access Only</span>
            <p className="text-slate-400 mt-1">
              The subscription plans above cover platform access, features, and included AI credits.{' '}
              <strong className="text-white">Actual WhatsApp messaging costs (per message) are billed separately</strong> based on Meta's
              official country-wise rates and are paid via Messaging Credits. AI Credits and Messaging Credits are separate and cannot be
              used interchangeably.
            </p>
          </div>
        </div>
        <a
          href={getWebsiteUrl('refund')}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors shrink-0"
        >
          Read Cancellation Policy
        </a>
      </div>

      {/* Credit Consumption Metrics */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Clear & Transparent Credit Consumption
          </div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-white">What Does 1 AI Credit Get You?</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            AI credits power high-value copilot responses, autonomous lookup bots, and multi-step flow triggers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AI_CREDIT_CONSUMPTION_METRICS.map((metric, index) => {
            const Icon = METRIC_ICONS[metric.icon] || Sparkles;
            return (
              <div key={index} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-md space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">{metric.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{metric.description}</p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-400">Consumption Rate:</span>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-mono">{metric.rate}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add-on Credit Top-Up Packs */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-12 border border-slate-800 space-y-8 relative overflow-hidden shadow-2xl">
        <div className="text-center space-y-2 relative z-10">
          <h2 className="text-xl sm:text-3xl font-extrabold text-white">Add-on AI Credit Top-Up Packs</h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Need extra AI capacity during campaign spikes? Top up credits instantly with zero expiration limits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {ADDON_CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className={`rounded-2xl p-6 border flex flex-col justify-between space-y-6 transition-all relative ${
                pack.highlight ? 'border-emerald-400 bg-emerald-950/20 shadow-lg ring-1 ring-emerald-400/40' : 'border-slate-800 bg-slate-950/80'
              }`}
            >
              {pack.badge && (
                <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">{pack.badge}</div>
              )}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top-Up Pack</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[11px] font-mono font-bold">{pack.perCreditRate}</span>
                </div>
                <div>
                  <div className="text-3xl font-black text-white font-mono">
                    {pack.price} <span className="text-xs text-emerald-400 font-bold tracking-normal">+18% GST</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">{pack.credits}</div>
                </div>
              </div>
              <button
                onClick={() => handleBuyCredits(pack.id, pack.priceValue)}
                disabled={!canPurchase || processingId === pack.id}
                title={!canPurchase ? 'Only the org owner or a manager can make purchases.' : undefined}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                  pack.highlight ? 'bg-emerald-400 hover:bg-emerald-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700 text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> {processingId === pack.id ? 'Processing...' : 'Add Credits'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Agent Seats & Cost Calculator */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-800 space-y-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold shrink-0">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-white">Interactive Plan & Agent Seat Calculator</h3>
            <p className="text-xs text-slate-400">Calculate total monthly cost based on plan tier and required agent seats</p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label className="text-xs font-bold text-slate-300 block">Select Base Plan:</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRICING_PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => {
                  setCalcPlanId(plan.id);
                  if (selectedAgentCount < plan.agentSeatsCount) setSelectedAgentCount(plan.agentSeatsCount);
                }}
                className={`p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  calcPlanId === plan.id ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-400 hover:border-slate-600'
                }`}
              >
                <div>{plan.title}</div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{plan.monthlyPrice}/mo</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-bold text-slate-300">Total Agent Seats Needed:</span>
            <span className="text-xl font-black text-emerald-400 font-mono">{selectedAgentCount} Agents</span>
          </div>
          <input
            type="range"
            min={selectedCalcPlan.agentSeatsCount}
            max="50"
            step="1"
            value={selectedAgentCount}
            onChange={(e) => setSelectedAgentCount(parseInt(e.target.value, 10))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 block font-medium">Included Seats ({selectedCalcPlan.title})</span>
              <span className="text-lg font-bold text-white">{selectedCalcPlan.agentSeatsCount} Seats Included</span>
              {extraAgents > 0 && (
                <span className="text-[11px] text-emerald-400 block">
                  + {extraAgents} Additional @ ₹{selectedCalcPlan.expansionCostValue}/agent
                </span>
              )}
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <span className="text-emerald-400 block font-bold">Total Estimated Subscription</span>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono">
                ₹{totalCalculatedCost.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-400">
                  / mo <span className="text-emerald-500 font-bold ml-1">+18% GST</span>
                </span>
              </span>
              <span className="text-[10px] text-slate-400 block">
                Includes {selectedCalcPlan.aiCredits} & {selectedCalcPlan.wabaAccounts}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
