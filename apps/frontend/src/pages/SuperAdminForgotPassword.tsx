import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Mail } from 'lucide-react';
import { apiClient } from '../services/api.client';

export const SuperAdminForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient.post('/superadmin/forgot-password', { email });
    } finally {
      setLoading(false);
      setSubmitted(true);
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
          <h1 className="text-xl font-bold text-white tracking-tight">Reset Super Admin Password</h1>
          <p className="text-xs text-purple-300">We'll email you a link to set a new one.</p>
        </div>

        {submitted ? (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl text-center">
            If <strong>{email}</strong> is a registered Super Admin account, a reset link has been sent.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="sa-forgot-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Super Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="sa-forgot-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                  placeholder="superadmin@prowexa.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-xs transition-all shadow-lg shadow-purple-500/30 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
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
