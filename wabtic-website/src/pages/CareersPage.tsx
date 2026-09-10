import React, { useState } from 'react';
import { Briefcase, MapPin, Clock, ArrowRight, CheckCircle2, Sparkles, Building } from 'lucide-react';

export function CareersPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const jobs = [
    {
      id: 'backend-eng',
      title: 'Senior Backend Engineer (Node.js & Go)',
      department: 'Engineering',
      location: 'Pune, MH / Remote (India)',
      type: 'Full-Time',
      experience: '4-6 Years',
      description: 'Build high-throughput WebSockets, Meta Graph API webhooks, and distributed queue systems handling millions of WhatsApp messages daily.',
    },
    {
      id: 'fullstack-dev',
      title: 'Full Stack Engineer (React, Vite & Tailwind)',
      department: 'Engineering',
      location: 'Pune, MH / Remote',
      type: 'Full-Time',
      experience: '2-4 Years',
      description: 'Develop rich interactive UI components, Visual Flow Builders (React Flow), and real-time multi-agent shared inbox dashboards.',
    },
    {
      id: 'ai-prompt-eng',
      title: 'AI Systems Architect (Gemini & Vertex AI)',
      department: 'AI & Data Science',
      location: 'Remote',
      type: 'Full-Time',
      experience: '3+ Years',
      description: 'Integrate Google Gemini LLMs for contextual customer support bots, automated catalog recommendation systems, and RAG knowledge bases.',
    },
    {
      id: 'compliance-lead',
      title: 'Fintech & Gateway Compliance Specialist',
      department: 'Legal & Risk',
      location: 'Pune, MH',
      type: 'Full-Time',
      experience: '3-5 Years',
      description: 'Oversee Razorpay/Stripe merchant onboarding, RBI data storage compliance, and PCI DSS security audit operations.',
    },
  ];

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      setSelectedRole(null);
    }, 3000);
  };

  return (
    <div className="pt-12 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
          <Sparkles className="w-3.5 h-3.5" /> Join Our Team
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Build the Future of <span className="text-[#25D366]">Conversational SaaS</span>
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          At <a href="https://www.prowexa.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-[#25D366]">Prowexa Technologies</a>, we are building global WhatsApp Business automation infrastructure. Work on cutting-edge AI, real-time streaming, and enterprise fintech integrations.
        </p>
      </div>

      {/* Perks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold">
            <Building className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Hybrid & Remote Culture</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Work from our Pune HQ or remotely across India with flexible hours and top-tier equipment.</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Cutting-Edge Tech Stack</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Deploy applications using Gemini AI, Socket.io, React Flow, Node.js, and Vercel Edge compute.</p>
        </div>

        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Competitive Equity & Benefits</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Above-market salaries, health insurance for family, learning stipends, and performance bonuses.</p>
        </div>
      </div>

      {/* Open Positions */}
      <div className="space-y-6">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Open Roles ({jobs.length})</h2>

        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md hover:border-[#25D366]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#25D366]/10 text-[#25D366] text-xs font-bold">{job.department}</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {job.type}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{job.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{job.description}</p>
              </div>

              <button
                onClick={() => setSelectedRole(job.title)}
                className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs shadow-md shrink-0 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                Apply Position <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Application Modal */}
      {selectedRole && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Apply for: {selectedRole}</h3>

            {applied ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 text-emerald-400 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto" />
                <div className="font-bold text-base">Application Received!</div>
                <p className="text-xs text-slate-400">Our HR team will reach out via email shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                  <input required type="text" placeholder="John Doe" className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                  <input required type="email" placeholder="john@example.com" className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1">LinkedIn / Portfolio URL</label>
                  <input required type="url" placeholder="https://linkedin.com/in/..." className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setSelectedRole(null)} className="w-1/2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">Cancel</button>
                  <button type="submit" className="w-1/2 py-2.5 rounded-xl bg-[#25D366] text-slate-950 text-xs font-bold">Submit Application</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
