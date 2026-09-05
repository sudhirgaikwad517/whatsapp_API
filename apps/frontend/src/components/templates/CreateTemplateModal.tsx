import React, { useState } from 'react';
import { X, FileCode2, Plus, Trash2, CheckCircle2, Phone, ExternalLink, MessageSquare, Send, HelpCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '../../services/api.client';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ButtonItem {
  type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL';
  text: string;
  phoneNumber?: string;
  url?: string;
}

export const CreateTemplateModal: React.FC<CreateTemplateModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('MARKETING');
  const [language, setLanguage] = useState('en_US');
  const [headerType, setHeaderType] = useState<'NONE' | 'TEXT' | 'IMAGE'>('NONE');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('Hello {{1}}, welcome to {{2}}! Your order {{3}} is confirmed.');
  const [footerText, setFooterText] = useState('Reply STOP to unsubscribe');
  const [buttons, setButtons] = useState<ButtonItem[]>([]);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({
    '1': 'Rahul',
    '2': 'Prowexa',
    '3': '#9824',
  });
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  // Extract variables like {{1}}, {{2}} from bodyText
  const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
  const extractedVars = Array.from(new Set(matches.map((v) => v.replace(/[\{\}]/g, '')))).sort((a, b) => Number(a) - Number(b));

  const createMutation = useMutation({
    mutationFn: async () => {
      const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const sampleBodyValues = extractedVars.map((vNum) => sampleValues[vNum]?.trim() || `Sample_${vNum}`);

      const res = await apiClient.post('/whatsapp/templates/create', {
        name: cleanName,
        category,
        language,
        headerType,
        headerText: headerType === 'TEXT' ? headerText : undefined,
        bodyText,
        sampleBodyValues,
        footerText: footerText.trim() ? footerText : undefined,
        buttons,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates-list'] });
      toast.success('Template submitted to Meta for review!');
      setName('');
      setHeaderType('NONE');
      setHeaderText('');
      setBodyText('Hello {{1}}, thank you for choosing our business!');
      setFooterText('');
      setButtons([]);
      setError('');
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to submit template to Meta.');
    },
  });

  const addVariableToBody = () => {
    const nextNum = extractedVars.length > 0 ? Math.max(...extractedVars.map(Number)) + 1 : 1;
    setBodyText((prev) => prev + ` {{${nextNum}}}`);
    setSampleValues((prev) => ({ ...prev, [nextNum]: `Sample_${nextNum}` }));
  };

  const addButton = (type: 'QUICK_REPLY' | 'PHONE_NUMBER' | 'URL') => {
    if (buttons.length >= 3) {
      toast.error('Meta allows maximum 3 buttons per template.');
      return;
    }
    if (type === 'QUICK_REPLY') {
      setButtons([...buttons, { type: 'QUICK_REPLY', text: 'Interested' }]);
    } else if (type === 'PHONE_NUMBER') {
      setButtons([...buttons, { type: 'PHONE_NUMBER', text: 'Call Us', phoneNumber: '+919876543210' }]);
    } else if (type === 'URL') {
      setButtons([...buttons, { type: 'URL', text: 'Visit Website', url: 'https://wabtic.com' }]);
    }
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  // Live render for phone card preview replacing variables with sample values
  let previewBodyText = bodyText;
  extractedVars.forEach((vNum) => {
    const val = sampleValues[vNum] || `[${vNum}]`;
    previewBodyText = previewBodyText.split(`{{${vNum}}}`).join(val);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl p-6 shadow-2xl overflow-y-auto overflow-x-hidden max-h-[92vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center">
              <FileCode2 className="w-5 h-5 mr-2 text-emerald-400" />
              Create & Submit Meta Approved Template
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Define category, variables sample values, header, footer & interactive buttons for Meta approval</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Template Config Controls */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="lg:col-span-7 space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Template Name (Snake_case)
              </label>
              <input
                type="text"
                required
                placeholder="promo_discount_2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Only lowercase letters, numbers, and underscores allowed.</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="MARKETING">MARKETING</option>
                  <option value="UTILITY">UTILITY</option>
                  <option value="AUTHENTICATION">AUTHENTICATION</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="en_US">English (US)</option>
                  <option value="hi">Hindi (hi)</option>
                  <option value="es">Spanish (es)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Header Type (Optional)
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {(['NONE', 'TEXT', 'IMAGE'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setHeaderType(type)}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      headerType === type
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {headerType === 'TEXT' && (
                <input
                  type="text"
                  placeholder="Header Title e.g. Special Diwali Offer!"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              )}

              {headerType === 'IMAGE' && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mt-2 flex items-start">
                  <span className="text-emerald-400 mr-2 text-lg leading-none">💡</span>
                  <p className="text-[10px] text-emerald-300 leading-relaxed">
                    <strong>No need to upload the image here!</strong> You will securely upload the actual high-quality image file to Meta's CDN when you launch a campaign using this template. This guarantees 100% delivery without URL download errors (131053).
                  </p>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Message Body Text
                </label>

                <button
                  type="button"
                  onClick={addVariableToBody}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                >
                  + Add Variable {'{{'}{extractedVars.length + 1}{'}}'}
                </button>
              </div>
              <textarea
                required
                rows={4}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Use {{1}}, {{2}} for dynamic variables..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
              />
            </div>

            {/* Meta Variable Sample Values Required for Review */}
            {extractedVars.length > 0 && (
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 flex items-center">
                    <HelpCircle className="w-3.5 h-3.5 mr-1" />
                    Meta Review Sample Values (Required by Meta)
                  </span>
                  <span className="text-[10px] text-slate-500">Provide example values for review</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {extractedVars.map((vNum) => (
                    <div key={vNum} className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-emerald-400 w-10 shrink-0">
                        {`{{${vNum}}}`}
                      </span>
                      <input
                        type="text"
                        required
                        placeholder={`e.g. Sample value for {{${vNum}}}`}
                        value={sampleValues[vNum] || ''}
                        onChange={(e) => setSampleValues({ ...sampleValues, [vNum]: e.target.value })}
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-600 focus:border-emerald-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Text */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Footer Text (Optional)
              </label>
              <input
                type="text"
                maxLength={60}
                placeholder="e.g. Reply STOP to unsubscribe"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Action Buttons */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Interactive Action Buttons (Max 3)
                </label>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => addButton('QUICK_REPLY')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-emerald-400 font-semibold rounded-lg border border-slate-700"
                  >
                    + Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => addButton('PHONE_NUMBER')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-sky-400 font-semibold rounded-lg border border-slate-700"
                  >
                    + Call
                  </button>
                  <button
                    type="button"
                    onClick={() => addButton('URL')}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-purple-400 font-semibold rounded-lg border border-slate-700"
                  >
                    + URL
                  </button>
                </div>
              </div>

              {buttons.length === 0 ? (
                <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-center text-[11px] text-slate-500">
                  No action buttons added. Click + Reply, + Call, or + URL above to add buttons.
                </div>
              ) : (
                <div className="space-y-2">
                  {buttons.map((btn, idx) => (
                    <div key={idx} className="bg-slate-950 p-2.5 border border-slate-800 rounded-xl flex items-center space-x-2 text-xs">
                      <span className="font-mono text-[10px] text-emerald-400 font-bold uppercase">{btn.type}</span>
                      <input
                        type="text"
                        placeholder="Button Label"
                        value={btn.text}
                        onChange={(e) => {
                          const updated = [...buttons];
                          updated[idx].text = e.target.value;
                          setButtons(updated);
                        }}
                        className="flex-1 min-w-0 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                      />
                      {btn.type === 'PHONE_NUMBER' && (
                        <input
                          type="text"
                          placeholder="+91..."
                          value={btn.phoneNumber || ''}
                          onChange={(e) => {
                            const updated = [...buttons];
                            updated[idx].phoneNumber = e.target.value;
                            setButtons(updated);
                          }}
                          className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                        />
                      )}
                      {btn.type === 'URL' && (
                        <input
                          type="url"
                          placeholder="https://..."
                          value={btn.url || ''}
                          onChange={(e) => {
                            const updated = [...buttons];
                            updated[idx].url = e.target.value;
                            setButtons(updated);
                          }}
                          className="w-32 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-white"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => removeButton(idx)}
                        className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{createMutation.isPending ? 'Submitting to Meta API...' : 'Submit Template to Meta'}</span>
              </button>
            </div>
          </form>

          {/* Right Column: Live WhatsApp Card Phone Preview */}
          <div className="lg:col-span-5 flex flex-col justify-start">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Live WhatsApp Phone Card Preview
            </label>

            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 shadow-2xl relative space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">WhatsApp Cloud API</span>
              </div>

              {/* Chat Bubble Card */}
              <div className="bg-slate-900 border border-slate-800/80 rounded-2xl rounded-tl-none p-3.5 space-y-2 text-xs shadow-md">
                {headerType === 'IMAGE' && (
                  <div className="bg-slate-800 h-28 rounded-xl flex items-center justify-center text-slate-500 text-xs font-semibold border border-slate-700">
                    📷 Header Image Preview
                  </div>
                )}

                {headerType === 'TEXT' && headerText && (
                  <div className="font-bold text-white text-sm border-b border-slate-800/80 pb-1">
                    {headerText}
                  </div>
                )}

                <div className="text-slate-200 whitespace-pre-line leading-relaxed font-sans text-xs">
                  {previewBodyText || 'Your template message body will render here.'}
                </div>

                {footerText && (
                  <div className="text-[10px] text-slate-400 italic">
                    {footerText}
                  </div>
                )}

                <div className="text-[9px] text-slate-500 text-right">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {buttons.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    {buttons.map((btn, idx) => (
                      <div
                        key={idx}
                        className="w-full py-1.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-emerald-400 font-semibold text-center rounded-xl text-xs border border-slate-700 flex items-center justify-center space-x-1.5"
                      >
                        {btn.type === 'PHONE_NUMBER' && <Phone className="w-3 h-3 text-sky-400" />}
                        {btn.type === 'URL' && <ExternalLink className="w-3 h-3 text-purple-400" />}
                        {btn.type === 'QUICK_REPLY' && <MessageSquare className="w-3 h-3 text-emerald-400" />}
                        <span>{btn.text || 'Button'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
