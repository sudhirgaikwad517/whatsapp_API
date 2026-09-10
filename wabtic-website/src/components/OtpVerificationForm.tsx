import React, { useState, useEffect } from 'react';
import { apiClient } from '../lib/api.client';

interface OtpVerificationFormProps {
  email: string;
  onVerified: (data: { accessToken: string; refreshToken: string; user: any }) => void;
}

/**
 * Shared 6-digit OTP entry step — used right after registration
 * (RegisterPage.tsx) and when a login attempt hits EMAIL_NOT_VERIFIED
 * (LoginPage.tsx), since both are "finish verifying this email" moments
 * backed by the same verify-signup-otp / resend-signup-otp endpoints (the
 * shared backend both this site and app.wabtic.com call). Same component
 * as apps/frontend/src/components/ui/OtpVerificationForm.tsx — duplicated
 * here because this is a separate repo/deploy, not shared code.
 */
export const OtpVerificationForm: React.FC<OtpVerificationFormProps> = ({ email, onVerified }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState('');

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-signup-otp', { email, otp });
      onVerified(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid or expired code — please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendStatus('Sending...');
    try {
      await apiClient.post('/auth/resend-signup-otp', { email });
      setResendStatus('A new code has been sent.');
      setResendCooldown(60);
    } catch {
      setResendStatus('Could not resend right now — please try again shortly.');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400 text-center">
        We sent a 6-digit code to <span className="text-white font-semibold">{email}</span>. Enter it below to verify your account.
      </p>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl text-center">{error}</div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
          required
          autoFocus
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
          placeholder="000000"
        />
        <button
          type="submit"
          disabled={isLoading || otp.length !== 6}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? 'Verifying...' : 'Verify & Continue'}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400">
        Didn't get the code?{' '}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendCooldown > 0}
          className="text-emerald-400 hover:underline font-semibold disabled:opacity-50 disabled:no-underline bg-transparent border-none cursor-pointer"
        >
          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
        </button>
        {resendStatus && <p className="text-[11px] text-slate-500 mt-1">{resendStatus}</p>}
      </div>
    </div>
  );
};
