import React from 'react';
import { Building2, TrendingUp, Star, Users, MessageSquare, ArrowRight, ShieldCheck } from 'lucide-react';
import { NavTab } from '@/types';

interface CustomersPageProps {
  onNavigate: (tab: NavTab) => void;
}

export function CustomersPage({ onNavigate }: CustomersPageProps) {
  const caseStudies = [
    {
      company: 'Habuild',
      category: 'Health & Wellness SaaS',
      metric: '3.4x Increase in Renewal Rate',
      highlight: 'Automated daily fitness challenge reminders, interactive polls, and automated WhatsApp subscription payments using Razorpay links.',
      quote: 'Wabtic revolutionized how we engage over 100,000 active community members daily on WhatsApp.',
    },
    {
      company: 'Vedantu',
      category: 'EdTech Platform',
      metric: '85% Reduction in Response Time',
      highlight: 'Deployed Gemini AI bot auto-responders for course inquiries and instant HSM template notifications for class reminders.',
      quote: 'The Shared Team Inbox allowed 50+ student advisors to operate under one official WhatsApp number seamlessly.',
    },
    {
      company: 'ENI Networks',
      category: 'Telecom & ISP Provider',
      metric: '92% Automated Bill Resolution',
      highlight: 'Integrated automated bill alert webhooks, instant payment link dispatches, and WhatsApp catalog browsing for plan upgrades.',
      quote: 'Our billing collection costs dropped by 40% within 60 days of switching to Prowexa WhatsApp automation.',
    },
  ];

  return (
    <div className="pt-12 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
          <Users className="w-3.5 h-3.5" /> Client Success Stories
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Trusted by <span className="text-[#25D366]">Industry Pioneers</span>
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          Discover how leading EdTech, E-Commerce, Health, and Telecom brands scale sales & support using Wabtic.
        </p>
      </div>

      {/* Featured Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {caseStudies.map((cs, idx) => (
          <div
            key={idx}
            className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between space-y-6 hover:border-[#25D366]/50 transition-all group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold">{cs.category}</span>
                <div className="flex gap-0.5 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>

              <h2 className="text-2xl font-black text-slate-900 dark:text-white group-hover:text-[#25D366] transition-colors">{cs.company}</h2>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#25D366] font-extrabold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 shrink-0" /> {cs.metric}
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{cs.highlight}</p>

              <blockquote className="text-xs italic text-slate-500 dark:text-slate-400 border-l-2 border-[#25D366] pl-3 py-1">
                "{cs.quote}"
              </blockquote>
            </div>

            <button
              onClick={() => onNavigate('demo')}
              className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#25D366] hover:text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              See Demo Workflows <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div className="p-10 rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-slate-900 border border-emerald-500/30 text-white text-center space-y-6 shadow-2xl">
        <h2 className="text-3xl font-extrabold">Ready to Join 4,500+ Growing Businesses?</h2>
        <p className="text-sm text-slate-300 max-w-xl mx-auto">
          Start your 14-day free trial on the official Meta WhatsApp Cloud API today. Zero setup fees.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigate('demo')}
            className="px-6 py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-extrabold text-xs shadow-lg shadow-[#25D366]/20 transition-all cursor-pointer"
          >
            Book Live Platform Demo
          </button>
          <button
            onClick={() => onNavigate('pricing')}
            className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all cursor-pointer"
          >
            View Pricing Calculator
          </button>
        </div>
      </div>
    </div>
  );
}
