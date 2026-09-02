import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api.client';

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportCsvModal: React.FC<ImportCsvModalProps> = ({ isOpen, onClose }) => {
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState<{ createdCount: number; skippedCount: number; totalProcessed: number } | null>(null);
  const [error, setError] = useState('');

  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async (contacts: Array<{ phoneNumber: string; firstName?: string; lastName?: string; email?: string }>) => {
      const res = await apiClient.post('/contacts/import', { contacts });
      return res.data.data;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to import CSV contacts.');
    },
  });

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    setError('');
    setResult(null);

    if (!csvText.trim()) {
      setError('Please select or paste CSV data first.');
      return;
    }

    const lines = csvText.trim().split('\n');
    const parsedContacts = [];

    // Header row skip if present
    const startIdx = lines[0].toLowerCase().includes('phone') ? 1 : 0;

    for (let i = startIdx; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      if (parts[0]) {
        parsedContacts.push({
          phoneNumber: parts[0],
          firstName: parts[1] || undefined,
          lastName: parts[2] || undefined,
          email: parts[3] || undefined,
        });
      }
    }

    if (parsedContacts.length === 0) {
      setError('No valid contacts found in CSV payload.');
      return;
    }

    importMutation.mutate(parsedContacts);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-bold text-white flex items-center">
            <Upload className="w-5 h-5 mr-2 text-emerald-400" />
            Import CSV Audience Contacts
          </h3>
          <button onClick={onClose} aria-label="Close" className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        {result ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2 text-emerald-400 text-sm">
            <div className="flex items-center font-bold">
              <CheckCircle className="w-5 h-5 mr-2" />
              CSV Import Complete!
            </div>
            <p className="text-xs text-slate-300">
              Processed <strong>{result.totalProcessed}</strong> records: <strong>{result.createdCount}</strong> created/updated, {result.skippedCount} skipped.
            </p>
            <button
              onClick={() => {
                setResult(null);
                onClose();
              }}
              className="mt-3 w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-lg text-xs"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="csv-file-input" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Select CSV File (Format: phoneNumber, firstName, lastName, email)
              </label>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="csv-paste-textarea" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Or Paste Raw CSV Data
              </label>
              <textarea
                id="csv-paste-textarea"
                rows={5}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="+919876543210, Rahul, Sharma, rahul@example.com&#10;+14155552671, John, Doe, john@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={importMutation.isPending || !csvText.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                {importMutation.isPending ? 'Importing Batch...' : 'Import Contacts'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
