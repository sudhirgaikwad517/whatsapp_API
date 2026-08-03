import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, UserPlus, Upload, Tag, Trash2, CheckCircle2, XCircle, History } from 'lucide-react';
import { apiClient } from '../services/api.client';
import { AddContactModal } from '../components/contacts/AddContactModal';
import { ImportCsvModal } from '../components/contacts/ImportCsvModal';
import { ContactTimelineModal } from '../components/contacts/ContactTimelineModal';

export const Contacts: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch tags
  const { data: tagsData } = useQuery({
    queryKey: ['contact-tags'],
    queryFn: async () => {
      const res = await apiClient.get('/contacts/tags');
      return res.data.data;
    },
  });

  // Fetch contacts
  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search, selectedTag],
    queryFn: async () => {
      const params: any = {};
      if (search) params.search = search;
      if (selectedTag) params.tagId = selectedTag;
      const res = await apiClient.get('/contacts', { params });
      return res.data.data;
    },
  });

  // Toggle opt-in status mutation
  const toggleOptMutation = useMutation({
    mutationFn: async ({ contactId, isOptedIn }: { contactId: string; isOptedIn: boolean }) => {
      const res = await apiClient.patch(`/contacts/${contactId}/opt-status`, { isOptedIn });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const res = await apiClient.delete(`/contacts/${contactId}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Contacts CRM</h1>
          <p className="text-sm text-slate-400 mt-1">Manage Opted-in WhatsApp Audience, Custom Attributes & Activity Timelines</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsImportOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2.5 rounded-xl border border-slate-700 flex items-center text-sm transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center shadow-lg shadow-emerald-500/20 text-sm transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4 mr-2 stroke-[3]" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone number or email..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>

        {/* Tag Filter */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Tag className="w-4 h-4 text-slate-400" />
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Tags</option>
            {tagsData?.map((tag: any) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading contacts database...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Phone Number</th>
                <th className="py-4 px-6">Email</th>
                <th className="py-4 px-6">Tags</th>
                <th className="py-4 px-6">Opt-in Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
              {data?.contacts?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                data?.contacts?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="py-4 px-6 font-semibold text-white">
                      {c.firstName ? `${c.firstName} ${c.lastName || ''}` : '—'}
                    </td>
                    <td className="py-4 px-6 text-emerald-400 font-mono text-xs">{c.phoneNumber}</td>
                    <td className="py-4 px-6 text-slate-400">{c.email || '—'}</td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {c.tags?.length ? (
                          c.tags.map((t: any) => (
                            <span
                              key={t.tag.id}
                              className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700"
                            >
                              {t.tag.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() =>
                          toggleOptMutation.mutate({
                            contactId: c.id,
                            isOptedIn: !c.isOptedIn,
                          })
                        }
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                          c.isOptedIn
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                        }`}
                      >
                        {c.isOptedIn ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Opted In
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Opted Out
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setSelectedTimelineId(c.id)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold flex items-center transition-all"
                        title="View Contact Timeline"
                      >
                        <History className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
                        Timeline
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete contact ${c.phoneNumber}?`)) {
                            deleteContactMutation.mutate(c.id);
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg transition-all"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AddContactModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <ImportCsvModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
      <ContactTimelineModal
        isOpen={Boolean(selectedTimelineId)}
        contactId={selectedTimelineId}
        onClose={() => setSelectedTimelineId(null)}
      />
    </div>
  );
};
