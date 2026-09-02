import React, { useState } from 'react';
import { ShieldAlert, Lock, Mail, ArrowRight } from 'lucide-react';
import { apiClient } from '../services/api.client';
import { useAuthStore } from '../store/auth.store';

export const SuperAdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await apiClient.post('/superadmin/login', { email, password });
      const { user } = res.data.data;

      setAuth(user);
      window.location.href = '/superadmin';
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Invalid Super Admin credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/80 border border-purple-500/30 rounded-3xl p-8 space-y-8 backdrop-blur-xl shadow-2xl relative z-10">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 font-bold">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Super Admin ERP Portal</h1>
          <p className="text-xs text-purple-300">
            Platform Operations, Multi-Tenant Governance & Financial Executive Dashboard
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="superadmin-email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Super Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                id="superadmin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                placeholder="superadmin@prowexa.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="superadmin-password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                id="superadmin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-lg shadow-purple-500/30 cursor-pointer"
          >
            <span>{isLoading ? 'Authenticating Super Admin...' : 'Login to ERP Control Plane'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-[11px] text-slate-500">
            Prowexa Technologies Pvt. Ltd. • Restricted Enterprise System
          </p>
        </div>
      </div>
    </div>
  );
};
