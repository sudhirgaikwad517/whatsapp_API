import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { DemoRequest } from '@/types';
import { CheckCircle2, Sparkles, Send, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api.client';

export function DemoPage() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    industry: 'E-commerce',
    messageVolume: '10k-50k',
    requirements: '',
  });

  const [loading, setLoading] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<DemoRequest | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/leads', {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phone,
        company: formData.company,
        industry: formData.industry,
        messageVolume: formData.messageVolume,
        message: formData.requirements,
        source: 'demo_page',
      });

      const savedLead = {
        id: res.data.data.id,
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        industry: formData.industry,
        messageVolume: formData.messageVolume,
        requirements: formData.requirements,
        status: 'New' as const,
        createdAt: res.data.data.createdAt,
      };

      setSubmittedLead(savedLead as DemoRequest);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to submit demo request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-12 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <Sparkles className="w-4 h-4" /> Schedule Personal Demo
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Book a Live <span className="text-[#25D366]">WhatsApp API Demo</span>
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          Connect with our WhatsApp solution architects to evaluate custom message volumes, sandbox API access, and enterprise onboarding.
        </p>
      </div>

      {submittedLead ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-12 border border-emerald-500/50 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Demo Request Confirmed!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-md mx-auto">
              Thank you, <strong className="text-emerald-500">{submittedLead.name}</strong>. Our enterprise specialist will reach out to <span className="text-slate-900 dark:text-white font-semibold">{submittedLead.email}</span> within 2 business hours.
            </p>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
            <div className="font-bold text-slate-400 uppercase tracking-wider mb-2">Request Details Saved:</div>
            <div className="flex justify-between">
              <span className="text-slate-500">Company:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{submittedLead.company}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Industry:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{submittedLead.industry}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Monthly Volume:</span>
              <span className="font-semibold text-emerald-500">{submittedLead.messageVolume}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reference Lead ID:</span>
              <span className="font-mono text-slate-400">{submittedLead.id}</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setSubmittedLead(null);
                setFormData({
                  name: '',
                  company: '',
                  email: '',
                  phone: '',
                  industry: 'E-commerce',
                  messageVolume: '10k-50k',
                  requirements: '',
                });
              }}
              className="px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white font-semibold text-sm rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Submit Another Inquiry
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="e.g. Apex Global Inc."
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sarah@apexglobal.com"
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  WhatsApp Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 019-2831"
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Industry / Business Type *
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="E-commerce">E-commerce & Retail</option>
                  <option value="Healthcare">Healthcare & Medical</option>
                  <option value="Education">Education & EdTech</option>
                  <option value="Real Estate">Real Estate Agencies</option>
                  <option value="Finance">Finance & Banking</option>
                  <option value="Logistics">Logistics & Supply Chain</option>
                  <option value="Travel">Travel & Hospitality</option>
                  <option value="Other">Other Enterprise Services</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Monthly Message Volume *
                </label>
                <select
                  value={formData.messageVolume}
                  onChange={(e) => setFormData({ ...formData, messageVolume: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Under 10k">Under 10,000 / month</option>
                  <option value="10k-50k">10,000 - 50,000 / month</option>
                  <option value="50k-250k">50,000 - 250,000 / month</option>
                  <option value="250k+">250,000+ / month (Enterprise)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Key Requirements & Integration Objectives
              </label>
              <textarea
                rows={4}
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Tell us about your use case (e.g. abandoned cart recovery on Shopify, bulk marketing broadcasts, CRM webhook sync)..."
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-base rounded-2xl shadow-xl shadow-[#25D366]/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Submitting Demo Request...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Demo Request
                </>
              )}
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
