import React from 'react';
import { ArrowRight } from 'lucide-react';
import { NavTab } from '@/types';

interface CTASectionProps {
  onNavigate: (tab: NavTab) => void;
}

export function CTASection({ onNavigate }: CTASectionProps) {
  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-gradient-to-r from-[#006d2f] to-teal-800 rounded-3xl p-8 sm:p-12 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8 text-white shadow-2xl">
        <div className="space-y-3 text-center md:text-left max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Scale Your WhatsApp Outreach?
          </h2>
          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Get started in minutes with automated broadcasts, AI auto-replies, and real-time campaign analytics.
          </p>
        </div>

        <div className="shrink-0">
          <button
            onClick={() => onNavigate('demo')}
            className="inline-flex items-center gap-2 bg-[#25D366] text-slate-950 font-bold text-sm px-6 py-3.5 rounded-xl hover:bg-[#20bd5a] transition-all shadow-lg shadow-black/20 cursor-pointer"
          >
            Get Started for Free
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
