import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { UserRole } from '../../types/index.js';
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Trophy,
  Shield,
  Calendar,
  Activity,
  FileText,
  Settings,
  Bell,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  allowedRoles?: UserRole[];
  badge?: string;
}

export const Sidebar: React.FC<{ isCollapsed?: boolean; onToggleCollapse?: () => void }> = ({
  isCollapsed = false,
}) => {
  const { user } = useAuth();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: 'Live Matches & Fixtures',
      href: '/matches',
      icon: <Activity className="w-5 h-5" />,
    },
    {
      label: 'Tournaments & Leagues',
      href: '/tournaments',
      icon: <Trophy className="w-5 h-5" />,
    },
    {
      label: 'Clubs & Teams',
      href: '/teams',
      icon: <Shield className="w-5 h-5" />,
    },
    {
      label: 'Players Catalog',
      href: '/players',
      icon: <Users className="w-5 h-5" />,
    },
    {
      label: 'Player Rankings',
      href: '/rankings',
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
    },
    {
      label: 'User Management',
      href: '/users',
      icon: <ShieldAlert className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'],
    },
    {
      label: 'Notifications',
      href: '/notifications',
      icon: <Bell className="w-5 h-5" />,
    },
    {
      label: 'Security & Audit Logs',
      href: '/audit',
      icon: <FileText className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN'],
    },
    {
      label: 'Platform Settings',
      href: '/settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (!item.allowedRoles) return true;
    if (!user) return false;
    return item.allowedRoles.includes(user.role);
  });

  return (
    <aside
      className={`hidden lg:flex flex-col h-screen sticky top-0 bg-pitch-900 border-r border-slate-800/90 transition-all duration-300 z-30 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800/80 gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/25 shrink-0">
          🏏
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h2 className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-1.5">
              Cricket<span className="text-emerald-400">Master</span>
            </h2>
            <span className="text-[10px] font-semibold text-slate-400 tracking-wider block uppercase">
              Pro Platform
            </span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className={`px-3 py-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider ${isCollapsed ? 'sr-only' : ''}`}>
          Navigation
        </div>
        {filteredItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-pitch-800/60 border border-transparent'
              } ${isCollapsed ? 'justify-center px-2' : ''}`
            }
          >
            <span className="shrink-0 transition-transform group-hover:scale-110">{item.icon}</span>
            {!isCollapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </div>

      {/* System Status Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-800/80 bg-pitch-950/40">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-pitch-900 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-xs">
              <p className="font-semibold text-white">Engine Online</p>
              <p className="text-[10px] text-slate-400">Phase 0 Foundation</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
