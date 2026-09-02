import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, Lock } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'That reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
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
                <label htmlFor="reset-new-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    id="reset-new-password"
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">At least 8 characters, with an uppercase letter and a number.</p>
              </div>

              <div>
                <label htmlFor="reset-confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    id="reset-confirm-password"
                    type="password"
                    required
                    minLength={8}
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
          <Link to="/login" className="text-emerald-400 hover:underline font-semibold">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
