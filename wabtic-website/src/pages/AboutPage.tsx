import React from 'react';
import { Building2, Shield, Users, Globe, Award, Sparkles, CheckCircle2, ArrowRight, MessageSquare } from 'lucide-react';
import { NavTab } from '@/types';

interface AboutPageProps {
  onNavigate: (tab: NavTab) => void;
}

export function AboutPage({ onNavigate }: AboutPageProps) {
  const stats = [
    { label: 'Messages Processed / Mo', value: '250M+' },
    { label: 'Global Active Brands', value: '4,500+' },
    { label: 'Platform Uptime SLA', value: '99.99%' },
    { label: 'Countries Supported', value: '60+' },
  ];

  const values = [
    {
      title: 'Meta API First',
      description: 'Built around the official Meta WhatsApp Business Platform to provide reliable, scalable and policy-compliant business messaging infrastructure.',
      icon: Shield,
    },
    {
      title: 'Autonomous AI Commerce',
      description: 'Powering automated product discovery, Razorpay payment-link generation and contextual AI-assisted customer experiences.',
      icon: Sparkles,
    },
    {
      title: 'Data Security & Privacy',
      description: 'Designed with secure data handling, access controls and encryption practices to help protect business and customer information across the Wabtic platform.',
      icon: Building2,
    },
  ];

  return (
    <div className="pt-12 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Hero Header */}
      <div className="text-center max-w-4xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-xs font-bold uppercase tracking-wider">
          <Award className="w-3.5 h-3.5" /> Official Meta Tech Partner
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Empowering Brands with <span className="text-[#25D366]">WhatsApp Business Automation</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          <a href="https://www.prowexa.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-[#25D366]">Prowexa Technologies Private Limited</a> builds next-generation conversation intelligence, multi-agent shared inboxes, and AI-powered sales engines on Meta’s official WhatsApp Cloud API.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl">
        {stats.map((stat, idx) => (
          <div key={idx} className="text-center space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-[#25D366]">{stat.value}</div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Globe className="w-6 h-6 text-[#25D366]" /> Our Core Mission
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            We aim to replace fragmented, slow customer communication channels with direct, real-time and interactive WhatsApp experiences. From recovering abandoned carts and sending order updates to automating customer support with AI, Wabtic helps businesses build faster and more effective customer communication.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#25D366]" /> Corporate Integrity & Compliance
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Operating legally as <strong>PROWEXA TECHNOLOGIES PRIVATE LIMITED</strong> (CIN: U62090PN2025PTC249889), Wabtic is designed with strong security, responsible data handling and applicable Indian legal and regulatory requirements in mind. Payments are processed securely through our payment gateway, Razorpay.
          </p>
        </div>
      </div>

      {/* Core Values */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Why Industry Leaders Choose Prowexa</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Architected for scale, speed, and regulatory compliance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((val, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold">
                <val.icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{val.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{val.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Corporate Registration Box */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/30 text-white space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="text-xl font-extrabold text-white">PROWEXA TECHNOLOGIES PRIVATE LIMITED</h3>
            <p className="text-xs font-mono text-emerald-400">CIN: U62090PN2025PTC249889 | Govt. MCA Registered Entity</p>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              <strong>Registered Office:</strong> S.No.50/14/4/4, Near Patil House, Gokulnagar, Haveli, Pune, Maharashtra, 411041, India.<br />
              <strong>Business / Corporate Office:</strong> Smartworks 43EQ, Plot A, opposite Bharti Vidyapeeth School, Balewadi, Pune, Maharashtra 411045.
            </p>
          </div>
          <button
            onClick={() => onNavigate('contact')}
            className="px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-[#25D366]/20 shrink-0 transition-all cursor-pointer"
          >
            Contact Legal & Compliance <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
