import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { RoleBadge } from '../common/RoleBadge.js';
import { UserRole } from '../../types/index.js';
import { Menu, LogOut, ChevronDown, User as UserIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export interface HeaderProps {
  onToggleMobileNav: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileNav }) => {
  const { user, logout, switchDemoRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const rolesList: UserRole[] = [
    'SUPER_ADMIN',
    'TOURNAMENT_ADMIN',
    'LEAGUE_ADMIN',
    'SCORER',
    'TEAM_MANAGER',
    'PLAYER',
    'VIEWER',
  ];

  return (
    <header className="sticky top-0 z-20 h-16 glass-header flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileNav}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-pitch-800 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="lg:hidden font-black text-white text-sm tracking-wider uppercase">
          Cricket<span className="text-emerald-400">Master</span>
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Demo Role Switcher (DEV / Demo Mode only) */}
        {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true') && (
          <div className="relative">
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pitch-900 border border-slate-700/80 hover:border-slate-500 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
            >
              <span>Role Switcher</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-64 bg-pitch-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 animate-scaleUp">
                <div className="px-3 py-2 border-b border-slate-800 text-[11px] font-bold uppercase text-slate-400">
                  Instant Role Switch (Demo)
                </div>
                <div className="py-1 space-y-1">
                  {rolesList.map((r) => (
                    <button
                      key={r}
                      onClick={async () => {
                        setShowRoleSwitcher(false);
                        await switchDemoRole(r);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                        user?.role === r
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-pitch-800 hover:text-white'
                      }`}
                    >
                      <span>{r.replace(/_/g, ' ')}</span>
                      {user?.role === r && <span className="text-[10px] text-emerald-400 font-bold">ACTIVE</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Role Badge */}
        {user && (
          <div className="hidden md:block">
            <RoleBadge role={user.role} />
          </div>
        )}

        {/* User Profile Dropdown */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-pitch-800/80 transition-colors border border-transparent hover:border-slate-800"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-pitch-800 text-white font-bold flex items-center justify-center text-xs shadow-md border border-emerald-500/30">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-white leading-tight">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{user.email}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-pitch-900 border border-slate-700/80 rounded-2xl shadow-2xl p-2 z-50 animate-scaleUp">
                <div className="px-3 py-2.5 border-b border-slate-800">
                  <p className="text-xs font-bold text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                  <div className="mt-2">
                    <RoleBadge role={user.role} size="sm" />
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-pitch-800 rounded-xl transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>My Profile & Settings</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
};
