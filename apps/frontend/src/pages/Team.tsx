import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users2, UserPlus, Shield, Trash2, Mail, CheckCircle2, UserCheck } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const Team: React.FC = () => {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'AGENT'>('AGENT');

  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await apiClient.get('/organization/members');
      return res.data.data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/organization/members/invite', {
        fullName: fullName.trim(),
        email: email.trim(),
        role,
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      alert(`🎉 Success! Team member "${fullName}" invited successfully.`);
      setIsInviteOpen(false);
      setFullName('');
      setEmail('');
    },
    onError: (err: any) => {
      alert(`❌ Invite Failed: ${err?.response?.data?.error?.message || err.message}`);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.delete(`/organization/members/${userId}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      alert('✅ Team member removed successfully.');
    },
    onError: (err: any) => {
      alert(`❌ Removal Failed: ${err?.response?.data?.error?.message || err.message}`);
    },
  });

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center">
            <Users2 className="w-7 h-7 mr-3 text-emerald-400" />
            Support Team & Agent Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Invite Agents, Assign Roles, & Manage Multi-User Live Inbox Permissions
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-emerald-500/20 text-sm transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4 mr-2 stroke-[3]" />
          Invite Team Member
        </button>
      </div>

      {/* Team Members List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400 font-semibold">
              <th className="py-4 px-6">User Name</th>
              <th className="py-4 px-6">Email Address</th>
              <th className="py-4 px-6">Role & Permissions</th>
              <th className="py-4 px-6">Status</th>
              <th className="py-4 px-6">Joined Date</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">Loading team roster...</td>
              </tr>
            ) : members?.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500">
                  No additional team members invited yet. Click "Invite Team Member" above.
                </td>
              </tr>
            ) : (
              members?.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition-all">
                  <td className="py-4 px-6 font-bold text-white flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-emerald-400">
                      {m.user?.fullName?.charAt(0) || 'U'}
                    </div>
                    <span>{m.user?.fullName}</span>
                  </td>
                  <td className="py-4 px-6 text-slate-300">{m.user?.email}</td>
                  <td className="py-4 px-6">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                        m.role === 'BUSINESS_OWNER'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          : m.role === 'MANAGER'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      <Shield className="w-3 h-3 mr-1" />
                      {m.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center text-xs font-semibold text-emerald-400">
                      <UserCheck className="w-3.5 h-3.5 mr-1" />
                      Active
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-400 text-xs">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {m.role !== 'BUSINESS_OWNER' && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to remove ${m.user?.fullName}?`)) {
                            removeMutation.mutate(m.user?.id);
                          }
                        }}
                        title="Remove Member"
                        className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-emerald-400" />
                Invite Support Team Member
              </h3>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@prowexa.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assign System Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="AGENT">AGENT (Live Inbox Chat Support)</option>
                  <option value="MANAGER">MANAGER (Campaigns, Templates & Inbox)</option>
                </select>
              </div>

              <button
                onClick={() => inviteMutation.mutate()}
                disabled={inviteMutation.isPending || !fullName || !email}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                {inviteMutation.isPending ? 'Sending Invite...' : 'Send Team Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
