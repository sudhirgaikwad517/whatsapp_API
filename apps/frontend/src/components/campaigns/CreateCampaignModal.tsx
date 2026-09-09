import React, { useState, useEffect, useMemo } from 'react';
import { X, Megaphone, Send, UploadCloud, Users, FileSpreadsheet, CheckCircle2, Clock, Layers, Plus, Minus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '../../services/api.client';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Present => prefill from this existing campaign's template/settings, for
  // sending the same broadcast to a different audience. The audience itself
  // (CRM tags / CSV upload) and variableMapping are deliberately left blank
  // rather than copied — a new CSV's columns won't line up with a mapping
  // built for the old one, and silently carrying it over risks every
  // recipient's personalization falling back to "Valued Customer" with no
  // warning.
  copyFrom?: any;
}

interface CsvParsedContact {
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  customAttributes?: Record<string, string>;
}

function cleanAndFormatFirstName(rawName?: string): string | undefined {
  if (!rawName || !rawName.trim()) return undefined;
  const cleanStr = rawName.trim().replace(/^["']+|["']+$|["']/g, '');
  if (!cleanStr) return undefined;
  return cleanStr
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose, copyFrom }) => {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [dispatchTiming, setDispatchTiming] = useState<'NOW' | 'SCHEDULED'>('NOW');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [audienceSource, setAudienceSource] = useState<'CRM' | 'CSV'>('CRM');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [phoneColIdx, setPhoneColIdx] = useState<number>(-1);
  const [nameColIdx, setNameColIdx] = useState<number>(-1);
  const [emailColIdx, setEmailColIdx] = useState<number>(-1);
  const [saveContactsToCrm, setSaveContactsToCrm] = useState<boolean>(true);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [isBatchEnabled, setIsBatchEnabled] = useState<boolean>(true);
  const [batchSize, setBatchSize] = useState<number>(50);
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState<number>(20);
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});
  const [campaignKnowledgeBase, setCampaignKnowledgeBase] = useState('');

  useEffect(() => {
    if (!isOpen || !copyFrom) return;
    setName(`${copyFrom.name} (Copy)`);
    setTemplateId(copyFrom.templateId || copyFrom.template?.id || '');
    setHeaderMediaUrl(copyFrom.headerMediaUrl || '');
    setIsBatchEnabled(Boolean(copyFrom.isBatchEnabled));
    setBatchSize(copyFrom.batchSize || 50);
    setBatchIntervalMinutes(copyFrom.batchIntervalMinutes || 20);
    setCampaignKnowledgeBase(copyFrom.campaignKnowledgeBase || '');
  }, [isOpen, copyFrom]);

  // A mapping picked while on one audience source (e.g. a CSV column key)
  // is meaningless for the other (CRM contacts have no CSV columns) — left
  // in place, the backend's resolveVal falls through to "Valued Customer"
  // for every recipient with no error or warning anywhere in the flow.
  useEffect(() => {
    setVariableMapping({});
  }, [audienceSource]);
  const [mediaCompressStats, setMediaCompressStats] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit for Meta Media Upload.');
      return;
    }

    setIsUploadingMedia(true);
    setMediaCompressStats(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/whatsapp/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { mediaId } = res.data.data;
      setHeaderMediaUrl(mediaId);
      setMediaCompressStats(`⚡ Uploaded securely to Meta. Media ID: ${mediaId}`);
    } catch (err: any) {
      toast.error('Meta media upload failed', { description: err.response?.data?.error?.message || err.message });
    } finally {
      setIsUploadingMedia(false);
    }
  };

  // Fetch approved Meta templates
  const { data: templates } = useQuery({
    queryKey: ['templates-list'],
    queryFn: async () => {
      const res = await apiClient.get('/whatsapp/templates');
      return res.data.data;
    },
    enabled: isOpen,
  });

  // Fetch CRM tags for Option A filtering
  const { data: tags } = useQuery({
    queryKey: ['contact-tags'],
    queryFn: async () => {
      const res = await apiClient.get('/contacts/tags');
      return res.data.data;
    },
    enabled: isOpen,
  });

  // Extract variables like {{1}}, {{2}} from selected template body
  const selectedTemplate = templates?.find((t: any) => t.id === templateId);
  const bodyComp = (selectedTemplate?.components as any[])?.find((c) => c.type === 'BODY' || c.type === 'body');
  const bodyText = bodyComp?.text || '';
  const rawVars: string[] = Array.from(
    new Set((bodyText.match(/\{\{(\d+)\}\}/g) || []).map((v: string) => v.replace(/[\{\}]/g, '')))
  );
  const templateVars: string[] = rawVars.sort((a: string, b: string) => Number(a) - Number(b));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
        if (lines.length === 0) throw new Error('Uploaded CSV file is empty.');

        const rawHeaders = lines[0].split(',').map((h) => h.trim().replace(/["']/g, ''));
        const headersLower = rawHeaders.map((h) => h.toLowerCase());
        const rows = lines.slice(1).map((line) => line.split(',').map((c) => c.trim().replace(/["']/g, '')));

        if (rows.length === 0) {
          throw new Error('No data rows found below the header row.');
        }

        // Best-guess defaults — the agent confirms/overrides via the column
        // pickers below rather than this being final. Multiple similarly-
        // named columns (e.g. "Business Name" and "Contact Name") used to
        // silently pick whichever came first, which is how a wrong name got
        // saved to CRM during a real campaign.
        const guessedPhoneIdx = headersLower.findIndex((h) =>
          ['phone', 'phonenumber', 'mobile', 'number', 'contact'].some((k) => h.includes(k))
        );
        const guessedNameIdx = headersLower.findIndex((h) => ['name', 'firstname', 'first_name'].some((k) => h.includes(k)));
        const guessedEmailIdx = headersLower.findIndex((h) => h.includes('email'));

        setCsvHeaders(rawHeaders);
        setCsvRawRows(rows);
        setPhoneColIdx(guessedPhoneIdx);
        setNameColIdx(guessedNameIdx);
        setEmailColIdx(guessedEmailIdx);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file.');
        setCsvHeaders([]);
        setCsvRawRows([]);
        setPhoneColIdx(-1);
        setNameColIdx(-1);
        setEmailColIdx(-1);
      }
    };

    reader.readAsText(file);
  };

  // Recomputed live from the raw rows whenever the agent changes a column
  // mapping — nothing is finalized at parse time anymore.
  const csvContacts: CsvParsedContact[] = useMemo(() => {
    if (phoneColIdx === -1 || csvRawRows.length === 0) return [];
    return csvRawRows.reduce<CsvParsedContact[]>((acc, cols) => {
      const phone = cols[phoneColIdx];
      if (!phone) return acc;
      const rawName = nameColIdx !== -1 ? cols[nameColIdx] : undefined;
      const customAttrs: Record<string, string> = {};
      csvHeaders.forEach((headerName, idx) => {
        if (cols[idx] !== undefined) customAttrs[headerName] = cols[idx];
      });
      acc.push({
        phoneNumber: phone,
        firstName: cleanAndFormatFirstName(rawName),
        email: emailColIdx !== -1 ? cols[emailColIdx] : undefined,
        customAttributes: customAttrs,
      });
      return acc;
    }, []);
  }, [csvRawRows, csvHeaders, phoneColIdx, nameColIdx, emailColIdx]);

  const launchMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/campaigns', {
        name,
        templateId,
        headerMediaUrl,
        scheduledAt: dispatchTiming === 'SCHEDULED' && scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        audienceSource,
        tagIds: audienceSource === 'CRM' ? selectedTagIds : undefined,
        csvContacts: audienceSource === 'CSV' ? csvContacts : undefined,
        saveContactsToCrm: audienceSource === 'CSV' ? saveContactsToCrm : undefined,
        isBatchEnabled,
        batchSize,
        batchIntervalMinutes,
        variableMapping,
        campaignKnowledgeBase: campaignKnowledgeBase.trim() || undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setName('');
      setTemplateId('');
      setHeaderMediaUrl('');
      setDispatchTiming('NOW');
      setScheduledAt('');
      setAudienceSource('CRM');
      setSelectedTagIds([]);
      setCsvHeaders([]);
      setCsvRawRows([]);
      setPhoneColIdx(-1);
      setNameColIdx(-1);
      setEmailColIdx(-1);
      setSaveContactsToCrm(true);
      setCsvFileName('');
      setIsBatchEnabled(true);
      setBatchSize(50);
      setBatchIntervalMinutes(20);
      setVariableMapping({});
      setError('');
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to launch marketing campaign.');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Megaphone className="w-5 h-5 mr-2 text-emerald-400" />
            {copyFrom ? `Copy "${copyFrom.name}" — Pick New Audience` : 'Launch Bulk WhatsApp Campaign'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            launchMutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Campaign Broadcast Name
            </label>
            <input
              type="text"
              required
              placeholder="Summer Discount Broadcast 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Select Approved WhatsApp Template
            </label>
            {templates && templates.length > 0 ? (
              <select
                required
                value={templateId}
                onChange={(e) => {
                  const selectedId = e.target.value;
                  setTemplateId(selectedId);
                  const template = templates?.find((t: any) => t.id === selectedId);
                  if (template?.defaultMediaId) {
                    setHeaderMediaUrl(template.defaultMediaId);
                  } else {
                    setHeaderMediaUrl(''); // Reset if no default media
                  }
                }}
                className="w-full min-w-0 max-w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 truncate"
              >
                <option value="">-- Choose Approved Template --</option>
                {templates.map((tpl: any) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} ({tpl.language}) — [{tpl.status}]
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                required
                placeholder="Template name e.g. hello_world"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 text-xs"
              />
            )}
          </div>

          {/* ── Dynamic Template Variable Column Mapper ────────────────── */}
          {templateVars.length > 0 && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center">
                  <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                  Dynamic Variable Column Mapper (&#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;)
                </span>
                <span className="text-[10px] text-slate-500">{templateVars.length} variable(s) detected</span>
              </div>

              <p className="text-[11px] text-slate-400">
                Map template placeholders to CSV column headers or CRM attributes for personalized messaging.
              </p>

              <div className="space-y-2 pt-1">
                {templateVars.map((vNum: string) => (
                  <div key={vNum} className="flex items-center space-x-2 sm:space-x-3 bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-xs w-full min-w-0 overflow-hidden">
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 shrink-0">
                      {`{{${vNum}}}`}
                    </span>
                    <span className="text-slate-400 font-semibold shrink-0">➔</span>
                    <select
                      value={variableMapping[vNum] || ''}
                      onChange={(e) => setVariableMapping({ ...variableMapping, [vNum]: e.target.value })}
                      className="flex-1 min-w-0 w-full max-w-full bg-slate-950 border border-slate-800 rounded-lg px-2 sm:px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 truncate"
                    >
                      <option value="">-- Select Field / Column --</option>
                      <optgroup label="Standard CRM Fields">
                        <option value="firstName">First Name / Name</option>
                        <option value="lastName">Last Name</option>
                        <option value="phoneNumber">Phone Number</option>
                        <option value="email">Email Address</option>
                      </optgroup>

                      {audienceSource === 'CSV' && csvHeaders.length > 0 && (
                        <optgroup label="Uploaded CSV Columns">
                          {csvHeaders.map((header) => (
                            <option key={header} value={header}>
                              CSV Column: "{header}"
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Campaign Knowledge Base for AI (Optional)
            </label>
            <textarea
              value={campaignKnowledgeBase}
              onChange={(e) => setCampaignKnowledgeBase(e.target.value)}
              rows={3}
              placeholder="e.g. This campaign is a 20% off Diwali sale on all electronics, valid till Oct 31. Coupon code: DIWALI20..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              When a customer replies to this campaign, the AI auto-responder uses this (along with your organization's
              general knowledge base) to answer questions about this specific offer.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Header Image / Media (Optional)
              </label>
              <label className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center">
                <span>⚡ Upload & Compress (WebP)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
              </label>
            </div>
            <input
              type="text"
              placeholder="https://your-domain.com/banner.jpg or click Upload above"
              value={headerMediaUrl}
              onChange={(e) => setHeaderMediaUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            {isUploadingMedia && (
              <p className="text-[10px] text-purple-400 mt-1 animate-pulse">Compressing image with Sharp.js (WebP Optimizer)...</p>
            )}
            {mediaCompressStats && (
              <p className="text-[10px] text-emerald-400 mt-1 font-mono">{mediaCompressStats}</p>
            )}
          </div>

          {/* ── Dispatch Timing Options (Now vs Schedule for Later) ───────── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Dispatch Schedule Timing
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => setDispatchTiming('NOW')}
                className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                  dispatchTiming === 'NOW'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Send Immediately</span>
              </button>

              <button
                type="button"
                onClick={() => setDispatchTiming('SCHEDULED')}
                className={`p-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition-all ${
                  dispatchTiming === 'SCHEDULED'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Schedule for Later</span>
              </button>
            </div>

            {dispatchTiming === 'SCHEDULED' && (
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1.5 animate-fadeIn">
                <label className="block text-xs font-semibold text-slate-300">
                  Select Future Date & Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            )}
          </div>

          {/* ── Smart Batch Drip Dispatch Settings ────────────────────────── */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Smart Batch Drip Dispatch (स्मार्ट बैच शेड्यूलिंग)
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBatchEnabled}
                  onChange={(e) => setIsBatchEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Splits total campaign audience into staggered batches to prevent Meta spam blocks & improve delivery rate.
            </p>

            {isBatchEnabled && (
              <div className="pt-3 border-t border-slate-800/60 space-y-3.5 animate-fadeIn">
                {/* Batch Size Picker */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Batch Volume (Contacts / Batch)</span>
                    <span className="text-[10px] text-slate-500">Minimum: 50 Contacts</span>
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setBatchSize((prev) => Math.max(50, prev - 10))}
                      disabled={batchSize <= 50}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-12 text-center text-xs font-mono font-bold text-emerald-400">
                      {batchSize}
                    </span>
                    <button
                      type="button"
                      onClick={() => setBatchSize((prev) => prev + 10)}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Buffer Interval Picker */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">Buffer Time Interval (Delay Mins)</span>
                    <span className="text-[10px] text-slate-500">Delay between each batch trigger</span>
                  </div>

                  <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setBatchIntervalMinutes((prev) => Math.max(5, prev - 5))}
                      disabled={batchIntervalMinutes <= 5}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-14 text-center text-xs font-mono font-bold text-emerald-400">
                      {batchIntervalMinutes} m
                    </span>
                    <button
                      type="button"
                      onClick={() => setBatchIntervalMinutes((prev) => prev + 5)}
                      className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Live Preview Summary */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-[11px] text-emerald-300 space-y-1">
                  <div className="font-semibold flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 shrink-0 text-emerald-400" />
                    <span>Smart Batch Live Schedule Preview</span>
                  </div>
                  <div className="text-slate-300">
                    Messages will be dispatched in <span className="font-bold text-emerald-400">{batchSize} contact batches</span> with a <span className="font-bold text-emerald-400">{batchIntervalMinutes} min delay</span> buffer between each batch.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Audience Selection Source ─────────────────────────────────── */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Select Audience Source
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAudienceSource('CRM')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  audienceSource === 'CRM'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 font-semibold text-sm text-white mb-1">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>CRM Database</span>
                </div>
                <p className="text-[11px] text-slate-400">Select contacts from existing CRM tags or all opted-in.</p>
              </button>

              <button
                type="button"
                onClick={() => setAudienceSource('CSV')}
                className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  audienceSource === 'CSV'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2 font-semibold text-sm text-white mb-1">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Upload Campaign CSV</span>
                </div>
                <p className="text-[11px] text-slate-400">Target contacts from a custom CSV file.</p>
              </button>
            </div>
          </div>

          {audienceSource === 'CRM' ? (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Filter CRM Audience by Tag (Optional)
              </label>
              <p className="text-[11px] text-slate-500 mb-2">Leave unselected to target all opted-in CRM contacts.</p>
              <div className="flex flex-wrap gap-2">
                {tags?.map((t: any) => {
                  const isSelected = selectedTagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTagIds(
                          isSelected ? selectedTagIds.filter((id) => id !== t.id) : [...selectedTagIds, t.id]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Upload Campaign Specific CSV File
              </label>

              <label className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-900/50">
                <UploadCloud className="w-6 h-6 text-emerald-400 mb-1" />
                <span className="text-xs text-slate-300 font-medium">Click to upload CSV</span>
                <span className="text-[11px] text-slate-500 mt-1">Headers: phone, name, email</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>

              {csvFileName && (
                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl text-xs text-emerald-400">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-semibold truncate max-w-[200px]">{csvFileName}</span>
                  </div>
                  <span className="font-bold">{csvContacts.length} Contacts Parsed</span>
                </div>
              )}

              {csvHeaders.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-semibold text-slate-300">
                    Map CSV Columns {csvHeaders.length > 3 && <span className="text-slate-500 font-normal">— your sheet has {csvHeaders.length} columns, confirm which one is which</span>}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label htmlFor="csv-col-phone" className="block text-[10px] text-slate-500 mb-1">
                        Phone Number Column *
                      </label>
                      <select
                        id="csv-col-phone"
                        value={phoneColIdx}
                        onChange={(e) => setPhoneColIdx(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value={-1}>— Select column —</option>
                        {csvHeaders.map((h, idx) => (
                          <option key={idx} value={idx}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="csv-col-name" className="block text-[10px] text-slate-500 mb-1">
                        Name Column
                      </label>
                      <select
                        id="csv-col-name"
                        value={nameColIdx}
                        onChange={(e) => setNameColIdx(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value={-1}>— None —</option>
                        {csvHeaders.map((h, idx) => (
                          <option key={idx} value={idx}>{h}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="csv-col-email" className="block text-[10px] text-slate-500 mb-1">
                        Email Column
                      </label>
                      <select
                        id="csv-col-email"
                        value={emailColIdx}
                        onChange={(e) => setEmailColIdx(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value={-1}>— None —</option>
                        {csvHeaders.map((h, idx) => (
                          <option key={idx} value={idx}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {phoneColIdx === -1 ? (
                    <p className="text-[11px] text-rose-400">Select which column has the phone number to continue.</p>
                  ) : nameColIdx === -1 ? (
                    <p className="text-[11px] text-amber-400">No name column selected — recipients will be saved/addressed as "Customer".</p>
                  ) : null}

                  <label className="flex items-start space-x-2 pt-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveContactsToCrm}
                      onChange={(e) => setSaveContactsToCrm(e.target.checked)}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <span className="text-[11px] text-slate-400">
                      Save these contacts to Contacts CRM.{' '}
                      <span className="text-slate-500">
                        Uncheck for a one-off send (e.g. a purchased/rented list) — recipients still receive the
                        message and delivery is still tracked, but new contacts from this file won't show up in
                        your saved Contacts list. Existing CRM contacts are never removed.
                      </span>
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                launchMutation.isPending ||
                !name ||
                !templateId ||
                (audienceSource === 'CSV' && csvContacts.length === 0)
              }
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center"
            >
              <Send className="w-4 h-4 mr-1.5" />
              {launchMutation.isPending ? 'Enqueuing Broadcast...' : 'Launch Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
