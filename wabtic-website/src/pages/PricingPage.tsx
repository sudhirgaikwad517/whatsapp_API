import React, { useState } from 'react';
import {
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Star,
  Zap,
  Calculator,
  Tag,
  Info,
  Sparkles,
  Users,
  Bot,
  GitFork,
  CreditCard,
  PhoneCall,
  Plus
} from 'lucide-react';
import { INITIAL_PRICING_PLANS, ADDON_CREDIT_PACKS, AI_CREDIT_CONSUMPTION_METRICS, WATI_FAQS } from '@/lib/initial-data';
import { NavTab } from '@/types';
import { useAuthStore } from '../store/auth.store';
import { apiClient } from '../lib/api.client';
import { toast } from 'sonner';

interface PricingPageProps {
  onNavigate: (tab: NavTab) => void;
}

export function PricingPage({ onNavigate }: PricingPageProps) {
  const [annual, setAnnual] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Calculator state
  const [calcPlanId, setCalcPlanId] = useState<string>('pro');
  const [selectedAgentCount, setSelectedAgentCount] = useState<number>(5);

  const selectedPlan = INITIAL_PRICING_PLANS.find(p => p.id === calcPlanId) || INITIAL_PRICING_PLANS[1];
  const basePriceValue = parseInt(selectedPlan.monthlyPrice.replace(/[^0-9]/g, ''));
  const extraAgents = Math.max(0, selectedAgentCount - selectedPlan.agentSeatsCount);
  const extraAgentsCost = extraAgents * selectedPlan.expansionCostValue;
  const totalCalculatedCost = basePriceValue + extraAgentsCost;

  const { isAuthenticated, logout } = useAuthStore();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; resolve: (v: boolean) => void } | null>(null);

  const confirmAction = (message: string) =>
    new Promise<boolean>((resolve) => setConfirmDialog({ message, resolve }));

  const handlePurchase = async (type: 'plan' | 'credits', id: string, amountStr: string, planTier?: string) => {
    if (!isAuthenticated) {
      sessionStorage.setItem('redirect_after_login', 'pricing');
      onNavigate('login');
      return;
    }

    // Parse amount from string like "₹ 1,500" -> 1500
    const baseAmount = parseInt(amountStr.replace(/[^0-9]/g, ''));
    if (isNaN(baseAmount) || baseAmount <= 0) return;

    // Number(...).toFixed(2), not Math.round() — rounding to the nearest
    // WHOLE RUPEE here would silently charge a different amount than the
    // pack's advertised price, and once the backend backs GST out of
    // whatever was actually captured, the credited amount stops matching
    // the pack's stated credit total.
    let finalAmount = Number((baseAmount * 1.18).toFixed(2)); // Default calculation

    setProcessingId(id);
    try {
      // 0. Validate plan purchase and get prorated pricing
      if (type === 'plan') {
        try {
          const validRes = await apiClient.post('/billing/validate-plan-purchase', { 
            planTier: planTier?.toUpperCase() || 'PRO',
            billingCycle: annual ? 'ANNUAL' : 'MONTHLY'
          });
          const validationData = validRes.data.data;
          
          if (validationData.discount > 0) {
            const proceed = await confirmAction(`Prorated Upgrade!\n\nOriginal Plan Price: ₹${validationData.originalAmount}\nCredit for unused days: -₹${validationData.discount}\nNet Amount: ₹${validationData.finalAmount}\n\nTotal Payable (+18% GST): ₹${validationData.payableAmount}\n\nProceed to payment?`);
            if (!proceed) {
              setProcessingId(null);
              return;
            }
          }
          finalAmount = validationData.payableAmount;
        } catch (err: any) {
          const status = err.response?.status;
          if (status === 403) {
            // A genuinely logged-in user (e.g. a support agent) who just
            // isn't allowed to spend the org's money — could be the role
            // check (purchases are owner/manager-only) or missing 'billing'
            // page access; either way, logging them out would be wrong,
            // they'd just hit the same 403 again after logging back in.
            toast.error('You are not authorized to make purchases. Please contact your organization admin.');
            setProcessingId(null);
            return;
          }
          if (status === 401) {
            toast.error('Your session has expired or is invalid. Please log in again.');
            logout();
            sessionStorage.setItem('redirect_after_login', 'pricing');
            onNavigate('login');
            return;
          }
          toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Cannot purchase this plan at this time.');
          setProcessingId(null);
          return;
        }
      }

      // 1. Create order
      const orderRes = await apiClient.post('/billing/create-razorpay-order', { amount: finalAmount });
      const orderData = orderRes.data.data;

      if (orderData.isMock) {
        toast.error('Razorpay Keys are missing on server. Cannot process payments.');
        setProcessingId(null);
        return;
      }

      // 2. Open Razorpay Checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Wabtic',
        description: type === 'plan' ? `Upgrade to ${planTier} Plan` : 'AI Credits Top-up',
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            if (type === 'plan') {
              await apiClient.post('/billing/purchase-plan', {
                planTier,
                billingCycle: annual ? 'ANNUAL' : 'MONTHLY',
                amount: finalAmount,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              toast.success(`Successfully upgraded to ${planTier}!`);
            } else {
              await apiClient.post('/billing/topup-credits', {
                amount: finalAmount,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              toast.success('Credits added successfully!');
            }
          } catch (err: any) {
            toast.error('Payment verification failed: ' + (err.response?.data?.error?.message || err.message));
          }
        },
        theme: { color: '#10b981' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        toast.error(`Payment failed: ${response.error.description}`);
      });
      rzp.open();
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 403) {
        toast.error('You are not authorized to make purchases. Please contact your organization admin.');
        return;
      }
      if (status === 401) {
        toast.error('Your session has expired or is invalid. Please log in again.');
        logout();
        sessionStorage.setItem('redirect_after_login', 'pricing');
        onNavigate('login');
        return;
      }
      toast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to process payment');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="pt-10 pb-24 space-y-20">

      {/* Header Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" /> Simple, Predictable Pricing • 100% Issue Resolution SLA • Instant Activation
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Flexible Plans to Scale Your WhatsApp Commerce & Support
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto font-medium">
          Choose from transparent tiers with dedicated agent seats, AI copilot credits, and high-performance WhatsApp features. All purchases backed by our 100% Issue Resolution SLA.
        </p>

        {/* Toggle Pills: Monthly / Annual */}
        <div className="pt-4 flex items-center justify-center gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 dark:bg-slate-900 rounded-full border border-slate-300 dark:border-slate-800">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${!annual
                  ? 'bg-emerald-400 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${annual
                  ? 'bg-emerald-400 text-slate-950 shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-white'
                }`}
            >
              <span>Annual Billing</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-black">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 3 Pricing Cards Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {INITIAL_PRICING_PLANS.map((plan) => {
            const currentPrice = annual ? plan.annualPrice : plan.monthlyPrice;
            const originalPrice = annual ? plan.annualOriginalPrice : plan.monthlyOriginalPrice;
            const billingText = annual ? 'billed annually' : 'billed monthly';

            const cardStyle =
              plan.id === 'starter' ? 'border-sky-300 dark:border-sky-800/80 bg-white dark:bg-slate-900' :
                plan.id === 'pro' ? 'border-emerald-400 dark:border-emerald-500 bg-white dark:bg-slate-900 ring-2 ring-emerald-400/20' :
                  'border-purple-300 dark:border-purple-800/80 bg-white dark:bg-slate-900';

            const buttonStyle =
              plan.id === 'starter' ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-md' :
                plan.id === 'pro' ? 'bg-emerald-400 hover:bg-emerald-500 text-slate-950 shadow-md font-extrabold' :
                  'bg-purple-600 hover:bg-purple-700 text-white shadow-md';

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 sm:p-8 border-2 flex flex-col justify-between transition-all duration-300 relative shadow-xl ${cardStyle}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 right-6 px-4 py-1 rounded-full bg-emerald-400 text-slate-950 text-xs font-black border border-emerald-500 shadow-sm">
                    {plan.badge}
                  </div>
                )}

                <div className="space-y-6">
                  {/* Header Title & Subtitle */}
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{plan.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed min-h-[38px]">
                      {plan.subtitle}
                    </p>
                  </div>

                  {/* Price Section */}
                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      {originalPrice && (
                        <span className="text-sm font-bold text-slate-400 line-through">
                          {originalPrice}
                        </span>
                      )}
                      {annual && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">
                          20% OFF
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{currentPrice}</span>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex flex-col">
                        <span className="font-bold">/ Month</span>
                        <span className="text-[10px]">{billingText} <br/><span className="text-emerald-500 font-bold">+18% GST</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Key Quota Badges Container - Perfectly Aligned */}
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 text-xs">

                    {/* Seats Included */}
                    <div className="flex items-start justify-between gap-3 pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium shrink-0 pt-0.5">
                        <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Agent Seats:</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-right leading-snug">
                        {plan.agentSeats}
                      </span>
                    </div>

                    {/* AI Credits */}
                    <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>AI Credits:</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-right">
                        {plan.aiCredits}
                      </span>
                    </div>

                    {/* WhatsApp WABA */}
                    <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                        <PhoneCall className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>WhatsApp WABA:</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white text-right">
                        {plan.wabaAccounts}
                      </span>
                    </div>

                    {/* Expansion Rate */}
                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium shrink-0">
                        <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Extra Agent Cost:</span>
                      </div>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-right">
                        {plan.expansionCost}
                      </span>
                    </div>

                  </div>


                  {/* Action Button */}
                  <button
                    onClick={() => handlePurchase('plan', plan.id, currentPrice, plan.id.toUpperCase())}
                    disabled={processingId === plan.id}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 ${buttonStyle}`}
                  >
                    <span>{processingId === plan.id ? 'Processing...' : (isAuthenticated ? 'Buy Now' : 'Get Started')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {/* Included Features List */}
                  <div className="space-y-3 pt-2">
                    <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] text-slate-400">
                      {plan.featuresHeader || 'Core Features Included'}
                    </div>

                    <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Excluded Features List (if any) */}
                  {plan.excludedFeatures && plan.excludedFeatures.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider text-[11px]">
                        Features Excluded
                      </div>
                      <ul className="space-y-2 text-xs text-slate-400 dark:text-slate-500 line-through">
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

        {/* Commercial Terms & RBI Compliance Disclaimer Banner */}
        <div className="mt-8 p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-300 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white block text-sm">Subscription is for Platform Access Only</span>
              <p className="text-slate-400 mt-1">
                The subscription plans above cover platform access, features, and included AI credits. <strong className="text-white">Actual WhatsApp messaging costs (per message) are billed separately</strong> based on Meta's official country-wise rates and are paid via Messaging Credits. AI Credits and Messaging Credits are separate and cannot be used interchangeably.
              </p>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('refund')} 
            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold whitespace-nowrap cursor-pointer transition-colors"
          >
            Read Cancellation Policy
          </button>
        </div>
      </section>

      {/* Credit Consumption Metrics Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" /> Clear & Transparent Credit Consumption
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
            What Does 1 AI Credit Get You?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            AI credits power high-value copilot responses, autonomous lookup bots, and multi-step flow triggers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {AI_CREDIT_CONSUMPTION_METRICS.map((metric, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  {index === 0 ? <Sparkles className="w-5 h-5 text-amber-400" /> :
                    index === 1 ? <Bot className="w-5 h-5 text-emerald-400" /> :
                      <GitFork className="w-5 h-5 text-sky-400" />}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{metric.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {metric.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">Consumption Rate:</span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-mono">
                  {metric.rate}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-center max-w-3xl mx-auto flex items-center justify-center gap-3">
          <Info className="w-6 h-6 text-emerald-400 shrink-0" />
          <p className="text-sm sm:text-base font-semibold text-emerald-100">
            AI Credits are exclusively used for eligible AI-powered Wabtic features. <span className="text-emerald-400">Messaging Credits are separate.</span>
          </p>
        </div>
      </section>

      {/* Add-on Credit Top-Up Packs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 border border-slate-800 space-y-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />

          <div className="text-center space-y-2 relative z-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              Add-on AI Credit Top-Up Packs
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
              Need extra AI capacity during campaign spikes? Top up credits instantly with zero expiration limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            {ADDON_CREDIT_PACKS.map((pack) => (
              <div
                key={pack.id}
                className={`rounded-2xl p-6 border flex flex-col justify-between space-y-6 transition-all ${pack.highlight
                    ? 'border-emerald-400 bg-emerald-950/20 shadow-lg ring-1 ring-emerald-400/40 relative'
                    : 'border-slate-800 bg-slate-950/80'
                  }`}
              >
                {pack.badge && (
                  <div className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                    {pack.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Top-Up Pack</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[11px] font-mono font-bold">
                      {pack.perCreditRate}
                    </span>
                  </div>

                  <div>
                    <div className="text-3xl font-black text-white font-mono">{pack.price} <span className="text-xs text-emerald-400 font-bold tracking-normal">+18% GST</span></div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">{pack.credits}</div>
                  </div>
                </div>

                <button
                  onClick={() => handlePurchase('credits', pack.id, pack.price)}
                  disabled={processingId === pack.id}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${pack.highlight
                      ? 'bg-emerald-400 hover:bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                >
                  <Plus className="w-3.5 h-3.5" /> {processingId === pack.id ? 'Processing...' : 'Add Credits'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Agent Seats & Cost Calculator */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 border border-slate-200 dark:border-slate-800 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/15 text-sky-400 flex items-center justify-center font-bold">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Interactive Plan & Agent Seat Calculator</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Calculate total monthly cost based on plan tier and required agent seats</p>
            </div>
          </div>

          {/* Plan Selector */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Select Base Plan:</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {INITIAL_PRICING_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => {
                    setCalcPlanId(plan.id);
                    if (selectedAgentCount < plan.agentSeatsCount) {
                      setSelectedAgentCount(plan.agentSeatsCount);
                    }
                  }}
                  className={`p-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${calcPlanId === plan.id
                      ? 'border-emerald-400 bg-emerald-500/10 text-emerald-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                    }`}
                >
                  <div>{plan.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{plan.monthlyPrice}/mo</div>
                </button>
              ))}
            </div>
          </div>

          {/* Agent Seats Slider */}
          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-slate-700 dark:text-slate-300">Total Agent Seats Needed:</span>
              <span className="text-xl font-black text-emerald-400 font-mono">{selectedAgentCount} Agents</span>
            </div>

            <input
              type="range"
              min={selectedPlan.agentSeatsCount}
              max="50"
              step="1"
              value={selectedAgentCount}
              onChange={(e) => setSelectedAgentCount(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs">
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                <span className="text-slate-400 block font-medium">Included Seats ({selectedPlan.title})</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white">{selectedPlan.agentSeatsCount} Seats Included</span>
                {extraAgents > 0 && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block">
                    + {extraAgents} Additional @ ₹{selectedPlan.expansionCostValue}/agent
                  </span>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                <span className="text-emerald-400 block font-bold">Total Estimated Subscription</span>
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  ₹{totalCalculatedCost.toLocaleString()} <span className="text-xs font-normal text-slate-400">/ mo <span className="text-emerald-500 font-bold ml-1">+18% GST</span></span>
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  Includes {selectedPlan.aiCredits} & {selectedPlan.wabaAccounts}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white">Frequently Asked Questions</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Everything you need to know about Wabtic plans, agent seats, and credit top-ups</p>
        </div>

        <div className="max-w-6xl mx-auto space-y-3">
          {WATI_FAQS.map((faq, index) => {
            const isOpen = expandedFaq === index;
            return (
              <div
                key={index}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setExpandedFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left font-bold text-slate-900 dark:text-white text-sm sm:text-base flex justify-between items-center gap-4 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-emerald-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {confirmDialog && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Purchase</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  confirmDialog.resolve(false);
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmDialog.resolve(true);
                  setConfirmDialog(null);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-sm shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


