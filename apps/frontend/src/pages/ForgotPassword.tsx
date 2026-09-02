import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Mail } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } finally {
      // Always show the same confirmation, whether or not the email exists,
      // to avoid revealing which addresses are registered.
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <MessageSquare className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Reset your password</h2>
          <p className="text-sm text-slate-400">We'll email you a link to set a new one.</p>
        </div>

        {submitted ? (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl text-center">
            If <strong>{email}</strong> is registered, a reset link has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-3 text-slate-500" />
                <input
                  id="forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
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
