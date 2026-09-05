import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, X, MessageSquare, ShieldAlert, AlertTriangle, LifeBuoy, Send, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../services/api.client';
import { toast } from 'sonner';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlanPopupDismissed, setIsPlanPopupDismissed] = useState(false);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [supportConcern, setSupportConcern] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const { isImpersonating, stopImpersonation, user } = useAuthStore();

  const { data: creditsData } = useQuery({
    queryKey: ['billing-credits-layout'],
    queryFn: async () => {
      const res = await apiClient.get('/billing/credits');
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Wait for the query to actually settle before deciding to show anything —
  // otherwise every user sees a flash of "plan expired" on first load, since
  // creditsData is undefined (and !undefined?.x is true) until it resolves.
  const isPlanExpired =
    creditsData !== undefined && (!creditsData?.planExpiryDate || new Date(creditsData.planExpiryDate) < new Date());
  const location = useLocation();
  const isRestrictedPage =
    isPlanExpired && user?.role !== 'SUPER_ADMIN' && !['/billing', '/plans', '/profile', '/settings'].includes(location.pathname);
  const showPlanPopup = isPlanExpired && user?.role !== 'SUPER_ADMIN' && !isPlanPopupDismissed;

  const raiseSupportTicketMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/support-tickets', {
        subject: 'Subscription / Plan Assistance Request',
        priority: 'MEDIUM',
        description: supportConcern.trim(),
      });
      return res.data.data;
    },
    onSuccess: () => {
      setTicketSubmitted(true);
      setSupportConcern('');
      toast.success('Support ticket raised — our team will contact you within 24 hours.');
    },
    onError: (err: any) => {
      toast.error('Failed to raise support ticket', { description: err.response?.data?.error?.message || err.message });
    },
  });

  const closePlanPopup = () => {
    setIsPlanPopupDismissed(true);
    setIsContactFormOpen(false);
    setTicketSubmitted(false);
  };

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

      {/* No Active Plan Popup */}
      {showPlanPopup && (
        <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closePlanPopup}
              aria-label="Close"
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {!isContactFormOpen ? (
              <div className="p-6 sm:p-7 space-y-5 text-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-7 h-7 text-rose-400" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">No Active Plan</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Your subscription has expired or you do not have an active plan. Please upgrade to continue using all services.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                  <Link
                    to="/plans"
                    onClick={closePlanPopup}
                    className="flex-1 bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    Manage Plans ➔
                  </Link>
                  <button
                    onClick={() => setIsContactFormOpen(true)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer border border-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <LifeBuoy className="w-4 h-4" />
                    Contact Support Team
                  </button>
                </div>
              </div>
            ) : ticketSubmitted ? (
              <div className="p-6 sm:p-7 space-y-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-bold text-white">Ticket Raised Successfully</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Our support executive will contact you within 24 hours. You've also been sent an email confirmation.
                  </p>
                </div>
                <button
                  onClick={closePlanPopup}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer border border-slate-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="p-6 sm:p-7 space-y-4">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="w-5 h-5 text-emerald-400 shrink-0" />
                  <h3 className="text-base font-bold text-white">Contact Support Team</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Name</label>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 truncate">
                      {user?.fullName || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Mobile Number</label>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 truncate">
                      {user?.phoneNumber || 'Not set in Profile'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Your Concern
                  </label>
                  <textarea
                    value={supportConcern}
                    onChange={(e) => setSupportConcern(e.target.value)}
                    rows={4}
                    placeholder="Describe what you need help with..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={() => setIsContactFormOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-white cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => raiseSupportTicketMutation.mutate()}
                    disabled={raiseSupportTicketMutation.isPending || !supportConcern.trim()}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    {raiseSupportTicketMutation.isPending ? 'Submitting...' : 'Submit Ticket'}
                  </button>
                </div>
              </div>
            )}
          </div>
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
