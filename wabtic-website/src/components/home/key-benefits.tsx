import React from 'react';
import { Megaphone, Send, LineChart, Bot, CalendarClock, ArrowRight } from 'lucide-react';
import { NavTab } from '@/types';

interface KeyBenefitsProps {
  onNavigate: (tab: NavTab) => void;
}

export function KeyBenefits({ onNavigate }: KeyBenefitsProps) {
  const features = [
    {
      icon: Megaphone,
      title: 'WhatsApp Marketing',
      description: 'Run targeted marketing campaigns with approved HSM rich-media templates, interactive buttons, and personalized contact lists.'
    },
    {
      icon: Send,
      title: 'Bulk Message Sending',
      description: 'Broadcast high-volume promotional messages & operational notifications to opt-in contacts with high deliverability.'
    },
    {
      icon: LineChart,
      title: 'Live Insights',
      description: 'Track real-time open rates, click-through metrics, message delivery status, and customer engagement on a unified dashboard.'
    },
    {
      icon: Bot,
      title: 'AI Automation Reply Bots',
      description: 'Deploy intelligent 24/7 auto-reply bots trained on your business FAQs to handle customer inquiries instantly.'
    },
    {
      icon: CalendarClock,
      title: 'Campaign Schedule',
      description: 'Schedule broadcasts for future dates, specific timezones, and recurring automated customer drip sequences.'
    }
  ];

  return (
    <section className="py-16 md:py-24 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#006d2f] dark:text-[#25D366]">
            Core Platform Capabilities
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Everything Required for Professional WhatsApp Outreach
          </p>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Enterprise-grade messaging infrastructure designed for reliable performance and easy integration.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-4 hover:border-emerald-500/50 transition-colors group"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-[#006d2f] dark:text-[#25D366]">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <button
                  onClick={() => onNavigate('features')}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#006d2f] dark:text-[#25D366] hover:underline pt-2 cursor-pointer"
                >
                  Learn more <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
