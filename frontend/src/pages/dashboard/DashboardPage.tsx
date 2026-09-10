import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { userApi, PlatformStats } from '../../api/userApi.js';
import { matchApi } from '../../api/matchApi.js';
import { searchApi, GlobalSearchResponse } from '../../api/searchApi.js';
import { statsApi, AdminDashboardOverviewResponse } from '../../api/statsApi.js';
import { Match } from '../../types/index.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { RoleBadge } from '../../components/common/RoleBadge.js';
import { MatchStatusBadge } from '../../components/common/MatchStatusBadge.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { ErrorState } from '../../components/feedback/ErrorState.js';
import {
  Users,
  Shield,
  Trophy,
  Activity,
  ArrowRight,
  Zap,
  Calendar,
  Layers,
  Search,
  Flame,
  Radio,
  BarChart2,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [adminOverview, setAdminOverview] = useState<AdminDashboardOverviewResponse | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GlobalSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'TOURNAMENT_ADMIN';

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, matchesRes, adminRes] = await Promise.all([
        userApi.getPlatformStats(),
        matchApi.getMatches({ limit: 4 }),
        isAdmin ? statsApi.getAdminDashboard().catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ]);
      if (statsRes.data) setStats(statsRes.data);
      if (matchesRes.data) setMatches(matchesRes.data);
      if (adminRes.data) setAdminOverview(adminRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [isAdmin]);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchApi.search({ q: q.trim(), limit: 4 });
      if (res.data) {
        setSearchResults(res.data);
      }
    } catch {
      // Ignore search error
    } finally {
      setIsSearching(false);
    }
  }, []);

  if (isLoading) {
    return <LoadingState message="Connecting to Cricket Master Engine..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Welcome Banner */}
      <PageHeader
        title={`Welcome back, ${user?.firstName}!`}
        subtitle="Complete architectural foundation overview & real-time cricket intelligence telemetry."
        badge={user && <RoleBadge role={user.role} />}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/rankings">
              <Button variant="secondary" size="sm" icon={<Trophy className="w-4 h-4 text-amber-400" />}>
                Power Rankings
              </Button>
            </Link>
            <Link to="/matches">
              <Button variant="secondary" size="sm" icon={<Calendar className="w-4 h-4" />}>
                View Fixtures
              </Button>
            </Link>
            {user?.role === 'SUPER_ADMIN' && (
              <Link to="/users">
                <Button variant="primary" size="sm" icon={<Zap className="w-4 h-4" />}>
                  Manage Users & Roles
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Global Search Bar */}
      <div className="relative">
        <div className="relative bg-slate-900 border border-slate-700/80 rounded-2xl p-2 shadow-xl flex items-center">
          <Search className="w-5 h-5 text-slate-400 ml-3 mr-2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search players, clubs, tournaments, venues across the network..."
            className="w-full bg-transparent text-white text-sm outline-none px-2 py-1 placeholder-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
              className="text-xs text-slate-400 hover:text-white px-3 font-semibold"
            >
              Clear
            </button>
          )}
        </div>

        {/* Live Search Popup Overlay */}
        {searchResults && searchResults.totalResults > 0 && (
          <div className="absolute left-0 right-0 top-14 bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl z-30 space-y-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Search Results ({searchResults.totalResults} found)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Players */}
              {searchResults.players.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase">Athletes</span>
                  {searchResults.players.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => navigate(`/players/${p.id}`)}
                      className="p-2 bg-slate-950/80 hover:bg-slate-800 rounded-xl cursor-pointer text-xs flex items-center justify-between"
                    >
                      <span className="font-bold text-white">{p.firstName} {p.lastName}</span>
                      <span className="text-slate-400">{p.playerRole}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Teams */}
              {searchResults.teams.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-blue-400 uppercase">Clubs</span>
                  {searchResults.teams.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => navigate(`/teams/${t.id}`)}
                      className="p-2 bg-slate-950/80 hover:bg-slate-800 rounded-xl cursor-pointer text-xs flex items-center justify-between"
                    >
                      <span className="font-bold text-white">{t.name}</span>
                      <span className="text-slate-400">{t.code}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tournaments */}
              {searchResults.tournaments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 uppercase">Tournaments</span>
                  {searchResults.tournaments.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/tournaments/${c.id}`)}
                      className="p-2 bg-slate-950/80 hover:bg-slate-800 rounded-xl cursor-pointer text-xs flex items-center justify-between"
                    >
                      <span className="font-bold text-white">{c.name}</span>
                      <span className="text-slate-400">{c.format}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Matches */}
              {searchResults.matches.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-purple-400 uppercase">Fixtures</span>
                  {searchResults.matches.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => navigate(`/matches/${m.id}`)}
                      className="p-2 bg-slate-950/80 hover:bg-slate-800 rounded-xl cursor-pointer text-xs flex items-center justify-between"
                    >
                      <span className="font-bold text-white">{m.homeTeam?.shortName} vs {m.awayTeam?.shortName}</span>
                      <Badge variant={m.status === 'LIVE' ? 'emerald' : 'blue'}>{m.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Intelligence Dashboard Widget */}
      {adminOverview && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center">
              <BarChart2 className="w-5 h-5 text-emerald-400 mr-2" /> Platform Engine Intelligence
            </h3>
            <Badge variant="emerald">Live Telemetry</Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase">Total Deliveries</div>
              <div className="text-2xl font-black text-emerald-400 mt-0.5">
                {adminOverview.summary.totalRecordedDeliveries}
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase">Active Tournaments</div>
              <div className="text-2xl font-black text-amber-400 mt-0.5">
                {adminOverview.summary.activeTournaments}
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase">Live Matches</div>
              <div className="text-2xl font-black text-rose-400 mt-0.5">
                {adminOverview.summary.liveMatches}
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase">Completed Matches</div>
              <div className="text-2xl font-black text-blue-400 mt-0.5">
                {adminOverview.summary.completedMatches}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-emerald-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Matches
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {stats?.totalMatches ?? 0}
              </h3>
              <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {stats?.liveMatches ?? 0} Live Now
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-pitch-950 border border-slate-800 flex items-center justify-center text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="hover:border-blue-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Clubs & Teams
              </p>
              <h3 className="text-2xl font-black text-white mt-1">{stats?.totalTeams ?? 0}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Active Franchises</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-pitch-950 border border-slate-800 flex items-center justify-center text-blue-400">
              <Shield className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="hover:border-amber-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tournaments & Leagues
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {stats?.totalCompetitions ?? 0}
              </h3>
              <p className="text-[11px] text-amber-400 mt-1">Competitions Configured</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-pitch-950 border border-slate-800 flex items-center justify-center text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
          </div>
        </Card>

        <Card className="hover:border-purple-500/40 transition-colors">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Registered Athletes
              </p>
              <h3 className="text-2xl font-black text-white mt-1">
                {stats?.totalPlayers ?? 0}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Player Profiles</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-pitch-950 border border-slate-800 flex items-center justify-center text-purple-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Fixtures / Live Matches Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center">
            <Radio className="w-4 h-4 text-emerald-400 mr-2" /> Live & Upcoming Fixtures
          </h3>
          <Link to="/matches" className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center">
            View All Matches <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matches.map((m) => (
            <Card
              key={m.id}
              onClick={() => navigate(`/matches/${m.id}`)}
              className="hover:border-slate-700 cursor-pointer p-5 transition-colors space-y-3"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2.5">
                <span>{m.title}</span>
                <MatchStatusBadge status={m.status} />
              </div>

              <div className="flex items-center justify-between">
                <div className="font-bold text-white text-base">
                  {m.homeTeam?.name} <span className="text-slate-500 font-normal">vs</span> {m.awayTeam?.name}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1" /> {new Date(m.matchDate).toLocaleDateString()}
                </span>
                <span>{m.venue}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
