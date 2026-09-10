import React, { useState } from 'react';
import { LayoutTemplate, Trash2, CheckCircle2, PhoneCall, ExternalLink, Send } from 'lucide-react';

export function TemplateBuilderComponent() {
  const [name, setName] = useState('order_update_v1');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('UTILITY');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO'>('IMAGE');
  const [headerText, setHeaderText] = useState('ORDER DISPATCH CONFIRMATION');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80');
  const [bodyText, setBodyText] = useState('Hi {{1}}, your order {{2}} has been packed and dispatched via express shipping. Estimated delivery: {{3}}.');
  const [footerText, setFooterText] = useState('Thank you for shopping with Apex Retail.');
  
  const [buttons, setButtons] = useState<Array<{ type: string; text: string; value?: string }>>([
    { type: 'URL', text: 'Track Order', value: 'https://apexretail.com/track/{{2}}' },
    { type: 'QUICK_REPLY', text: 'Contact Support' }
  ]);

  const [submitted, setSubmitted] = useState(false);

  const addButton = (type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER') => {
    if (buttons.length >= 3) return;
    const newBtn = 
      type === 'URL' ? { type: 'URL', text: 'Visit Website', value: 'https://example.com' } :
      type === 'PHONE_NUMBER' ? { type: 'PHONE_NUMBER', text: 'Call Desk', value: '+18005550199' } :
      { type: 'QUICK_REPLY', text: 'Option ' + (buttons.length + 1) };
    setButtons([...buttons, newBtn]);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const updateButtonText = (index: number, text: string) => {
    const updated = [...buttons];
    updated[index].text = text;
    setButtons(updated);
  };

  const previewBody = bodyText
    .replace('{{1}}', 'Alex')
    .replace('{{2}}', '#94021')
    .replace('{{3}}', 'Tomorrow by 5 PM');

  const handleSubmitTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/25">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Interactive WhatsApp Template Builder</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Design Meta-compliant HSM templates with live chat bubble simulator</p>
          </div>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" /> Meta API Compliant
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Editor Form */}
        <div className="lg:col-span-7 space-y-5">
          <form onSubmit={handleSubmitTemplate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Template Identifier Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-medium"
                >
                  <option value="MARKETING">MARKETING (Outreach & Offers)</option>
                  <option value="UTILITY">UTILITY (Order & Billing Alerts)</option>
                  <option value="AUTHENTICATION">AUTHENTICATION (OTP Security)</option>
                </select>
              </div>
            </div>

            {/* Header Type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Header Type (Optional)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['NONE', 'TEXT', 'IMAGE', 'VIDEO'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setHeaderType(type)}
                    className={`py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      headerType === type 
                        ? 'bg-[#25D366] text-slate-950 font-bold shadow' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {headerType === 'TEXT' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Header Title Text</label>
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-semibold"
                />
              </div>
            )}

            {headerType === 'IMAGE' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Header Image URL</label>
                <input
                  type="url"
                  value={headerMediaUrl}
                  onChange={(e) => setHeaderMediaUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs font-mono"
                />
              </div>
            )}

            {/* Body Text Editor */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Body Content (Use {"{{1}}"}, {"{{2}}"} for Variables)
              </label>
              <textarea
                rows={4}
                required
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 text-xs leading-relaxed"
              />
              <p className="text-[11px] text-slate-400 mt-1">Variables like {"{{1}}"} will be dynamically populated via standard API payload parameters.</p>
            </div>

            {/* Footer Text */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Footer Disclaimer Text</label>
              <input
                type="text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-800 text-xs"
              />
            </div>

            {/* Buttons Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Interactive Action Buttons ({buttons.length}/3)
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => addButton('QUICK_REPLY')}
                    disabled={buttons.length >= 3}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-500/20 disabled:opacity-40 cursor-pointer"
                  >
                    + Quick Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => addButton('URL')}
                    disabled={buttons.length >= 3}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-500/20 disabled:opacity-40 cursor-pointer"
                  >
                    + URL Link
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {buttons.map((btn, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                      {btn.type}
                    </span>
                    <input
                      type="text"
                      value={btn.text}
                      onChange={(e) => updateButtonText(idx, e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeButton(idx)}
                      className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-[#25D366]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Template Submitted to Meta Review!
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Template for Approval
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Phone Screen Preview */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-xs bg-slate-950 rounded-[36px] p-3 shadow-2xl border-4 border-slate-800 relative">
            <div className="w-28 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2 flex items-center justify-center">
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
            </div>

            <div className="bg-[#075e54] text-white p-3 rounded-t-2xl flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-400 flex items-center justify-center text-slate-950 font-bold text-xs">
                AP
              </div>
              <div>
                <div className="text-xs font-bold leading-tight">Apex Retail (Official)</div>
                <div className="text-[10px] text-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 fill-emerald-300 text-slate-900" /> Business Account
                </div>
              </div>
            </div>

            <div className="bg-[#0b141a] p-3 rounded-b-2xl min-h-[380px] space-y-2 flex flex-col justify-end text-xs">
              <div className="bg-[#202c33] text-slate-100 rounded-2xl rounded-tl-none p-3 shadow border border-slate-800 space-y-2 max-w-[92%]">
                {headerType === 'TEXT' && (
                  <div className="font-extrabold text-xs text-emerald-400 border-b border-slate-700 pb-1">
                    {headerText}
                  </div>
                )}

                {headerType === 'IMAGE' && (
                  <div className="rounded-xl overflow-hidden mb-1.5 bg-slate-800">
                    <img src={headerMediaUrl} alt="Header" className="w-full h-28 object-cover" />
                  </div>
                )}

                <div className="text-xs leading-relaxed whitespace-pre-wrap">
                  {previewBody}
                </div>

                {footerText && (
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                    {footerText}
                  </div>
                )}

                <div className="text-[9px] text-slate-400 text-right">
                  12:45 PM
                </div>
              </div>

              {buttons.length > 0 && (
                <div className="space-y-1.5 max-w-[92%]">
                  {buttons.map((btn, idx) => (
                    <div
                      key={idx}
                      className="bg-[#202c33] text-emerald-400 font-semibold py-2 px-3 rounded-xl text-center shadow-sm border border-slate-800 flex items-center justify-center gap-1.5 text-xs"
                    >
                      {btn.type === 'URL' && <ExternalLink className="w-3 h-3" />}
                      {btn.type === 'PHONE_NUMBER' && <PhoneCall className="w-3 h-3" />}
                      {btn.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 text-center">
            Simulated on WhatsApp iOS & Android apps
          </p>
        </div>

      </div>
    </div>
  );
}
