import React, { useState } from 'react';
import { X, Megaphone, Send, UploadCloud, Users, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
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
}

export const CreateCampaignModal: React.FC<CreateCampaignModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [headerMediaUrl, setHeaderMediaUrl] = useState('');
  const [audienceSource, setAudienceSource] = useState<'CRM' | 'CSV'>('CRM');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [csvContacts, setCsvContacts] = useState<CsvParsedContact[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

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

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
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

          parsedList.push({
            phoneNumber: phone,
            firstName: nameIdx !== -1 ? cols[nameIdx] : undefined,
            email: emailIdx !== -1 ? cols[emailIdx] : undefined,
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
        audienceSource,
        tagIds: audienceSource === 'CRM' ? selectedTagIds : undefined,
        csvContacts: audienceSource === 'CSV' ? csvContacts : undefined,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setName('');
      setTemplateId('');
      setHeaderMediaUrl('');
      setAudienceSource('CRM');
      setSelectedTagIds([]);
      setCsvContacts([]);
      setCsvFileName('');
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
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

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Header Image / Media URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://your-domain.com/banner.jpg"
              value={headerMediaUrl}
              onChange={(e) => setHeaderMediaUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
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
