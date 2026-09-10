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
  Activity,
  FileText,
  Settings,
  Bell,
  X,
} from 'lucide-react';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Live Matches & Fixtures', href: '/matches', icon: <Activity className="w-5 h-5" /> },
    { label: 'Tournaments & Leagues', href: '/tournaments', icon: <Trophy className="w-5 h-5" /> },
    { label: 'Clubs & Teams', href: '/teams', icon: <Shield className="w-5 h-5" /> },
    { label: 'Players Catalog', href: '/players', icon: <Users className="w-5 h-5" /> },
    {
      label: 'User Management',
      href: '/users',
      icon: <ShieldAlert className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'] as UserRole[],
    },
    { label: 'Notifications', href: '/notifications', icon: <Bell className="w-5 h-5" /> },
    {
      label: 'Audit Logs',
      href: '/audit',
      icon: <FileText className="w-5 h-5" />,
      allowedRoles: ['SUPER_ADMIN'] as UserRole[],
    },
    { label: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
  ];

  const filteredItems = navItems.filter((item) => {
    if (!item.allowedRoles) return true;
    if (!user) return false;
    return item.allowedRoles.includes(user.role);
  });

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-72 bg-pitch-900 border-r border-slate-800 p-5 shadow-2xl flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏏</span>
              <span className="font-black text-white text-base uppercase">
                Cricket<span className="text-emerald-400">Master</span>
              </span>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            {filteredItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-pitch-800'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-500 font-medium">Phase 0 Architectural Foundation</p>
        </div>
      </div>
    </div>
  );
};
