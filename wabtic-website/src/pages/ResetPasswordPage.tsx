import React, { useState } from 'react';
import { MessageSquare, Lock } from 'lucide-react';
import { apiClient } from '../lib/api.client';
import { NavTab } from '@/types';

interface ResetPasswordPageProps {
  token: string;
  onNavigate: (tab: NavTab) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ token, onNavigate }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordChecks = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };
  const isPasswordValid = passwordChecks.length && passwordChecks.uppercase && passwordChecks.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password must be at least 8 characters and include an uppercase letter and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword });
      setDone(true);
      setTimeout(() => onNavigate('login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'That reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <MessageSquare className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Set a new password</h2>
        </div>

        {!token && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl text-center">
            This link is missing its reset token. Please use the link from your email.
          </div>
        )}

        {done ? (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl text-center">
            Password reset — redirecting you to sign in...
          </div>
        ) : (
          token && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl text-center">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                {newPassword.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[11px]">
                    <li className={passwordChecks.length ? 'text-emerald-400' : 'text-slate-500'}>
                      {passwordChecks.length ? '✓' : '•'} At least 8 characters
                    </li>
                    <li className={passwordChecks.uppercase ? 'text-emerald-400' : 'text-slate-500'}>
                      {passwordChecks.uppercase ? '✓' : '•'} One uppercase letter
                    </li>
                    <li className={passwordChecks.number ? 'text-emerald-400' : 'text-slate-500'}>
                      {passwordChecks.number ? '✓' : '•'} One number
                    </li>
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 cursor-pointer"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )
        )}

        <div className="text-center pt-2 text-xs text-slate-400">
          <button onClick={() => onNavigate('login')} className="text-emerald-400 hover:underline font-semibold bg-transparent border-none cursor-pointer">
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};
