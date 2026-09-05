import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, X, MessageSquare, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api.client';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isImpersonating, stopImpersonation, user } = useAuthStore();

  const { data: creditsData } = useQuery({
    queryKey: ['billing-credits-layout'],
    queryFn: async () => {
      const res = await apiClient.get('/billing/credits');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isPlanExpired = !creditsData?.planExpiryDate || new Date(creditsData.planExpiryDate) < new Date();
  const location = useLocation();
  const isRestrictedPage =
    isPlanExpired && user?.role !== 'SUPER_ADMIN' && !['/billing', '/plans', '/profile', '/settings'].includes(location.pathname);

  // Reset scroll offset on mobile keyboard close (focusout) to prevent static whitespace gap at bottom
  useEffect(() => {
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        setTimeout(() => {
          window.scrollTo(0, 0);
          document.body.scrollTop = 0;
        }, 50);
      }
    };

    const handleViewportResize = () => {
      if (window.visualViewport && window.visualViewport.height >= window.innerHeight - 30) {
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
      }
    };

    window.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportResize);
    }

    return () => {
      window.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-100 overflow-hidden overscroll-none relative">
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
            onClick={async () => {
              await stopImpersonation();
              window.location.href = '/superadmin';
            }}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5"
          >
            <span>Exit to SuperAdmin ERP ➔</span>
          </button>
        </div>
      )}

      {/* No Active Plan Banner */}
      {isPlanExpired && user?.role !== 'SUPER_ADMIN' && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-b border-rose-500/40 px-4 py-2.5 flex items-center justify-between text-xs text-rose-200 font-semibold z-40 shrink-0 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              <strong>No Active Plan:</strong> Your subscription has expired or you do not have an active plan. Please upgrade to continue using all services.
            </span>
          </div>
          <Link
            to="/plans"
            className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold px-3 py-1 rounded-lg text-xs transition-all cursor-pointer shadow-md flex items-center gap-1.5 shrink-0 whitespace-nowrap"
          >
            <span>Upgrade Now ➔</span>
          </Link>
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
            aria-label="Close menu"
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
              aria-label="Open menu"
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

        <div
          className={`flex-1 min-w-0 min-h-0 flex flex-col h-full overflow-y-auto ${isRestrictedPage ? 'opacity-40 pointer-events-none select-none grayscale cursor-not-allowed' : ''}`}
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
        >
          <Outlet />
        </div>
      </main>
      </div>
    </div>
  );
};
