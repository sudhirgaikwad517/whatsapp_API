import React, { useState } from 'react';
import { Link2, Copy, Check, ExternalLink } from 'lucide-react';

export function WhatsAppLinkGeneratorComponent() {
  const [phone, setPhone] = useState('14155552671');
  const [message, setMessage] = useState('Hello! I would like to inquire about your WhatsApp API services.');
  const [copied, setCopied] = useState(false);

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const encodedText = encodeURIComponent(message);
  const generatedUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedText}` : '';

  const handleCopy = () => {
    if (!generatedUrl) return;
    navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/25">
          <Link2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">WhatsApp Click-to-Chat Link Generator</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Generate instant direct chat links with optional pre-filled greeting text</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Phone Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Phone Number (With International Country Code)
          </label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 14155552671 or 919876543210"
            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono"
          />
          <p className="text-[11px] text-slate-400 mt-1">Do not include plus signs, spaces, or dashes in the final output.</p>
        </div>

        {/* Pre-filled Message Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Pre-Filled Customer Message (Optional)
          </label>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Hi! I'm interested in booking a demo for my company."
            className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm leading-relaxed"
          />
        </div>

        {/* Generated Link Box */}
        <div className="pt-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Generated WhatsApp wa.me Link
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              readOnly
              value={generatedUrl}
              className="w-full bg-slate-100 dark:bg-slate-950 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-800 text-sm font-mono select-all focus:outline-none"
            />
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="px-4 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              {generatedUrl && (
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 bg-slate-900 dark:bg-slate-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Test Chat
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
