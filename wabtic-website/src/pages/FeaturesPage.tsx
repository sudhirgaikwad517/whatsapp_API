import React from 'react';
import { 
  ShieldCheck, 
  Send, 
  LayoutTemplate, 
  Bot, 
  Users, 
  Zap, 
  Webhook, 
  BarChart3, 
  FileText, 
  Database,
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { NavTab } from '@/types';

interface FeaturesPageProps {
  onNavigate: (tab: NavTab) => void;
}

export function FeaturesPage({ onNavigate }: FeaturesPageProps) {
  const featureList = [
    {
      id: 'official-api',
      icon: ShieldCheck,
      title: 'Official Meta WhatsApp Business API',
      subtitle: 'Verified Cloud API Architecture',
      desc: 'Access official WhatsApp Cloud API infrastructure directly from Meta. Enjoy green tick verification eligibility, high throughput capacity, built on official Meta WhatsApp Business Platform infrastructure and designed for policy-compliant messaging.',
      highlights: ['Direct Meta Cloud Hosting', 'Green Tick Verification Support', 'High-throughput WhatsApp messaging infrastructure', 'Meta TOS Compliant']
    },
    {
      id: 'bulk-messaging',
      icon: Send,
      title: 'High-Throughput Bulk Messaging',
      subtitle: 'Scalable Broadcast Campaigns',
      desc: 'Broadcast targeted promotional offers, order updates, and product announcements to thousands of opted-in customers concurrently. Schedule campaigns and monitor real-time delivery progress.',
      highlights: ['Batch Processing (500 req/s)', 'CSV & CRM Audience Imports', 'Smart Throttling & Rate Control', 'Scheduled Campaign Engine']
    },
    {
      id: 'templates',
      icon: LayoutTemplate,
      title: 'Interactive Template Messaging (HSM)',
      subtitle: 'Rich Media & Action Buttons',
      desc: 'Design and submit Meta-compliant High Structured Messages (HSM) featuring custom header images, videos, documents, dynamic variable replacements, quick reply buttons, and call-to-action links.',
      highlights: ['Header Image, Video & PDF Support', 'Quick Reply & CTA Buttons', 'Dynamic {{1}} Variables', 'Instant Meta Review Status']
    },
    {
      id: 'automation',
      icon: Zap,
      title: 'Workflow Automation & Triggers',
      subtitle: 'Event-Driven Chat Logic',
      desc: 'Automate post-purchase customer journeys, abandoned cart reminders, payment receipts, appointment confirmations, and satisfaction surveys without writing code.',
      highlights: ['Abandoned Cart Recovery', 'Order Status Notifications', 'Automated OTP Verification', 'Drip Nurturing Sequences']
    },
    {
      id: 'multi-agent-inbox',
      icon: Users,
      title: 'Multi-Agent Shared Team Inbox',
      subtitle: 'Unified Support Workspace',
      desc: 'Empower customer service teams with a shared WhatsApp inbox. Assign incoming chats to specific agents, add internal team notes, track SLA response times, and prevent agent collision.',
      highlights: ['Unlimited Agent Seats', 'Auto Round-Robin Routing', 'Internal Team Notes & Mentions', 'Collision Prevention Lock']
    },
    {
      id: 'chatbot',
      icon: Bot,
      title: 'AI Chatbot & Flow Integration',
      subtitle: '24/7 Intelligent Customer Handling',
      desc: 'Deploy custom conversational AI chatbots trained on your company knowledge base to resolve up to 80% of routine customer inquiries automatically.',
      highlights: ['Natural Language Intent Recognition', 'Automated FAQ Resolution', 'Seamless Agent Handoff', 'LLM & Custom Knowledge Base Sync']
    },
    {
      id: 'crm',
      icon: Database,
      title: 'Deep CRM & E-Commerce Integration',
      subtitle: 'Plug-and-Play Connectors',
      desc: 'Connect your WhatsApp messaging directly with Shopify, HubSpot, Salesforce, Zoho, WooCommerce, and custom databases to maintain a single source of customer truth.',
      highlights: ['Shopify Order Sync', 'HubSpot & Salesforce Contact Sync', 'Zapier 5000+ App Connectors', 'Custom SQL Database Hooks']
    },
    {
      id: 'webhooks',
      icon: Webhook,
      title: 'Real-time Event Webhooks',
      subtitle: 'Bi-directional Data Pipeline',
      desc: 'Subscribe to instant HTTP webhooks for incoming customer text messages, media attachments, delivery receipts, read timestamps, and button click events.',
      highlights: ['Real-time Event Delivery (< 20ms)', 'HMAC Signature Security', 'Automatic Retry Engine', 'Custom Event Filters']
    },
    {
      id: 'delivery-reports',
      icon: FileText,
      title: 'Detailed Delivery Reports & Receipts',
      subtitle: 'Message Lifecycle Traceability',
      desc: 'Track every single message status from Sent, Delivered, Read, to Failed with precise timestamp metadata and explicit error code diagnostics.',
      highlights: ['Sent / Delivered / Read Indicators', 'Meta Error Code Breakdown', 'Recipient Phone Validation', 'Exportable Logs']
    },
    {
      id: 'analytics',
      icon: BarChart3,
      title: 'Advanced Conversational Analytics',
      subtitle: 'Data-Driven ROI Insights',
      desc: 'Gain actionable visibility into messaging ROI, read rates, response latencies, agent performance metrics, and customer conversion rates across campaigns.',
      highlights: ['Campaign CTR Tracking', 'Agent SLA Metrics', 'Volume Heatmaps', 'CSV & PDF Data Exports']
    }
  ];

  return (
    <div className="pt-12 pb-20 space-y-16">
      
      {/* Page Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <Sparkles className="w-4 h-4" /> Platform Capabilities
        </div>
        <h1 className="text-4xl sm:text-6xl font-extrabold text-[#111b21] dark:text-white tracking-tight">
          Comprehensive <span className="text-[#25D366]">WhatsApp API Features</span>
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
          Explore our suite of enterprise tools built to power high-volume outreach, customer engagement, and automated support on WhatsApp.
        </p>
      </section>

      {/* Grid of Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {featureList.map((feature) => (
            <div
              key={feature.id}
              id={feature.id}
              className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition-all duration-300 shadow-xl space-y-5"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
                  <feature.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                  <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">{feature.subtitle}</span>
                </div>
              </div>

              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                {feature.desc}
              </p>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2">
                {feature.highlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <div className="bg-slate-900 p-10 rounded-3xl border border-emerald-500/30 space-y-4">
          <h3 className="text-2xl font-bold text-white">Ready to test these features in live environment?</h3>
          <p className="text-sm text-slate-400">Request a sandbox API key and get instant access to our live developer tools.</p>
          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('demo')}
              className="px-6 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-[#25D366]/20 flex items-center gap-2 cursor-pointer"
            >
              Book a Demo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
