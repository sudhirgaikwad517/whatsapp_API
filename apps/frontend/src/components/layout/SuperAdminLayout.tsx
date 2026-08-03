import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldAlert, Building2, Activity, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export const SuperAdminLayout: React.FC = () => {
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Super Admin Platform Navigation Bar */}
      <header className="h-16 bg-slate-900/90 border-b border-purple-500/20 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-base">Prowexa Enterprise</span>
            <span className="ml-2 text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded-full font-semibold">
              SUPER ADMIN ERP
            </span>
          </div>
        </div>

        <nav className="flex items-center space-x-6 text-xs font-semibold text-slate-300">
          <Link to="/superadmin" className="hover:text-purple-400 flex items-center transition-all">
            <Activity className="w-4 h-4 mr-1.5 text-purple-400" />
            Executive Dashboard
          </Link>
          <Link to="/superadmin" className="hover:text-purple-400 flex items-center transition-all">
            <Building2 className="w-4 h-4 mr-1.5 text-purple-400" />
            Tenant Organizations
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <div className="text-right text-xs">
            <span className="block font-bold text-white">Platform System Operator</span>
            <span className="block text-[10px] text-purple-400 font-mono">superadmin@prowexa.com</span>
          </div>

          <button
            onClick={() => {
              logout();
              window.location.href = '/superadmin/login';
            }}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
            title="Log Out Super Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex w-full">
        <Outlet />
      </main>
    </div>
  );
};
