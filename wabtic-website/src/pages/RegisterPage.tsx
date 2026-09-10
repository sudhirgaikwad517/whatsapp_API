import React, { useState } from 'react';
import { MessageSquare, Lock, Mail, Phone, User, Building } from 'lucide-react';
import { apiClient } from '../lib/api.client';
import { useAuthStore } from '../store/auth.store';
import { NavTab } from '../types';
import { TurnstileWidget, TURNSTILE_SITE_KEY } from '../components/TurnstileWidget';
import { OtpVerificationForm } from '../components/OtpVerificationForm';

interface RegisterPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  // Registration succeeded -> now verifying the emailed OTP before the
  // account is actually usable (registerUser no longer logs the user in).
  const [awaitingOtp, setAwaitingOtp] = useState(false);

  const setAuth = useAuthStore((state) => state.setAuth);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  };
  const isPasswordValid = passwordChecks.length && passwordChecks.uppercase && passwordChecks.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password must be at least 8 characters and include an uppercase letter and a number.');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/register', {
        fullName,
        email,
        phoneNumber,
        password,
        organizationName,
        turnstileToken,
      });
      setAwaitingOtp(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = (data: { user: any }) => {
    setAuth(data.user);

    const redirectTab = sessionStorage.getItem('redirect_after_login');
    if (redirectTab) {
      sessionStorage.removeItem('redirect_after_login');
      onNavigate(redirectTab as any);
      return;
    }

    // This only sends the user to the dashboard's own login page — this
    // site's session cookie is deliberately separate from the dashboard's
    // (see auth-cookies.ts on the backend).
    const isProduction = typeof window !== 'undefined' && (window.location.hostname.includes('wabtic.com') || window.location.protocol === 'https:');
    const adminUrl = (import.meta as any).env?.VITE_ADMIN_URL || (isProduction ? 'https://app.wabtic.com' : 'http://localhost:5173');
    window.location.href = adminUrl;
  };

  return (
    <div className="py-20 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <MessageSquare className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Create your account</h2>
          <p className="text-sm text-slate-400">Get started with Wabtic today</p>
        </div>

        {awaitingOtp ? (
          <OtpVerificationForm email={email} onVerified={handleOtpVerified} />
        ) : (
        <>
        {error && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Company Name
            </label>
            <div className="relative">
              <Building className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

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
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Mobile Number
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
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
            {password.length > 0 && (
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

          <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} />

          <button
            type="submit"
            disabled={loading || (password.length > 0 && !isPasswordValid) || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-400">
          Already have an account?{' '}
          <button onClick={() => onNavigate('login')} className="text-emerald-400 hover:underline font-semibold bg-transparent border-none cursor-pointer">
            Sign In
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
};
