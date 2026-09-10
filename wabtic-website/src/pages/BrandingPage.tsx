import React from 'react';
import { Palette, Download, Copy, CheckCircle2, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';

export function BrandingPage() {
  const [copiedColor, setCopiedColor] = React.useState<string | null>(null);

  const colors = [
    { name: 'WhatsApp Emerald Green', hex: '#25D366', usage: 'Primary Brand Color, Buttons, Highlights' },
    { name: 'Prowexa Deep Forest', hex: '#006D2F', usage: 'Secondary Brand Color, Badges, Headers' },
    { name: 'Dark Slate Background', hex: '#0F172A', usage: 'Dark Theme Canvas, Cards, Footer' },
    { name: 'Pure White Accent', hex: '#FFFFFF', usage: 'Light Mode Canvas, High-contrast Text' },
  ];

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedColor(hex);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  return (
    <div className="pt-12 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
          <Palette className="w-3.5 h-3.5" /> Media & Brand Kit
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Brand Assets & <span className="text-[#25D366]">Design System</span>
        </h1>
        <p className="text-base text-slate-600 dark:text-slate-300">
          Official logos, color palettes, and typography guidelines for <a href="https://www.prowexa.com" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-[#25D366]">Prowexa Technologies Private Limited</a> and Wabtic platform.
        </p>
      </div>

      {/* Brand Identity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Dark Logo */}
        <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 shadow-xl space-y-6">
          <div className="text-xs font-bold uppercase text-slate-400">Primary Logo (Dark Background)</div>
          <div className="flex items-center gap-3 py-6 justify-center bg-slate-900 rounded-2xl border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-slate-950 flex items-center justify-center font-black shadow-lg shadow-[#25D366]/20">
              <MessageSquare className="w-6 h-6 fill-current" />
            </div>
            <span className="font-extrabold text-3xl text-white tracking-tight">Wabtic</span>
          </div>
          <p className="text-xs text-slate-400">Use on dark containers (`#0F172A`, `#020617`). Minimum width: 120px.</p>
        </div>

        {/* Light Logo */}
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6">
          <div className="text-xs font-bold uppercase text-slate-500">Primary Logo (Light Background)</div>
          <div className="flex items-center gap-3 py-6 justify-center bg-slate-50 rounded-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-[#006d2f] text-white flex items-center justify-center font-black shadow-md">
              <MessageSquare className="w-6 h-6 fill-current" />
            </div>
            <span className="font-extrabold text-3xl text-[#006d2f] tracking-tight">Wabtic</span>
          </div>
          <p className="text-xs text-slate-500">Use on white/light containers (`#FFFFFF`, `#F8FAFC`).</p>
        </div>
      </div>

      {/* Color Palette */}
      <div className="space-y-6">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Official Color Palette</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {colors.map((c, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
              <div
                className="h-24 rounded-xl border border-slate-200/20 shadow-inner flex items-end justify-end p-3"
                style={{ backgroundColor: c.hex }}
              >
                <button
                  onClick={() => handleCopy(c.hex)}
                  className="px-2.5 py-1 rounded-lg bg-black/40 backdrop-blur-md text-white text-[10px] font-mono flex items-center gap-1 hover:bg-black/60 transition-colors cursor-pointer"
                >
                  {copiedColor === c.hex ? <CheckCircle2 className="w-3 h-3 text-[#25D366]" /> : <Copy className="w-3 h-3" />}
                  {c.hex}
                </button>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">{c.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{c.usage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Media Guidelines Box */}
      <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-white space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2 text-[#25D366]">
          <ShieldCheck className="w-5 h-5" /> Meta Partner Brand Usage Rules
        </h3>
        <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
          <li>Do not alter, distort, or stretch the logo proportions.</li>
          <li>Always maintain minimum clear space around the icon equal to 50% of icon height.</li>
          <li>When referencing WhatsApp, always clarify integration via official Meta Graph API endpoints.</li>
        </ul>
      </div>
    </div>
  );
}
