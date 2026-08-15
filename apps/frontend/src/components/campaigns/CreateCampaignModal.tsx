import React, { useState } from 'react';
import { X, Megaphone, Send, UploadCloud, Users, FileSpreadsheet, CheckCircle2, Clock, Layers, Plus, Minus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api.client';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [dispatchTiming, setDispatchTiming] = useState<'NOW' | 'SCHEDULED'>('NOW');
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [audienceSource, setAudienceSource] = useState<'CRM' | 'CSV'>('CRM');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [csvContacts, setCsvContacts] = useState<CsvParsedContact[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [isBatchEnabled, setIsBatchEnabled] = useState<boolean>(true);
  const [batchSize, setBatchSize] = useState<number>(50);
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState<number>(20);
  const [variableMapping, setVariableMapping] = useState<Record<string, string>>({});
  const [mediaCompressStats, setMediaCompressStats] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit for Meta Media Upload.');
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
      alert(`Meta Media Upload Error: ${err.response?.data?.error?.message || err.message}`);
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
        const headers = rawHeaders.map((h) => h.toLowerCase());
        setCsvHeaders(rawHeaders);

        const phoneIdx = headers.findIndex((h) =>
          ['phone', 'phonenumber', 'mobile', 'number', 'contact'].some((k) => h.includes(k))
        );

        if (phoneIdx === -1) {
          throw new Error('CSV must contain a header named "phone", "phoneNumber", or "mobile".');
        }

        const nameIdx = headers.findIndex((h) => ['name', 'firstname', 'first_name'].some((k) => h.includes(k)));
        const emailIdx = headers.findIndex((h) => ['email'].some((k) => h.includes(k)));

        const parsedList: CsvParsedContact[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/["']/g, ''));
          const phone = cols[phoneIdx];
          if (!phone) continue;

          const rawName = nameIdx !== -1 ? cols[nameIdx] : undefined;

          // Parse all columns into customAttributes for dynamic variable mapping
          const customAttrs: Record<string, string> = {};
          rawHeaders.forEach((headerName, idx) => {
            if (cols[idx] !== undefined) {
              customAttrs[headerName] = cols[idx];
            }
          });

          parsedList.push({
            phoneNumber: phone,
            firstName: cleanAndFormatFirstName(rawName),
            email: emailIdx !== -1 ? cols[emailIdx] : undefined,
            customAttributes: customAttrs,
          });
        }

        if (parsedList.length === 0) {
          throw new Error('No valid phone number rows found in CSV.');
        }

        setCsvContacts(parsedList);
        setError('');
      } catch (err: any) {
        setError(err.message || 'Failed to parse CSV file.');
        setCsvContacts([]);
        setCsvHeaders([]);
      }
    };

    reader.readAsText(file);
  };

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
        isBatchEnabled,
        batchSize,
        batchIntervalMinutes,
        variableMapping,
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
      setCsvContacts([]);
      setCsvHeaders([]);
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
            Launch Bulk WhatsApp Campaign
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
                onChange={(e) => setTemplateId(e.target.value)}
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
