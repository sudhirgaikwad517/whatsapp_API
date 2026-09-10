import React from 'react';
import { Shield, FileText, AlertTriangle, CheckCircle2, Lock, Scale, Building, Truck, UserCheck, CreditCard, Coins, Zap, Ban, RefreshCw, HelpCircle, Mail, MapPin } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="pt-12 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
          <Scale className="w-3.5 h-3.5" /> Legal Framework & Governance
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Terms and <span className="text-[#25D366]">Conditions</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Last Updated: August 2026 | PROWEXA TECHNOLOGIES PRIVATE LIMITED
        </p>
      </div>

      {/* Corporate & Address Summary Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-emerald-500/40 text-slate-200 space-y-4 shadow-xl">
        <div className="flex items-center gap-3 text-[#25D366] font-bold text-lg">
          <Building className="w-6 h-6 shrink-0" />
          <a href="https://www.prowexa.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-emerald-400">PROWEXA TECHNOLOGIES PRIVATE LIMITED</a> (CIN: U62090PN2025PTC249889)
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          These Terms & Conditions ("Terms") govern your access to and use of Wabtic, a SaaS platform operated by <strong><a href="https://www.prowexa.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-emerald-400">PROWEXA TECHNOLOGIES PRIVATE LIMITED</a></strong> ("Prowexa", "Wabtic", "we", "us" or "our").
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> Registered Office:
            </span>
            <p className="text-slate-300 leading-relaxed font-mono">
              S.No.50/14/4/4, Near Patil House, Gokulnagar, Haveli, Pune, Maharashtra, 411041, India
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" /> Business / Corporate Office:
            </span>
            <p className="text-slate-300 leading-relaxed font-mono">
              Smartworks 43EQ, Plot A, opposite Bharti Vidyapeeth School, Balewadi, Pune, Maharashtra 411045
            </p>
          </div>
        </div>
      </div>

      {/* Main Legal Content */}
      <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-10 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-[#25D366]" /> 1. Agreement & User Identity
          </h2>
          <p>
            These Terms constitute a binding agreement between you and <strong>PROWEXA TECHNOLOGIES PRIVATE LIMITED</strong>.
          </p>
          <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-400 pl-2">
            <li>You agree to provide accurate, complete and current information when creating and maintaining your Wabtic account.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials and for all activity conducted through your account.</li>
            <li>If you are using Wabtic on behalf of a company or business, you confirm that you are authorised to accept these Terms on its behalf.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#25D366]" /> 2. Wabtic Services
          </h2>
          <p>
            Wabtic provides SaaS-based business communication and automation services, which may include:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              • WhatsApp Business Platform integrations
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              • Shared Inbox & Agent Management
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              • Customer communication tools
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              • Visual workflow and chatbot builders
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              • Broadcast and campaign functionality
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              • Analytics and reporting
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              • AI Copilot and AI-powered features
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              • AI agents and automation
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              • Product/catalogue functionality
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50">
              • Integrations and APIs
            </div>
          </div>
          <p className="text-xs text-slate-400 pt-1">
            Features and usage limits depend on the selected subscription plan, applicable credit balance, third-party requirements and technical availability. Wabtic may modify, improve, add or discontinue features from time to time.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#25D366]" /> 3. WhatsApp & Meta Platform Compliance
          </h2>
          <p>
            Wabtic's WhatsApp-related functionality depends on the WhatsApp Business Platform and Meta services. Users must comply with all applicable Meta and WhatsApp Business Platform terms, policies, messaging requirements, commerce policies, template requirements and applicable laws.
          </p>
          <p className="font-semibold text-xs text-slate-900 dark:text-white">Users must NOT use Wabtic for:</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
            <li>Spam or unsolicited messaging</li>
            <li>Unauthorized bulk messaging or broadcasts</li>
            <li>Fraudulent or deceptive activity</li>
            <li>Phishing or impersonation</li>
            <li>Illegal goods, services or content</li>
            <li>Malware or malicious activity</li>
            <li>Harassment, abuse or prohibited content</li>
            <li>Circumventing Meta or WhatsApp restrictions</li>
            <li>Unauthorized access to accounts or systems</li>
            <li>Any activity prohibited by Meta, WhatsApp or applicable law</li>
          </ul>
          <p className="text-xs text-slate-400 italic">
            Meta may independently restrict, suspend or disable WhatsApp Business Accounts, phone numbers, templates or other WhatsApp functionality. Wabtic cannot guarantee or override decisions made by Meta.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" /> 4. Prohibited & Security-Related Activities
          </h2>
          <p>
            You must not attempt to compromise, bypass, disrupt, reverse engineer, exploit or gain unauthorized access to Wabtic or its infrastructure.
          </p>
          <p className="font-semibold text-xs text-slate-900 dark:text-white">This includes, but is not limited to:</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
            <li>Attempting unauthorized access</li>
            <li>Circumventing authentication or security controls</li>
            <li>Exploiting vulnerabilities</li>
            <li>Introducing malware or malicious code</li>
            <li>Scraping or abusing platform infrastructure</li>
            <li>Conducting attacks or denial-of-service activity</li>
            <li>Manipulating credit balances or billing systems</li>
            <li>Circumventing usage limits</li>
            <li>Attempting to access another user's account or data</li>
            <li>Using Wabtic in a manner that creates a security, legal or operational risk</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" /> 5. Immediate Suspension, Freeze & Termination
          </h2>
          <p>
            Wabtic reserves the right to immediately suspend, restrict or freeze an account, feature, WhatsApp connection, credit usage or other platform access where we reasonably believe that the account or activity:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-2">
            <li>Violates these Terms;</li>
            <li>Violates Meta or WhatsApp policies;</li>
            <li>Involves illegal or fraudulent activity;</li>
            <li>Involves spam or unauthorized messaging;</li>
            <li>Creates a security or operational risk;</li>
            <li>Attempts to compromise or bypass Wabtic security;</li>
            <li>Abuses Wabtic services or infrastructure;</li>
            <li>Attempts to manipulate credits or billing; or</li>
            <li>May expose Wabtic, its users, partners or third parties to legal or security risks.</li>
          </ul>
          <p className="text-xs text-slate-400">
            Depending on the severity of the violation, Wabtic may permanently terminate the account. Where reasonably possible, Wabtic may review or investigate the relevant activity before restoring access. However, immediate suspension or freezing may occur without prior notice where necessary to protect Wabtic, its users, third parties, systems or comply with legal/third-party requirements.
          </p>
          <p className="text-xs text-slate-400 font-semibold">
            Suspension or termination resulting from a User's violation does not create an automatic right to a refund, subject to applicable law.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#25D366]" /> 6. Subscription Plans
          </h2>
          <p>
            Wabtic offers monthly and annual subscription plans as displayed on the pricing page. Subscription fees provide access to the features and limits included in the selected plan.
          </p>
          <p className="text-xs text-slate-400">
            A subscription does not automatically provide unlimited AI usage or unlimited WhatsApp messaging unless expressly stated. Subscription prices, features, limits and included allowances may change from time to time.
          </p>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" /> 7. AI Credits
          </h2>
          <p>
            AI Credits are digital usage units used exclusively for eligible AI-powered features within Wabtic, including AI Copilot, AI-assisted responses, AI agents, AI-powered workflows, AI content generation, AI automation, and other eligible AI features.
          </p>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <p className="font-bold text-emerald-400">AI Credits Rules & Limitations:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Are digital usage units and are not money;</li>
              <li>Are not a payment instrument;</li>
              <li>Cannot be withdrawn or converted into cash;</li>
              <li>Cannot be transferred between accounts, sold, gifted or shared;</li>
              <li>Cannot be assigned to another person or business;</li>
              <li>Cannot be converted into Messaging Credits; and</li>
              <li>Cannot be used for WhatsApp messaging charges.</li>
            </ul>
          </div>
          <p className="text-xs text-slate-400">
            AI Credit consumption is based on the applicable usage rate displayed within Wabtic.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-sky-400" /> 8. Messaging Credits
          </h2>
          <p>
            Messaging Credits are separate from AI Credits and are used exclusively for eligible WhatsApp messaging services provided through Wabtic. Messaging Credit consumption may depend on factors including message category, message type, recipient country and applicable Meta/WhatsApp pricing.
          </p>
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <p className="font-bold text-sky-400">Messaging Credits Rules & Limitations:</p>
            <ul className="list-disc list-inside text-slate-300 space-y-1">
              <li>Are digital usage units and are not money;</li>
              <li>Are not a payment instrument;</li>
              <li>Cannot be withdrawn or converted into cash;</li>
              <li>Cannot be transferred between accounts, sold, gifted or shared;</li>
              <li>Cannot be assigned to another person or business;</li>
              <li>Cannot be converted into AI Credits; and</li>
              <li>Cannot be used for AI-powered features.</li>
            </ul>
          </div>
          <p className="text-xs text-slate-400">
            The applicable messaging credit consumption rate may be displayed within the Wabtic platform.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-amber-400" /> 9. Separate Credit Systems
          </h2>
          <p>
            Wabtic maintains two separate credit systems:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-slate-300">
              <strong className="text-emerald-400">AI Credits:</strong> Used for eligible AI-powered features.
            </div>
            <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-slate-300">
              <strong className="text-sky-400">Messaging Credits:</strong> Used for eligible WhatsApp messaging services.
            </div>
          </div>
          <p className="text-xs text-slate-400 font-bold">
            AI Credits and Messaging Credits are NOT interchangeable. A balance in one credit system cannot be used to pay for services belonging to the other credit system.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#25D366]" /> 10. Unused Credits
          </h2>
          <p>
            Unused AI Credits and Messaging Credits may remain available in the User's Wabtic account for future eligible services while the account remains active and in good standing, subject to any applicable validity rules displayed at the time of purchase.
          </p>
          <p className="text-xs text-slate-400">
            Unused credits are not refundable, have no cash value, cannot be withdrawn, transferred, sold, gifted, shared, or exchanged for another type of credit.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#25D366]" /> 11. Payments
          </h2>
          <p>
            Payments for Wabtic subscriptions and credit purchases are processed through <strong>Razorpay</strong>. Wabtic does not intentionally store raw credit/debit card numbers, CVV information, UPI PINs or banking passwords on its own infrastructure.
          </p>
          <p className="text-xs text-slate-400">
            Payment processing may be subject to the terms, privacy practices and security controls of the applicable payment service provider.
          </p>
        </section>

        {/* Section 12 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-rose-500" /> 12. Non-Refundable Policy
          </h2>
          <p>
            Subscription payments and AI Credit/Messaging Credit purchases are non-refundable, except where required by applicable law.
          </p>
          <p className="text-xs text-slate-400 font-semibold">
            Consumed credits are non-refundable. Unused credits are non-refundable.
          </p>
        </section>

        {/* Section 13 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#25D366]" /> 13. Subscription Cancellation
          </h2>
          <p>
            Users may cancel their subscription through available account settings or by contacting Wabtic Support. Cancellation prevents future renewal but does not automatically terminate the current paid subscription period.
          </p>
          <div className="space-y-3 pt-1 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Monthly Subscription</h4>
              <p className="text-slate-400 leading-relaxed">
                Once a monthly billing period has started, the subscription fee is not eligible for a prorated refund. Cancellation prevents the next renewal, while access generally continues until the end of the current paid billing period.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Annual Subscription</h4>
              <p className="text-slate-400 leading-relaxed">
                Annual subscriptions are prepaid for the complete selected annual term. If an annual subscription is cancelled before the end of the current annual term, the unused portion of the subscription is not eligible for a prorated or partial refund. <em>For example, if a customer purchases a 12-month annual plan and cancels after 6 months, the remaining 6 months are not refundable.</em> Cancellation will only prevent renewal for the next annual term.
              </p>
            </div>
          </div>
        </section>

        {/* Section 14 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Ban className="w-5 h-5 text-rose-500" /> 14. Account Termination
          </h2>
          <p>
            Wabtic may terminate an account for serious or repeated violations of these Terms, applicable law, Meta/WhatsApp policies, security requirements or payment obligations.
          </p>
          <p className="text-xs text-slate-400">
            Upon termination, access to Wabtic services may be discontinued. Any handling of remaining account data or credits will be subject to these Terms, applicable policies and applicable law.
          </p>
        </section>

        {/* Section 15 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#25D366]" /> 15. User Content & Customer Data
          </h2>
          <p>
            Users remain responsible for the legality, accuracy and permissions relating to customer/contact data, messages, media, campaigns and other content submitted through Wabtic.
          </p>
          <p className="text-xs text-slate-400">
            You must ensure that you have appropriate rights, permissions and lawful grounds to process and communicate with your contacts through the platform.
          </p>
        </section>

        {/* Section 16 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#25D366]" /> 16. Intellectual Property
          </h2>
          <p>
            Wabtic software, platform interface, branding, designs, documentation, workflows, technology and related intellectual property remain the property of Prowexa or its licensors unless otherwise stated.
          </p>
          <p className="text-xs text-slate-400">
            Users receive a limited, non-exclusive, non-transferable right to use Wabtic during an active subscription in accordance with these Terms.
          </p>
        </section>

        {/* Section 17 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#25D366]" /> 17. Third-Party Services
          </h2>
          <p>
            Wabtic may depend on third-party services including Meta/WhatsApp, Razorpay, cloud infrastructure providers, AI providers and other technology providers.
          </p>
          <p className="text-xs text-slate-400">
            Availability, functionality or pricing of third-party services may change independently of Wabtic. Wabtic is not responsible for interruptions or restrictions caused by third-party services beyond its reasonable control.
          </p>
        </section>

        {/* Section 18 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" /> 18. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, Prowexa shall not be liable for indirect, incidental, special or consequential losses arising from the use or inability to use Wabtic.
          </p>
          <p className="text-xs text-slate-400">
            Wabtic does not guarantee uninterrupted availability of third-party platforms, including Meta/WhatsApp.
          </p>
        </section>

        {/* Section 19 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#25D366]" /> 19. Governing Law & Jurisdiction
          </h2>
          <p>
            These Terms are governed by the laws of India. Subject to applicable law, disputes arising from these Terms or use of Wabtic shall be subject to the jurisdiction of the courts located in <strong>Pune, Maharashtra, India</strong>.
          </p>
        </section>

        {/* Section 20 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#25D366]" /> 20. Contact & Official Addresses
          </h2>
          <p>For questions regarding these Terms:</p>
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs space-y-3">
            <p className="font-bold text-white text-sm font-sans">PROWEXA TECHNOLOGIES PRIVATE LIMITED</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div>
                <span className="text-slate-400 font-sans block">Registered Office:</span>
                S.No.50/14/4/4, Near Patil House, Gokulnagar, Haveli, Pune, Maharashtra, 411041, India
              </div>
              <div>
                <span className="text-slate-400 font-sans block">Business / Corporate Office:</span>
                Smartworks 43EQ, Plot A, opposite Bharti Vidyapeeth School, Balewadi, Pune, Maharashtra 411045
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2 font-sans text-slate-300">
              <p><strong>Support Email:</strong> <a href="mailto:support@wabtic.com" className="text-emerald-400 hover:underline">support@wabtic.com</a></p>
              <p><strong>Billing Desk:</strong> <a href="mailto:billing@prowexa.com" className="text-emerald-400 hover:underline">billing@prowexa.com</a></p>
              <p><strong>Privacy Office:</strong> <a href="mailto:privacy@prowexa.com" className="text-emerald-400 hover:underline">privacy@prowexa.com</a></p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}


