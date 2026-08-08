import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, X, MessageSquare, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isImpersonating, stopImpersonation, user } = useAuthStore();

  return (
    <div className="flex flex-col h-[100dvh] h-screen bg-slate-950 text-slate-100 overflow-hidden overscroll-none relative">
      {/* Impersonation Session Protection Top Bar */}
      {isImpersonating && (
        <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-200 font-semibold z-50 shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>
              IMPERSONATION MODE ACTIVE: Logged in as <strong>{user?.fullName || 'Tenant Owner'}</strong> ({user?.organizationId})
            </span>
          </div>
          <button
            onClick={() => {
              stopImpersonation();
              window.location.href = '/superadmin';
            }}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <span>Exit to SuperAdmin ERP ➔</span>
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Fixed Sidebar */}
        <div className="hidden lg:flex shrink-0">
          <Sidebar />
        </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="font-bold text-white text-base">Prowexa</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" onClick={() => setIsMobileMenuOpen(false)}>
          <Sidebar isMobile />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        {/* Mobile Header Bar */}
        <header className="lg:hidden h-14 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 sticky top-0 z-30 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700 active:scale-95 transition-all"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="font-bold text-white text-sm">Prowexa</span>
            </div>
          </div>
        </header>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-y-auto">
          <Outlet />
        </div>
      </main>
      </div>
    </div>
  );
};
