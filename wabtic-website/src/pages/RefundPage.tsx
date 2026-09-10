import React from 'react';
import { RefreshCcw, Lock, CreditCard, Shield, Truck, PhoneCall, Building, Scale, CheckCircle2, UserX, Briefcase } from 'lucide-react';

export function RefundPage() {
  return (
    <div className="pt-12 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
          <Scale className="w-3.5 h-3.5" /> Governance & Subscription Terms
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Cancellation <span className="text-[#25D366]">Policy</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          Clear, transparent subscription rules, credit policies, and platform terms for Wabtic business accounts.
        </p>
      </div>

      {/* Policy Summary Cards - 3 Key Policy Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-100 shadow-xl space-y-3 relative overflow-hidden transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#25D366] flex items-center justify-center font-bold">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-extrabold text-white">Credits Are Non-Refundable</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Payments and purchased credits are non-refundable. Once credits are purchased, they cannot be exchanged for cash or refunded through the platform.
          </p>
        </div>

        {/* Card 2 */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-100 shadow-xl space-y-3 relative overflow-hidden transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#25D366] flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-extrabold text-white">Credits Are Non-Transferable & Non-Shareable</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Credits are linked to the customer's account/business and cannot be transferred, sold, assigned, or shared with another account, person, or business.
          </p>
        </div>

        {/* Card 3 */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-100 shadow-xl space-y-3 relative overflow-hidden transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#25D366] flex items-center justify-center font-bold">
            <Building className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-extrabold text-white">Credits Are for Business Use Only</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Any purchased or unused credits will remain available only for use by the customer's business through the Wabtic platform. Unused credits do not have any cash value and cannot be withdrawn, converted into cash, or redeemed outside the platform.
          </p>
        </div>
      </div>

      {/* Main Detailed Content */}
      <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-10 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        
        {/* Merchant & Business Compliance Box */}
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
            <Building className="w-4 h-4" /> Official Merchant Identity & Operating Entity
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <span className="text-slate-400 block">Legal Registered Entity:</span>
              <strong className="text-slate-900 dark:text-white"><a href="https://www.prowexa.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-emerald-500">PROWEXA TECHNOLOGIES PRIVATE LIMITED</a></strong>
            </div>
            <div>
              <span className="text-slate-400 block">Corporate Identity Number (CIN):</span>
              <code className="text-emerald-400 font-mono">U62090PN2025PTC249889</code>
            </div>
            <div>
              <span className="text-slate-400 block">Merchant Category Code (MCC):</span>
              <strong className="text-slate-900 dark:text-white">MCC 5734 (Software) / MCC 7372 (Data Processing & SaaS)</strong>
            </div>
            <div>
              <span className="text-slate-400 block">Registered Office:</span>
              <span className="text-slate-300">S.No.50/14/4/4, Near Patil House, Gokulnagar, Haveli, Pune, MH 411041, India</span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-slate-400 block">Business / Corporate Office:</span>
              <span className="text-slate-300">Smartworks 43EQ, Plot A, opposite Bharti Vidyapeeth School, Balewadi, Pune, Maharashtra 411045</span>
            </div>
          </div>
        </div>

        {/* Section 1: SaaS Subscription Cancellations */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCcw className="w-5 h-5 text-[#25D366]" /> 1. SaaS Subscription Cancellations
          </h2>
          <p>
            Customers may cancel their Wabtic monthly or annual subscription at any time directly through their account billing settings.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 pl-2">
            <li>Cancellation takes effect at the conclusion of the active subscription period, preventing future recurring auto-renewals.</li>
            <li>You retain full active access to your software inbox, visual workflows, AI Copilot, and WhatsApp integration features until the final date of your paid billing cycle.</li>
            <li>Cancelling a subscription does <strong>not</strong> create a right to a refund for subscription fees or charges already paid.</li>
          </ul>
        </section>

        {/* Section 2: Credits & Prepaid Balances */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#25D366]" /> 2. Credits & Prepaid Balances (Non-Refundable)
          </h2>
          <p>
            Due to the immediate digital provisioning of software licenses, AI engine processing capacity, and WhatsApp Cloud API infrastructure, all purchased credits and prepaid account balances are <strong>non-refundable</strong>.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 pl-2">
            <li>Purchased credits are non-refundable upon payment completion.</li>
            <li>Credits have no cash value under any circumstances.</li>
            <li>Credits cannot be redeemed or exchanged for cash.</li>
            <li>Credits cannot be withdrawn from the platform.</li>
            <li>Once purchased, credits remain associated with the customer's account/business for use through Wabtic.</li>
          </ul>
        </section>

        {/* Section 3: Credits Are Non-Transferable & Non-Shareable */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserX className="w-5 h-5 text-[#25D366]" /> 3. Credits Are Non-Transferable & Non-Shareable
          </h2>
          <p>
            Credits belong strictly to the registered customer account and business entity to which they were originally provisioned:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 pl-2">
            <li>Credits cannot be transferred to another Wabtic account.</li>
            <li>Credits cannot be sold, gifted, or assigned to another person, business, or organization.</li>
            <li>Credits cannot be shared between unrelated accounts or corporate entities.</li>
            <li>Credits cannot be converted into cash or any other monetary benefit.</li>
          </ul>
        </section>

        {/* Section 4: Business-Only Platform Usage */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#25D366]" /> 4. Business-Only Platform Usage
          </h2>
          <p>
            Any purchased or unused credits will remain available exclusively for use by the customer's business through the Wabtic platform:
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 pl-2">
            <li>Unused credits remain active within the customer's account for business messaging and AI automation services in accordance with applicable platform terms.</li>
            <li>Unused credits cannot be refunded.</li>
            <li>Unused credits cannot be withdrawn.</li>
            <li>Unused credits cannot be transferred or shared.</li>
            <li>Unused credits cannot be converted into cash or redeemed outside the Wabtic platform.</li>
          </ul>
        </section>

        {/* Section 5: Technical Support SLA & Digital Service Fulfillment */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-[#25D366]" /> 5. Technical Support SLA & Digital Service Fulfillment
          </h2>
          <p>
            We take complete responsibility for platform availability and technical support. Our dedicated engineering team actively handles all platform inquiries:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400">Support Response SLA:</span>
              <p className="text-slate-300">Initial support ticket response provided within 2 to 4 business hours.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400">Issue Resolution SLA:</span>
              <p className="text-slate-300">Technical inquiries, API connection errors, or dashboard sync matters resolved within 24 to 48 hours.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400">Failed Payment Reconciliation:</span>
              <p className="text-slate-300">If a payment is debited from your bank but fails to reflect in your Wabtic balance, our automated reconciler credits your account within 6 hours, or your bank auto-reverses via NPCI rules.</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="font-bold text-emerald-400">Instant Digital Delivery:</span>
              <p className="text-slate-300">Account access, API tokens, and credit allocations activate automatically in real time (&lt; 60 seconds) upon payment confirmation.</p>
            </div>
          </div>
        </section>

        {/* Section 6: Support & Statutory Grievance Redressal */}
        <section className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-[#25D366]" /> 6. Customer Support & Statutory Grievance Contact
          </h2>
          <p>
            For subscription management, billing inquiries, or technical support, contact our support team:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono pt-2">
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-bold block">Customer Support:</span>
              <a href="mailto:support@wabtic.com" className="text-emerald-400 hover:underline">support@wabtic.com</a>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-slate-400 font-bold block">Statutory Grievance Redressal Officer:</span>
              <span className="text-white font-sans font-bold">Mr. Rahul Sharma</span>
              <p className="text-slate-400 font-sans text-[11px]">Email: <a href="mailto:grievance@prowexa.com" className="text-emerald-400 hover:underline">grievance@prowexa.com</a> | SLA: Acknowledged within 24 hours</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}



