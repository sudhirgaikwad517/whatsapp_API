import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Megaphone,
  Users,
  FileCode2,
  Bot,
  BarChart3,
  Wallet,
  Users2,
  ShieldAlert,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export const Sidebar: React.FC = () => {
  const logout = useAuthStore((state) => state.logout);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/inbox', label: 'Live Inbox', icon: MessageSquare },
    { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
    { to: '/contacts', label: 'Contacts CRM', icon: Users },
    { to: '/templates', label: 'Meta Templates', icon: FileCode2 },
    { to: '/auto-reply', label: 'Auto Reply Bot', icon: Bot },
    { to: '/wallet', label: 'Wallet & Billing', icon: Wallet },
    { to: '/team', label: 'Team & Agents', icon: Users2 },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/settings', label: 'Organization Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 space-x-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <MessageSquare className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-white">Prowexa</h1>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-emerald-400">WhatsApp Engine</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            <item.icon className="w-4 h-4 mr-3 stroke-[2]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </button>
      </div>
    </aside>
  );
};
