import React, { useState } from 'react';
import { MessageSquare, Lock, Mail } from 'lucide-react';
import { apiClient } from '../lib/api.client';
import { useAuthStore } from '../store/auth.store';
import { NavTab } from '../types';
import { TurnstileWidget, TURNSTILE_SITE_KEY } from '../components/TurnstileWidget';
import { OtpVerificationForm } from '../components/OtpVerificationForm';

interface LoginPageProps {
  onNavigate: (tab: NavTab) => void;
  verified?: string | null;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, verified }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');

  const setAuth = useAuthStore((state) => state.setAuth);

  const goToDashboardAfterAuth = (user: any) => {
    setAuth(user);

    const redirectTab = sessionStorage.getItem('redirect_after_login');
    if (redirectTab) {
      sessionStorage.removeItem('redirect_after_login');
      onNavigate(redirectTab as any);
      return;
    }

    // This only sends the user to the dashboard's own login page — this
    // site's session cookie is deliberately separate from the dashboard's
    // (see auth-cookies.ts on the backend), so logging in here never
    // silently authenticates app.wabtic.com too.
    const isProduction = typeof window !== 'undefined' && (window.location.hostname.includes('wabtic.com') || window.location.protocol === 'https:');
    const adminUrl = (import.meta as any).env?.VITE_ADMIN_URL || (isProduction ? 'https://app.wabtic.com' : 'http://localhost:5173');
    window.location.href = adminUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNeedsVerification(false);
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', { email, password, turnstileToken });
      goToDashboardAfterAuth(res.data.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to authenticate. Please check credentials.');
      setNeedsVerification(err.response?.data?.error?.code === 'EMAIL_NOT_VERIFIED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-20 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6 relative">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-wider shadow-lg">
          Wabtic Account
        </div>
        <div className="text-center space-y-2 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <MessageSquare className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Sign in to Wabtic</h2>
          <p className="text-sm text-slate-400">Welcome back — manage your plan & billing here</p>
        </div>

        {needsVerification ? (
          <OtpVerificationForm email={email} onVerified={(data) => goToDashboardAfterAuth(data.user)} />
        ) : (
        <>
        {verified === '1' && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl text-center">
            Email verified! You can now sign in.
          </div>
        )}
        {verified === '0' && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-xl text-center">
            That verification link is invalid or has expired.
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-xs text-emerald-400 hover:underline font-semibold bg-transparent border-none cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />

          <button
            type="submit"
            disabled={loading || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-400">
          Don't have an account?{' '}
          <button onClick={() => onNavigate('register')} className="text-emerald-400 hover:underline font-semibold bg-transparent border-none cursor-pointer">
            Sign Up for Free
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
};
