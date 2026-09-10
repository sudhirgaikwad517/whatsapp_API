import React from 'react';
import { PlayCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { NavTab } from '@/types';

interface HeroProps {
  onNavigate: (tab: NavTab) => void;
}

export function Hero({ onNavigate }: HeroProps) {
  return (
    <section className="py-16 md:py-24 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Column: Copy & Actions */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-[#006d2f] dark:text-[#25D366]">
              <ShieldCheck className="w-3.5 h-3.5" /> Official Meta WhatsApp Business Platform Partner
            </div>

            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Automate Your <span className="text-[#006d2f] dark:text-[#25D366]">WhatsApp</span> Business Growth
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
              Deliver targeted marketing broadcasts, build smart AI response bots, and manage customer support workflows at scale with real-time analytics.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
              <button
                onClick={() => onNavigate('demo')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-sm transition-all shadow-lg shadow-[#25D366]/20 cursor-pointer"
              >
                Get Started for Free
              </button>

              <button
                onClick={() => onNavigate('demo')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4 text-[#006d2f] dark:text-[#25D366]" />
                Watch Platform Demo
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 dark:text-slate-400 pt-2 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#006d2f] dark:text-[#25D366]" />
                No Setup Fees
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#006d2f] dark:text-[#25D366]" />
                Instant API Access
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#006d2f] dark:text-[#25D366]" />
                99.9% Uptime SLA
              </div>
            </div>
          </div>

          {/* Right Column: Platform Preview */}
          <div className="w-full hidden md:block">
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-2xl space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-xs font-semibold">
                <span className="text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live WhatsApp Campaign Dispatcher
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full font-bold text-[11px]">
                  Active
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAL33gyZYmwzopLtbJciZ5etq-KjpFLEw_5KIQ7vKmY7dRfK4OR_kTUofMNzNVQHrMalQgDOZfTYOoJ4R-oquFldFWk6O4zQy1lN9f-cbk6ua-5PHG6Tx-qhXvWh3tZk1UyHsSE6PhV_DrZI-9xAodOTYWJVESRwGQ7YtYiGkrVvaeFTy_GO0RS6vcYHnUV5LCDblu9BXbRXsyExu-bLp_aHDpOm3EcpJEOe_b1bE5qW6bnZDY_kdI2-w"
                  alt="Wabtic Platform Dashboard"
                  className="w-full h-64 object-cover"
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
