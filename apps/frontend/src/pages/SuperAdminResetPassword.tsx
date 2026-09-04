import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, Lock } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const SuperAdminResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const passwordChecks = {
    length: newPassword.length >= 12,
    uppercase: /[A-Z]/.test(newPassword),
    number: /[0-9]/.test(newPassword),
  };
  const isPasswordValid = passwordChecks.length && passwordChecks.uppercase && passwordChecks.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password must be at least 12 characters and include an uppercase letter and a number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/superadmin/reset-password', { token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/superadmin/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'That reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/80 border border-purple-500/30 rounded-3xl p-8 space-y-6 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 font-bold">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Set a New Password</h1>
        </div>

        {!token && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl text-center">
            This link is missing its reset token. Please use the link from your email.
          </div>
        )}

        {done ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center">
            Password reset — redirecting you to sign in...
          </div>
        ) : (
          token && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="sa-reset-new-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="sa-reset-new-password"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                {newPassword.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[11px]">
                    <li className={passwordChecks.length ? 'text-emerald-400' : 'text-slate-500'}>
                      {passwordChecks.length ? '✓' : '•'} At least 12 characters
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

              <div className="space-y-1.5">
                <label htmlFor="sa-reset-confirm-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="sa-reset-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-purple-500/30 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )
        )}

        <div className="text-center pt-2">
          <Link to="/superadmin/login" className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold">
            Back to Super Admin Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
