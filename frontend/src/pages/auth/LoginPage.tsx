import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { UserRole } from '../../types/index.js';
import { Input } from '../../components/common/Input.js';
import { Button } from '../../components/common/Button.js';
import { Mail, Lock, Zap } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, switchDemoRole } = useAuth();
  const { success, error: toastError, info } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toastError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email, password });
      success('Welcome back to Cricket Master!');
      navigate(redirectUrl);
    } catch (err: any) {
      toastError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoQuickLogin = async (role: UserRole) => {
    setIsLoading(true);
    try {
      await switchDemoRole(role);
      success(`Logged in as demo ${role.replace(/_/g, ' ')}`);
      navigate(redirectUrl);
    } catch (err: any) {
      toastError(err.message || 'Demo login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const demoRoles: Array<{ role: UserRole; label: string; desc: string; color: string }> = [
    { role: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Full system control & audit logs', color: 'border-red-500/40 text-red-400 bg-red-950/20' },
    { role: 'TOURNAMENT_ADMIN', label: 'Tournament Admin', desc: 'Manage tournaments & fixtures', color: 'border-amber-500/40 text-amber-400 bg-amber-950/20' },
    { role: 'LEAGUE_ADMIN', label: 'League Admin', desc: 'Manage leagues & clubs', color: 'border-blue-500/40 text-blue-400 bg-blue-950/20' },
    { role: 'SCORER', label: 'Official Scorer', desc: 'Match scoring & live ball entry', color: 'border-emerald-500/40 text-emerald-400 bg-emerald-950/20' },
    { role: 'TEAM_MANAGER', label: 'Team Manager', desc: 'Team squads & player roster', color: 'border-purple-500/40 text-purple-400 bg-purple-950/20' },
    { role: 'PLAYER', label: 'Player', desc: 'Personal stats & squad profile', color: 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20' },
    { role: 'VIEWER', label: 'Viewer / Fan', desc: 'Live scores, stats & rankings', color: 'border-slate-600 text-slate-300 bg-slate-900/30' },
  ];

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-slate-950 text-2xl font-black shadow-glow-emerald mb-4">
          🏏
        </div>
        <h2 className="text-3xl font-black tracking-tight text-white uppercase">
          Cricket<span className="text-emerald-400">Master</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Professional Cricket Management & Scoring Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <div className="glass-card py-8 px-6 sm:px-10 rounded-3xl shadow-2xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. superadmin@cricketmaster.io"
              icon={<Mail className="w-4 h-4" />}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              required
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Sign In to Platform
            </Button>
          </form>

          {/* Demo Quick-Login Switcher (Enabled in DEV / Demo environments only) */}
          {(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true') && (
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Demo 1-Click Role Access
                </span>
                <span className="text-[11px] text-slate-500">Test all 7 RBAC roles</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {demoRoles.map((d) => (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => handleDemoQuickLogin(d.role)}
                    className={`flex flex-col text-left p-2.5 rounded-xl border transition-all duration-200 hover:scale-[1.02] ${d.color}`}
                  >
                    <span className="text-xs font-bold leading-none">{d.label}</span>
                    <span className="text-[10px] text-slate-400 mt-1 truncate">{d.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Need a new account?{' '}
              <Link to="/register" className="text-emerald-400 hover:underline font-semibold">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
