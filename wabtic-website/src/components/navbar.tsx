import React, { useState } from 'react';
import { 
  MessageSquare, 
  Wrench, 
  Menu, 
  X, 
  QrCode, 
  Link2, 
  LayoutTemplate,
  ChevronDown,
  Play,
  Building,
  Users,
  Shield,
  FileText,
  Palette,
  Briefcase,
  HelpCircle,
  LayoutDashboard,
  LogOut
} from 'lucide-react';
import { NavTab } from '@/types';
import { useAuthStore } from '../store/auth.store';

interface NavbarProps {
  currentTab: NavTab;
  onNavigate: (tab: NavTab) => void;
}

export function Navbar({ currentTab, onNavigate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  const { isAuthenticated, logout } = useAuthStore();

  // Always a plain link straight to the dashboard's own login page — this
  // site's session is deliberately separate from the dashboard's (see
  // auth-cookies.ts on the backend), so this never depends on whether the
  // visitor is logged in here.
  const isProductionHost = typeof window !== 'undefined' && (window.location.hostname.includes('wabtic.com') || window.location.protocol === 'https:');
  const adminLoginUrl = `${(import.meta as any).env?.VITE_ADMIN_URL || (isProductionHost ? 'https://app.wabtic.com' : 'http://localhost:5173')}/login`;

  const navLinks: { id: NavTab; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'features', label: 'Workflows' },
    { id: 'solutions', label: 'Analytics' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'docs', label: 'Settings' },
  ];

  const companyLinks: { id: NavTab; label: string; icon: any }[] = [
    { id: 'about', label: 'About Us', icon: Building },
    { id: 'careers', label: 'Careers', icon: Briefcase },
    { id: 'terms', label: 'Terms', icon: FileText },
    { id: 'privacy', label: 'Privacy', icon: Shield },
  ];

  const customerLinks: { id: NavTab; label: string }[] = [
    { id: 'customers', label: 'Habuild' },
    { id: 'customers', label: 'Vedantu' },
    { id: 'customers', label: 'ENI Networks' },
  ];

  const toolsLinks: { id: NavTab; label: string; icon: any; desc: string }[] = [
    { id: 'link-generator', label: 'WhatsApp Link', icon: Link2, desc: 'Create wa.me click-to-chat links' },
    { id: 'qr-generator', label: 'QR Generator', icon: QrCode, desc: 'Generate WhatsApp QR codes' },
    { id: 'template-builder', label: 'Template Builder', icon: LayoutTemplate, desc: 'Interactive HSM bubble builder' },
  ];

  const handleNavClick = (tab: NavTab) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
    setToolsDropdownOpen(false);
    setCompanyDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 py-3 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Brand Logo */}
          <button 
            onClick={() => handleNavClick('home')} 
            className="flex items-center gap-2.5 group text-left cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-[#006d2f] dark:bg-[#25D366] flex items-center justify-center text-white dark:text-slate-950 font-bold shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <MessageSquare className="w-5 h-5 fill-current" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#006d2f] dark:text-[#25D366]">
              Wabtic
            </span>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = currentTab === link.id;
              return (
                <button
                  key={link.id}
                  onClick={() => handleNavClick(link.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'text-[#006d2f] dark:text-[#25D366] bg-[#006d2f]/10 dark:bg-[#25D366]/10'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#006d2f] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}

            {/* Company Dropdown (Desktop) */}
            <div 
              className="relative"
              onMouseEnter={() => setCompanyDropdownOpen(true)}
              onMouseLeave={() => setCompanyDropdownOpen(false)}
            >
              <button 
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  ['about', 'careers', 'branding', 'terms', 'privacy', 'refund', 'customers'].includes(currentTab)
                    ? 'text-[#006d2f] dark:text-[#25D366] bg-[#006d2f]/10 dark:bg-[#25D366]/10'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#006d2f] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Company
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${companyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {companyDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[260px] p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#25D366] uppercase">Company</div>

                  {companyLinks.map((item) => (
                    <button
                      key={item.id + item.label}
                      onClick={() => handleNavClick(item.id)}
                      className={`flex items-center gap-2.5 w-full p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors rounded-xl text-left font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-[#25D366] ${
                        currentTab === item.id ? 'bg-[#25D366]/10 text-[#25D366]' : ''
                      }`}
                    >
                      <item.icon className="w-4 h-4 text-emerald-500" />
                      {item.label}
                    </button>
                  ))}

                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 px-3 py-1 text-[10px] font-bold tracking-widest text-[#25D366] uppercase">Customers</div>
                  <button
                    onClick={() => handleNavClick('customers')}
                    className="flex items-center gap-2 w-full p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors rounded-xl text-left font-semibold text-xs text-slate-700 dark:text-slate-200 hover:text-[#25D366]"
                  >
                    <Users className="w-4 h-4 text-emerald-500" />
                    Case Studies & Featured Clients
                  </button>
                </div>
              )}
            </div>

            {/* Tools Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setToolsDropdownOpen(true)}
              onMouseLeave={() => setToolsDropdownOpen(false)}
            >
              <button 
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  ['link-generator', 'qr-generator', 'template-builder'].includes(currentTab)
                    ? 'text-[#006d2f] dark:text-[#25D366] bg-[#006d2f]/10 dark:bg-[#25D366]/10'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#006d2f] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Tools
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${toolsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {toolsDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[280px] p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-3 py-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Developer & Growth Tools</div>

                  {toolsLinks.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => handleNavClick(tool.id)}
                      className={`flex items-start gap-3 w-full p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors rounded-xl text-left group ${
                        currentTab === tool.id ? 'bg-emerald-500/10' : ''
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-[#25D366]/10 group-hover:text-[#25D366] transition-colors">
                        <tool.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#25D366] transition-colors">
                          {tool.label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {tool.desc}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Button */}
          <div className="hidden md:flex items-center gap-2.5">
            <a
              href={adminLoginUrl}
              title="For your team — sign in to the Prowexa dashboard at app.wabtic.com"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard Login
            </a>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-0.5" />
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => handleNavClick('login')}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors cursor-pointer shadow-sm"
                >
                  Website Login
                </button>
                <button
                  onClick={() => handleNavClick('demo')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 shadow-lg shadow-[#25D366]/20 hover:shadow-[#25D366]/30 transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Book Demo
                </button>
              </>
            ) : (
              <button
                onClick={() => logout()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white bg-slate-800 hover:bg-rose-600 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-rose-500 dark:hover:text-white transition-colors cursor-pointer shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer (Styled matching reference image with green headers) */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-4 right-4 mt-2 bg-slate-950/95 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl px-5 py-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-200 max-h-[85vh] overflow-y-auto">
          {/* Main Navigation */}
          <div className="space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`block w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  currentTab === link.id
                    ? 'text-[#25D366] bg-[#25D366]/10'
                    : 'text-slate-200 hover:bg-slate-900'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Company Section Header (Matching reference image) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="px-3 text-base font-extrabold text-[#25D366] tracking-tight">
              Company
            </div>
            {companyLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`block w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  currentTab === link.id
                    ? 'text-[#25D366] font-bold bg-[#25D366]/10'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Customers Section Header (Matching reference image) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <div className="px-3 text-base font-extrabold text-[#25D366] tracking-tight">
              Customers
            </div>
            {customerLinks.map((client, idx) => (
              <button
                key={idx}
                onClick={() => handleNavClick('customers')}
                className="block w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors"
              >
                {client.label}
              </button>
            ))}
          </div>

          {/* Developer Tools Section */}
          <div className="space-y-1 pt-2 border-t border-slate-800">
            <div className="px-3 text-xs font-bold text-slate-500 uppercase tracking-widest">
              Tools
            </div>
            {toolsLinks.map((tool) => (
              <button
                key={tool.id}
                onClick={() => handleNavClick(tool.id)}
                className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  currentTab === tool.id
                    ? 'text-[#25D366] bg-[#25D366]/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <tool.icon className="w-4 h-4 text-emerald-400" />
                {tool.label}
              </button>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 space-y-2">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => handleNavClick('login')}
                  className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-extrabold bg-white text-slate-900 shadow-lg cursor-pointer"
                >
                  Website Login
                </button>
                <button
                  onClick={() => handleNavClick('demo')}
                  className="flex items-center justify-center w-full py-3 rounded-xl text-sm font-extrabold bg-[#25D366] text-slate-950 shadow-lg shadow-[#25D366]/20 cursor-pointer"
                >
                  Book a Demo
                </button>
              </>
            ) : (
              <button
                onClick={() => logout()}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-extrabold bg-slate-800 text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            )}
            <a
              href={adminLoginUrl}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-extrabold border border-slate-700 text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard Login
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
