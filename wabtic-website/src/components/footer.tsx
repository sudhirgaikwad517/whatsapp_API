import React, { useState } from 'react';
import { MessageSquare, Shield, Terminal, Zap, Send, CheckCircle2, Building, MapPin } from 'lucide-react';
import { NavTab } from '@/types';

interface FooterProps {
  onNavigate: (tab: NavTab) => void;
}

export function Footer({ onNavigate }: FooterProps) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setEmail('');
    setTimeout(() => setSubscribed(false), 4000);
  };

  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-900/80 pt-16 pb-12 w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Grid: 5 columns layout */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-12 pb-12 border-b border-slate-900">
          
          {/* Brand & Corporate Info (Spans 2 columns on desktop) */}
          <div className="col-span-2 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#25D366] flex items-center justify-center text-slate-950 font-extrabold shadow-md shadow-emerald-500/20">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <span className="font-extrabold text-2xl text-white tracking-tight">Wabtic</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
              Official Meta WhatsApp Cloud API platform built by <strong><a href="https://www.prowexa.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-emerald-400">PROWEXA TECHNOLOGIES PRIVATE LIMITED</a></strong> (CIN: <code>U62090PN2025PTC249889</code>).
            </p>

            <div className="space-y-1 text-[11px] text-slate-400">
              <p className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Shield className="w-3.5 h-3.5" /> Meta Tech Partner Compliant
              </p>
              <p className="flex items-start gap-1.5 text-slate-400 leading-relaxed pt-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span><strong>Reg. Office:</strong> S.No.50/14/4/4, Near Patil House, Gokulnagar, Haveli, Pune, MH 411041</span>
              </p>
              <p className="flex items-start gap-1.5 text-slate-400 leading-relaxed">
                <Building className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span><strong>Business Office:</strong> Smartworks 43EQ, Plot A, opposite Bharti Vidyapeeth School, Balewadi, Pune, MH 411045</span>
              </p>
            </div>
          </div>

          {/* Column 1: Company */}
          <div className="col-span-1 lg:col-span-1 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#25D366]">Company</h2>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button onClick={() => onNavigate('about')} className="hover:text-emerald-400 transition-colors text-slate-300 text-left cursor-pointer">
                  About Us
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('careers')} className="hover:text-emerald-400 transition-colors text-slate-300 text-left cursor-pointer flex items-center gap-1.5">
                  Careers <span className="px-1.5 py-0.2 rounded-full bg-[#25D366]/20 text-[#25D366] text-[9px] font-bold">Hiring</span>
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('customers')} className="hover:text-emerald-400 transition-colors text-slate-300 text-left cursor-pointer">
                  Featured Customers
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-emerald-400 transition-colors text-slate-300 text-left cursor-pointer">
                  Contact Support
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2: Legal & Compliance */}
          <div className="col-span-1 lg:col-span-1 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#25D366]">Legal Disclosures</h2>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button onClick={() => onNavigate('terms')} className="hover:text-emerald-400 transition-colors text-slate-300 text-left cursor-pointer">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('privacy')} className="hover:text-emerald-400 transition-colors text-slate-300 text-left cursor-pointer">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('refund')} className="hover:text-emerald-400 transition-colors text-slate-300 text-left cursor-pointer">
                  Cancellation Policy
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Platform & Developer Tools */}
          <div className="col-span-2 lg:col-span-1 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-100">Platform & Tools</h2>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <button onClick={() => onNavigate('features')} className="hover:text-emerald-400 transition-colors text-slate-300 text-left cursor-pointer">
                  Workflows & Flow Builder
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('pricing')} className="hover:text-emerald-400 transition-colors text-slate-300 text-left cursor-pointer">
                  Pricing & AI Credit System
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('link-generator')} className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-slate-300 text-left cursor-pointer">
                  <Zap className="w-3 h-3 text-emerald-400 shrink-0" /> WhatsApp Link Maker
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('qr-generator')} className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-slate-300 text-left cursor-pointer">
                  <Zap className="w-3 h-3 text-emerald-400 shrink-0" /> QR Code Generator
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('template-builder')} className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-slate-300 text-left cursor-pointer">
                  <Terminal className="w-3 h-3 text-emerald-400 shrink-0" /> HSM Template Studio
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4 pt-2">
          <p>© {new Date().getFullYear()} PROWEXA TECHNOLOGIES PRIVATE LIMITED. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <button onClick={() => onNavigate('terms')} className="text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer">Terms</button>
            <span>•</span>
            <button onClick={() => onNavigate('privacy')} className="text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer">Privacy</button>
            <span>•</span>
            <button onClick={() => onNavigate('refund')} className="text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer">Cancellation Policy</button>
            <span>•</span>
            <button onClick={() => onNavigate('contact')} className="text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer">Contact Us</button>
          </div>
        </div>

      </div>
    </footer>
  );
}
