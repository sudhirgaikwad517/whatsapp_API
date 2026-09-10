import React, { useEffect, useState } from 'react';
import { X, Tag, LifeBuoy, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api.client';
import { NavTab } from '@/types';

interface VisitorLeadPopupProps {
  onNavigate: (tab: NavTab) => void;
}

const DISMISSED_KEY = 'wabtic_lead_popup_dismissed';

export function VisitorLeadPopup({ onNavigate }: VisitorLeadPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;
    const timer = setTimeout(() => setIsOpen(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    setIsOpen(false);
    sessionStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleBuyPlan = () => {
    close();
    onNavigate('pricing');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phoneNumber.trim()) return;
    setIsSubmitting(true);
    try {
      await apiClient.post('/leads', {
        name: name.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        whatsappConsent,
        message: message.trim(),
        source: 'popup',
      });
      setSubmitted(true);
    } catch (err: any) {
      toast.error('Failed to submit', { description: err.response?.data?.error?.message || err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {!isContactFormOpen ? (
          <div className="p-6 sm:p-7 space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Tag className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Ready to Automate Your WhatsApp?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Pick a plan that fits your team, or talk to us first if you have questions.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                onClick={handleBuyPlan}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-md"
              >
                Buy Plan
              </button>
              <button
                onClick={() => setIsContactFormOpen(true)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <LifeBuoy className="w-4 h-4" />
                Contact
              </button>
            </div>
          </div>
        ) : submitted ? (
          <div className="p-6 sm:p-7 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Thanks — We've Got It!</h3>
              <p className="text-sm text-slate-400 leading-relaxed">Our team will reach out to you shortly.</p>
            </div>
            <button
              onClick={close}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer border border-slate-700"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-emerald-400 shrink-0" />
              <h3 className="text-base font-bold text-white">Talk to Us</h3>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <span className="text-xs text-slate-300 pr-2">Allow Wabtic to send you WhatsApp notifications?</span>
              <button
                type="button"
                onClick={() => setWhatsappConsent((v) => !v)}
                className={`shrink-0 w-11 h-6 rounded-full relative transition-colors cursor-pointer ${
                  whatsappConsent ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
                aria-pressed={whatsappConsent}
                aria-label="Consent to receive WhatsApp notifications from Wabtic"
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    whatsappConsent ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Your Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Tell us what you need help with..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setIsContactFormOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !email.trim() || !phoneNumber.trim()}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
