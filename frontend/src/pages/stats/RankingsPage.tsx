import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { statsApi, RankingEntry } from '../../api/statsApi.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { ErrorState } from '../../components/feedback/ErrorState.js';
import {
  Trophy,
  Flame,
  Target,
  Award,
  Filter,
  Medal,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const RankingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<'BATTING' | 'BOWLING' | 'ALL_ROUNDER'>('BATTING');
  const [format, setFormat] = useState<string>('ALL');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await statsApi.getRankings({ category, format: format === 'ALL' ? undefined : format, limit: 25 });
      if (res.data) {
        setRankings(res.data.rankings || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load player rankings');
    } finally {
      setLoading(false);
    }
  }, [category, format]);

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-black border border-amber-500/40 shadow-lg shadow-amber-500/10">
          <Medal className="w-4 h-4 mr-0.5" /> 1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-400/20 text-slate-300 font-black border border-slate-400/40">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-700/20 text-amber-600 font-black border border-amber-700/40">
          3
        </span>
      );
    }
    return <span className="font-bold text-slate-400 pl-2">#{rank}</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="emerald">OFFICIAL PLATFORM RANKINGS</Badge>
              <span className="text-xs text-slate-400 flex items-center">
                <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Deterministic Rating Index
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white flex items-center">
              <Trophy className="w-7 h-7 mr-3 text-amber-400" /> Player Power Rankings
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Real-time statistical power rankings calculated from verified match deliveries, batting averages, economy rates, and milestones.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setCategory('BATTING')}
              className={`flex items-center px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                category === 'BATTING'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 mr-1.5" /> Batting
            </button>
            <button
              onClick={() => setCategory('BOWLING')}
              className={`flex items-center px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                category === 'BOWLING'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="w-3.5 h-3.5 mr-1.5" /> Bowling
            </button>
            <button
              onClick={() => setCategory('ALL_ROUNDER')}
              className={`flex items-center px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                category === 'ALL_ROUNDER'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 mr-1.5" /> All-Rounder
            </button>
          </div>
        </div>
      </div>

      {/* Format Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Format:</span>
          <div className="flex gap-1.5">
            {['ALL', 'T20', 'ODI', 'TEST'].map((fmt) => (
              <Button
                key={fmt}
                size="sm"
                variant={format === fmt ? 'primary' : 'ghost'}
                onClick={() => setFormat(fmt)}
                className="text-xs"
              >
                {fmt === 'ALL' ? 'All Formats' : fmt}
              </Button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing Top <span className="text-white font-bold">{rankings.length}</span> ranked athletes
        </div>
      </div>

      {/* Rankings Table */}
      {loading ? (
        <LoadingState message="Calculating deterministic ratings..." />
      ) : error ? (
        <ErrorState title="Rankings Error" message={error} onRetry={fetchRankings} />
      ) : rankings.length === 0 ? (
        <Card className="p-12 text-center bg-slate-900 border-slate-800 space-y-3">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-white">No Rankings Available</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            No active players match the selected filters or there are no recorded match statistics yet.
          </p>
        </Card>
      ) : (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Rank</th>
                  <th className="px-6 py-4">Player</th>
                  <th className="px-6 py-4">Team</th>
                  <th className="px-6 py-4">Rating Index</th>
                  {category === 'BATTING' && (
                    <>
                      <th className="px-4 py-4 text-center">Innings</th>
                      <th className="px-4 py-4 text-center">Runs</th>
                      <th className="px-4 py-4 text-center">Average</th>
                      <th className="px-4 py-4 text-center">SR</th>
                      <th className="px-4 py-4 text-center">50s / 100s</th>
                    </>
                  )}
                  {category === 'BOWLING' && (
                    <>
                      <th className="px-4 py-4 text-center">Innings</th>
                      <th className="px-4 py-4 text-center">Overs</th>
                      <th className="px-4 py-4 text-center">Wickets</th>
                      <th className="px-4 py-4 text-center">Economy</th>
                      <th className="px-4 py-4 text-center">Average</th>
                    </>
                  )}
                  {category === 'ALL_ROUNDER' && (
                    <>
                      <th className="px-4 py-4 text-center">Runs</th>
                      <th className="px-4 py-4 text-center">Bat Avg</th>
                      <th className="px-4 py-4 text-center">Wickets</th>
                      <th className="px-4 py-4 text-center">Economy</th>
                      <th className="px-4 py-4 text-center">Catches</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {rankings.map((p) => (
                  <tr
                    key={p.playerId}
                    onClick={() => navigate(`/players/${p.playerId}`)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">{getRankBadge(p.rank)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-emerald-400">
                          {p.firstName[0]}
                          {p.lastName[0]}
                        </div>
                        <div>
                          <div className="font-bold text-white hover:text-emerald-400 transition-colors">
                            {p.firstName} {p.lastName}
                          </div>
                          <div className="text-xs text-slate-400">{p.playerRole}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {p.teamName ? (
                        <span className="text-xs font-semibold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                          {p.teamCode || p.teamName}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-emerald-400">{p.points}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">pts</span>
                      </div>
                    </td>

                    {category === 'BATTING' && (
                      <>
                        <td className="px-4 py-4 text-center font-bold text-white">{p.metrics.innings || 0}</td>
                        <td className="px-4 py-4 text-center font-black text-emerald-400">{p.metrics.runs || 0}</td>
                        <td className="px-4 py-4 text-center text-white">{p.metrics.average || 0}</td>
                        <td className="px-4 py-4 text-center text-white">{p.metrics.strikeRate || 0}</td>
                        <td className="px-4 py-4 text-center text-xs text-slate-300">
                          {p.metrics.fifties || 0} / {p.metrics.hundreds || 0}
                        </td>
                      </>
                    )}

                    {category === 'BOWLING' && (
                      <>
                        <td className="px-4 py-4 text-center font-bold text-white">{p.metrics.innings || 0}</td>
                        <td className="px-4 py-4 text-center text-white">{p.metrics.overs || '0.0'}</td>
                        <td className="px-4 py-4 text-center font-black text-blue-400">{p.metrics.wickets || 0}</td>
                        <td className="px-4 py-4 text-center text-white">{p.metrics.economy || 0}</td>
                        <td className="px-4 py-4 text-center text-white">{p.metrics.average || 0}</td>
                      </>
                    )}

                    {category === 'ALL_ROUNDER' && (
                      <>
                        <td className="px-4 py-4 text-center font-bold text-emerald-400">{p.metrics.battingRuns || 0}</td>
                        <td className="px-4 py-4 text-center text-white">{p.metrics.battingAvg || 0}</td>
                        <td className="px-4 py-4 text-center font-bold text-blue-400">{p.metrics.wickets || 0}</td>
                        <td className="px-4 py-4 text-center text-white">{p.metrics.economy || 0}</td>
                        <td className="px-4 py-4 text-center text-white">{p.metrics.catches || 0}</td>
                      </>
                    )}

                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
