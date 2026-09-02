import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Users2, UserPlus, Shield, Trash2, Mail, CheckCircle2, UserCheck } from 'lucide-react';
import { apiClient } from '../services/api.client';
import { confirmAction } from '../components/ui/ConfirmDialog';

// Generates a random initial password per invite — a fixed default here would
// be a standing, publicly-known password for every newly-invited team member
// across every tenant, unless the admin remembers to change it every time.
function generateRandomPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '').slice(0, 12) + '!A1';
}

export const Team: React.FC = () => {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(generateRandomPassword);
  const [role, setRole] = useState<'MANAGER' | 'AGENT'>('AGENT');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; pass: string; name: string; role: string } | null>(null);

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
        password: password.trim(),
      });
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      setCreatedCredentials({
        name: fullName.trim(),
        email: email.trim(),
        pass: password.trim(),
        role,
      });
      setIsInviteOpen(false);
      setFullName('');
      setEmail('');
      setPassword(generateRandomPassword());
    },
    onError: (err: any) => {
      toast.error('Failed to create member', { description: err?.response?.data?.error?.message || err.message });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiClient.delete(`/organization/members/${userId}`);
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('Team member removed successfully.');
    },
    onError: (err: any) => {
      toast.error('Removal failed', { description: err?.response?.data?.error?.message || err.message });
    },
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center">
            <Users2 className="w-6 h-6 sm:w-7 sm:h-7 mr-3 text-emerald-400 shrink-0" />
            <span>Support Team & Agent Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Invite Agents, Assign Roles, & Manage Multi-User Live Inbox Permissions
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="w-full sm:w-auto justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl flex items-center shadow-lg shadow-emerald-500/20 text-sm transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4 mr-2 stroke-[3]" />
          Invite Team Member
        </button>
      </div>

      {/* Team Members List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
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
                        onClick={async () => {
                          const ok = await confirmAction({
                            title: `Remove ${m.user?.fullName}?`,
                            message: 'They will immediately lose access to this organization.',
                            danger: true,
                            confirmLabel: 'Remove',
                          });
                          if (ok) removeMutation.mutate(m.user?.id);
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
                aria-label="Close"
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="team-invite-fullname" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  id="team-invite-fullname"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="team-invite-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <input
                  id="team-invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh@prowexa.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="team-invite-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Initial Login Password
                </label>
                <input
                  id="team-invite-password"
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Auto-generated — feel free to change it"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  The agent will use this password to log in at /login.
                </span>
              </div>

              <div>
                <label htmlFor="team-invite-role" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assign System Role
                </label>
                <select
                  id="team-invite-role"
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
                {inviteMutation.isPending ? 'Creating Account...' : 'Create Team Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Created Agent Credentials Dialog ────────────────────────── */}
      {createdCredentials && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center">
                <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-400" />
                Team Account Credentials Created
              </h3>
              <button
                onClick={() => setCreatedCredentials(null)}
                aria-label="Close"
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Account created for <strong className="text-white">{createdCredentials.name}</strong> ({createdCredentials.role}). Share these credentials with your team member:
            </p>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs text-slate-300">
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">Login Page URL</span>
                <span className="text-emerald-400 select-all font-semibold">{window.location.origin}/login</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">Email Address</span>
                <span className="text-white select-all font-semibold">{createdCredentials.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[10px]">Password</span>
                <span className="text-sky-400 select-all font-bold">{createdCredentials.pass}</span>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`Prowexa Login Credentials:\nURL: ${window.location.origin}/login\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}`);
                toast.success('Login details copied to clipboard.');
              }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer border border-slate-700"
            >
              Copy Credentials to Clipboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
