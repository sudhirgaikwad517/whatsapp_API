import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldAlert, Building2, Activity, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export const SuperAdminLayout: React.FC = () => {
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden">
      {/* Top Super Admin Platform Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 shadow-sm px-4 sm:px-8 flex items-center justify-between shrink-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 tracking-tight text-base">Prowexa Enterprise</span>
            <span className="ml-2 text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
              SUPER ADMIN ERP
            </span>
          </div>
        </div>

        <nav className="flex items-center space-x-6 text-xs font-semibold text-slate-600">
          <Link to="/superadmin" className="hover:text-indigo-600 flex items-center transition-all">
            <Activity className="w-4 h-4 mr-1.5 text-indigo-600" />
            Executive Dashboard
          </Link>
          <Link to="/superadmin" className="hover:text-indigo-600 flex items-center transition-all">
            <Building2 className="w-4 h-4 mr-1.5 text-indigo-600" />
            Tenant Organizations
          </Link>
        </nav>

        <div className="flex items-center space-x-4">
          <div className="text-right text-xs">
            <span className="block font-bold text-slate-900">Platform System Operator</span>
            <span className="block text-[10px] text-indigo-600 font-mono">superadmin@prowexa.com</span>
          </div>

          <button
            onClick={() => {
              logout();
              window.location.href = '/superadmin/login';
            }}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
            title="Log Out Super Admin"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area - Fully Scrollable */}
      <main className="flex-1 min-h-0 w-full overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};
