import React from 'react';
import { ShieldCheck, Lock, Database, Server, Eye, FileCheck, Building, MapPin, Mail, Coins, ShieldAlert, Cpu, UserCheck, Cookie, AlertOctagon, HelpCircle, FileText } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="pt-12 pb-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
          <ShieldCheck className="w-3.5 h-3.5" /> Data Security & Privacy Commitment
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Privacy <span className="text-[#25D366]">Policy</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Last Updated: August 2026 | PROWEXA TECHNOLOGIES PRIVATE LIMITED
        </p>
      </div>

      {/* Corporate Identity & Address Box */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-emerald-500/40 text-white space-y-4 shadow-xl">
        <div className="flex items-center gap-3 text-[#25D366] font-bold text-lg">
          <Building className="w-6 h-6 shrink-0" />
          <a href="https://www.prowexa.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-emerald-400">PROWEXA TECHNOLOGIES PRIVATE LIMITED</a> (CIN: U62090PN2025PTC249889)
        </div>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          <a href="https://www.prowexa.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-emerald-400">PROWEXA TECHNOLOGIES PRIVATE LIMITED</a> ("Prowexa", "Wabtic", "we", "us" or "our") respects the privacy and security of information processed through the Wabtic platform. This Privacy Policy explains what information we collect, why we collect it, how we use and protect it, and the choices available to users.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 font-sans">
              <MapPin className="w-3.5 h-3.5" /> Registered Office:
            </span>
            <p className="text-slate-300 leading-relaxed font-mono">
              S.No.50/14/4/4, Near Patil House, Gokulnagar, Haveli, Pune, Maharashtra, 411041, India
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5 font-sans">
              <Building className="w-3.5 h-3.5" /> Business / Corporate Office:
            </span>
            <p className="text-slate-300 leading-relaxed font-mono">
              Smartworks 43EQ, Plot A, opposite Bharti Vidyapeeth School, Balewadi, Pune, Maharashtra 411045
            </p>
          </div>
        </div>
      </div>

      {/* Main Privacy Body */}
      <div className="bg-white dark:bg-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-10 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
        
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#25D366]" /> 1. Information We Collect
          </h2>
          <p>Depending on how you use Wabtic, we may collect the following information:</p>
          
          <div className="space-y-3 pt-1 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Account & Business Information</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-400">
                <li>• Company or business name</li>
                <li>• GSTIN and business identification information</li>
                <li>• Registered or business address</li>
                <li>• Name of authorised users</li>
                <li>• Official email address</li>
                <li>• Phone number</li>
                <li>• Account information</li>
                <li>• Subscription information</li>
                <li>• Billing-related information</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">WhatsApp & Business Platform Information</h4>
              <p className="text-slate-400">
                Where WhatsApp functionality is enabled, we may process information required to provision and operate WhatsApp Business Platform integrations, including:
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-slate-400">
                <li>• WhatsApp Business Account identifiers</li>
                <li>• Business phone numbers</li>
                <li>• WhatsApp-related account identifiers</li>
                <li>• Message metadata</li>
                <li>• Message content</li>
                <li>• Delivery and status information</li>
                <li>• Customer/contact information</li>
                <li>• Campaign and messaging information</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#25D366]" /> 2. Customer Chat Logs & Messaging Data
          </h2>
          <p>
            Messages and customer/contact information processed through Wabtic may be stored and processed to provide Shared Inbox, automation, workflow, analytics, campaign and related services.
          </p>
          <p className="text-xs text-slate-400">
            Data transmitted between your browser, application and Wabtic infrastructure is protected using industry-standard transport encryption such as TLS. Stored information is protected using appropriate technical and organisational security measures, including encryption at rest where applicable, access controls, authentication mechanisms and monitoring.
          </p>
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-semibold text-emerald-400">
            Wabtic does NOT sell customer contact databases or customer chat data as a commercial data product.
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#25D366]" /> 3. AI Data Processing
          </h2>
          <p>
            Where users use Wabtic AI features, relevant information may be processed by Wabtic and applicable AI/technology service providers to provide the requested AI functionality.
          </p>
          <p className="text-xs text-slate-400">
            AI-related processing may include prompts, messages, business information or other information required to generate an AI response or perform an AI-powered action. Users should not submit sensitive or confidential information to AI features unless they are authorised to do so and the relevant processing is appropriate.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-[#25D366]" /> 4. Payment Information
          </h2>
          <p>
            Payments for Wabtic subscriptions and credit purchases are processed through <strong>Razorpay</strong>. Wabtic does not intentionally store raw credit/debit card numbers, CVV information, UPI PINs or banking passwords on Wabtic infrastructure.
          </p>
          <p className="text-xs text-slate-400">
            Wabtic may receive and retain payment-related information such as: Payment/order ID, transaction reference, payment status, amount, currency, subscription information, and other information necessary for billing, reconciliation, accounting, customer support and fraud prevention. Payment processing is subject to the applicable payment provider's own terms, privacy policy and security practices.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#25D366]" /> 5. AI Credits & Messaging Credits
          </h2>
          <p>
            Wabtic maintains separate AI Credit and Messaging Credit balances. We may collect and process information about: credits purchased, credits allocated, credits consumed, credit balance, credit transactions, and feature usage associated with credit consumption.
          </p>
          <p className="text-xs text-slate-400 font-semibold">
            AI Credits and Messaging Credits are maintained separately and are not interchangeable.
          </p>
        </section>

        {/* Section 6 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#25D366]" /> 6. How We Use Information
          </h2>
          <p>We may use collected information to:</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-400">
            <li>• Create and manage Wabtic accounts</li>
            <li>• Provide Wabtic services</li>
            <li>• Operate WhatsApp Business Platform integrations</li>
            <li>• Process subscriptions and credit purchases</li>
            <li>• Maintain AI and Messaging Credit balances</li>
            <li>• Provide customer support</li>
            <li>• Operate AI and automation features</li>
            <li>• Monitor platform usage</li>
            <li>• Detect and prevent fraud, abuse and security incidents</li>
            <li>• Improve platform performance and features</li>
            <li>• Communicate important service information</li>
            <li>• Maintain business and financial records</li>
            <li>• Comply with applicable legal obligations</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-[#25D366]" /> 7. Third-Party Service Providers
          </h2>
          <p>
            Wabtic may use trusted third-party providers to operate and improve the platform, including: Meta/WhatsApp, Razorpay, Cloud infrastructure providers, AI/technology providers, Analytics providers, Email and communication providers, and other service providers required to operate Wabtic.
          </p>
          <p className="text-xs text-slate-400">
            Third parties may process information as necessary to provide their respective services and according to applicable agreements, policies and law.
          </p>
        </section>

        {/* Section 8 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-[#25D366]" /> 8. Data Storage & Processing
          </h2>
          <p>
            Wabtic may use cloud infrastructure located in India and/or other jurisdictions depending on the service, provider and technical architecture. Specific information may be stored or processed by third-party service providers in locations required to provide their services.
          </p>
          <p className="text-xs text-slate-400">
            Where personal data is transferred or processed across jurisdictions, Wabtic will apply appropriate safeguards and comply with applicable legal requirements.
          </p>
        </section>

        {/* Section 9 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#25D366]" /> 9. Data Security
          </h2>
          <p>
            We use reasonable technical and organisational measures designed to protect information from unauthorised access, alteration, disclosure, loss or destruction. Security measures include: encryption in transit, encryption at rest where applicable, access controls, authentication, monitoring and logging, infrastructure security controls, and internal security procedures.
          </p>
          <p className="text-xs text-slate-400 italic">
            No internet-based system can guarantee absolute security. Users are responsible for maintaining the security of their account credentials and authorised access.
          </p>
        </section>

        {/* Section 10 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-[#25D366]" /> 10. Data Retention
          </h2>
          <p>
            We retain information for as long as reasonably necessary to: provide Wabtic services, maintain business records, process billing and accounting, comply with legal obligations, resolve disputes, prevent fraud and abuse, maintain security, and enforce our agreements.
          </p>
        </section>

        {/* Section 11 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#25D366]" /> 11. Data Export & Deletion
          </h2>
          <p>
            Subject to applicable law and legitimate retention requirements, users may request access, export, correction or deletion of information associated with their account.
          </p>
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
            <p className="font-sans font-bold text-white">Requests can be submitted to:</p>
            <p>Email: <a href="mailto:privacy@prowexa.com" className="text-emerald-400 hover:underline">privacy@prowexa.com</a> or <a href="mailto:support@wabtic.com" className="text-emerald-400 hover:underline">support@wabtic.com</a></p>
          </div>
          <p className="text-xs text-slate-400">
            Certain information may need to be retained where required for legal, accounting, security, fraud-prevention or dispute-resolution purposes.
          </p>
        </section>

        {/* Section 12 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#25D366]" /> 12. User Responsibilities
          </h2>
          <p>
            Users are responsible for ensuring that they have the necessary rights, permissions and lawful basis to provide customer/contact information to Wabtic and to communicate with those contacts.
          </p>
          <p className="text-xs text-slate-400">
            Users must not upload or process personal information through Wabtic unlawfully. Users are also responsible for complying with applicable WhatsApp/Meta policies when using Wabtic messaging functionality.
          </p>
        </section>

        {/* Section 13 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#25D366]" /> 13. Privacy Rights
          </h2>
          <p>
            Depending on applicable law, users may have rights relating to their personal data, including rights concerning access, correction, deletion, consent and grievance redressal. Wabtic will handle applicable requests in accordance with applicable law and regulatory requirements.
          </p>
        </section>

        {/* Section 14 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#25D366]" /> 14. Children's Data
          </h2>
          <p>
            Wabtic is intended for businesses and professional users and is not designed for children. Users must not knowingly submit children's personal data to Wabtic unless legally permitted and appropriate authorisation has been obtained.
          </p>
        </section>

        {/* Section 15 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Cookie className="w-5 h-5 text-[#25D366]" /> 15. Cookies & Technical Information
          </h2>
          <p>
            Wabtic may use cookies, local storage, logs and similar technologies for purposes such as: Authentication, Session management, Security, Preferences, Analytics, and Improving platform performance.
          </p>
          <p className="text-xs text-slate-400">
            Users may be able to control certain cookies through their browser or device settings.
          </p>
        </section>

        {/* Section 16 */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-[#25D366]" /> 16. Data Breach & Security Incidents
          </h2>
          <p>
            Where required by applicable law, Wabtic will take appropriate steps in response to security incidents, including notifying affected users and relevant authorities.
          </p>
        </section>

        {/* Contact Footer */}
        <section className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#25D366]" /> Official Privacy Contact & Addresses
          </h2>
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
            <div className="pt-2 border-t border-slate-800 font-sans text-slate-300">
              <p><strong>Privacy Email:</strong> <a href="mailto:privacy@prowexa.com" className="text-emerald-400 hover:underline">privacy@prowexa.com</a> | <a href="mailto:support@wabtic.com" className="text-emerald-400 hover:underline">support@wabtic.com</a></p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

