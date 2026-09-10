import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { tournamentApi, TournamentStanding } from '../../api/tournamentApi.js';
import { teamApi } from '../../api/teamApi.js';
import { analyticsApi, TournamentAnalyticsResponse } from '../../api/analyticsApi.js';
import { Competition, Team } from '../../types/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { Input } from '../../components/common/Input.js';
import { Select } from '../../components/common/Select.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { ErrorState } from '../../components/feedback/ErrorState.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import {
  ArrowLeft,
  Trophy,
  Shield,
  Plus,
  Trash2,
  Calendar,
  Layers,
  MapPin,
  Flame,
  CheckCircle,
  Clock,
  BarChart3,
  Award,
  Target,
} from 'lucide-react';

export const TournamentDetailPage: React.FC = () => {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [standings, setStandings] = useState<TournamentStanding[]>([]);
  const [competitionTeams, setCompetitionTeams] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [tournamentAnalytics, setTournamentAnalytics] = useState<TournamentAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'standings' | 'matches' | 'teams' | 'analytics'>('standings');

  // Modals
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('UPCOMING');

  const [addTeamData, setAddTeamData] = useState({
    teamId: '',
    groupName: 'Group A',
    seed: 1,
  });

  const canManage = ['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'].includes(user?.role || '');

  const fetchTournamentData = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const [compRes, standingsRes, teamsRes, allTeamsRes, anRes] = await Promise.all([
        tournamentApi.getTournament(tournamentId),
        tournamentApi.getTournamentStandings(tournamentId).catch(() => ({ data: { standings: [] } })),
        tournamentApi.getTournamentTeams(tournamentId).catch(() => ({ data: [] })),
        teamApi.getTeams({ limit: 100 }).catch(() => ({ data: [] })),
        analyticsApi.getTournamentAnalytics(tournamentId).catch(() => ({ data: null })),
      ]);

      if (compRes.data) {
        setCompetition(compRes.data);
        setSelectedStatus(compRes.data.status);
      }
      if (standingsRes.data?.standings) {
        setStandings(standingsRes.data.standings);
      }
      if (teamsRes.data) {
        setCompetitionTeams(teamsRes.data);
      }
      if (allTeamsRes.data) {
        setAllTeams(allTeamsRes.data);
      }
      if (anRes.data) {
        setTournamentAnalytics(anRes.data);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournamentData();
  }, [fetchTournamentData]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId || !addTeamData.teamId) return;
    setActionLoading(true);
    try {
      await tournamentApi.addTeamToTournament(tournamentId, addTeamData);
      setIsAddTeamOpen(false);
      setAddTeamData({ teamId: '', groupName: 'Group A', seed: 1 });
      await fetchTournamentData();
      success('Team enrolled into tournament successfully');
    } catch (err: any) {
      toastError(err.message || 'Failed to enroll team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    if (!tournamentId || !confirm('Are you sure you want to withdraw this team from the competition?')) return;
    setActionLoading(true);
    try {
      await tournamentApi.removeTeamFromTournament(tournamentId, teamId);
      await fetchTournamentData();
      success('Team withdrawn from competition');
    } catch (err: any) {
      toastError(err.message || 'Failed to remove team');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!tournamentId) return;
    setActionLoading(true);
    try {
      await tournamentApi.updateTournamentStatus(tournamentId, selectedStatus);
      setIsStatusModalOpen(false);
      await fetchTournamentData();
      success(`Tournament status updated to ${selectedStatus}`);
    } catch (err: any) {
      toastError(err.message || 'Failed to update tournament status');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading tournament details..." />;
  if (error || !competition) {
    return <ErrorState title="Competition Error" message={error || 'Tournament not found'} onRetry={fetchTournamentData} />;
  }

  const existingTeamIds = new Set(competitionTeams.map((ct) => ct.teamId));
  const availableTeams = allTeams.filter((t) => !existingTeamIds.has(t.id));
  const matches = competition.matches || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tournaments')} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Tournaments
        </Button>
        {canManage && (
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => setIsStatusModalOpen(true)}>
              <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Update Status ({competition.status})
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsAddTeamOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Enroll Team
            </Button>
          </div>
        )}
      </div>

      {/* Tournament Hero Card */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-black text-2xl text-amber-400 shadow-xl">
            <Trophy className="w-10 h-10" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-white">{competition.name}</h1>
              <span className="text-xs font-bold text-amber-400 bg-amber-950/80 border border-amber-800/50 px-2.5 py-1 rounded-full">
                {competition.code}
              </span>
              <Badge variant={competition.status === 'ONGOING' ? 'emerald' : competition.status === 'COMPLETED' ? 'blue' : 'amber'}>
                {competition.status}
              </Badge>
            </div>

            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Official cricket competition operating under standard rules and Net Run Rate (NRR) qualification tables.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs font-semibold text-slate-300">
              <span className="flex items-center"><Layers className="w-3.5 h-3.5 mr-1 text-amber-400" /> Type: <span className="text-white font-bold ml-1">{competition.type}</span></span>
              <span>•</span>
              <span>Format: <span className="text-white font-bold">{competition.format}</span></span>
              <span>•</span>
              <span>Season: <span className="text-white font-bold">{competition.seasonYear}</span></span>
              <span>•</span>
              <span>Teams Enrolled: <span className="text-white font-bold">{competitionTeams.length}</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('standings')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'standings'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Points Table & NRR</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'analytics'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Tournament Leaders</span>
        </button>

        <button
          onClick={() => setActiveTab('matches')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'matches'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Fixtures & Results ({matches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('teams')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'teams'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Participating Teams ({competitionTeams.length})</span>
        </button>
      </div>

      {/* TAB 1: POINTS TABLE & NRR */}
      {activeTab === 'standings' && (
        <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-white text-base flex items-center">
              <Trophy className="w-4 h-4 text-amber-400 mr-2" /> Standings & Net Run Rate Table
            </h3>
            <span className="text-xs text-slate-400">Sorted by Pts &gt; NRR &gt; Wins</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">#</th>
                  <th className="px-6 py-4">Team</th>
                  <th className="px-4 py-4 text-center">P</th>
                  <th className="px-4 py-4 text-center">W</th>
                  <th className="px-4 py-4 text-center">L</th>
                  <th className="px-4 py-4 text-center">T</th>
                  <th className="px-4 py-4 text-center">NR</th>
                  <th className="px-4 py-4 text-center">Pts</th>
                  <th className="px-6 py-4 text-right">NRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {standings.length > 0 ? (
                  standings.map((s, idx) => (
                    <tr
                      key={s.teamId}
                      onClick={() => navigate(`/teams/${s.teamId}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-amber-400">
                          {s.teamCode}
                        </div>
                        <span>{s.teamName}</span>
                      </td>
                      <td className="px-4 py-4 text-center font-bold text-slate-300">{s.played}</td>
                      <td className="px-4 py-4 text-center font-bold text-emerald-400">{s.won}</td>
                      <td className="px-4 py-4 text-center text-slate-400">{s.lost}</td>
                      <td className="px-4 py-4 text-center text-slate-400">{s.tied}</td>
                      <td className="px-4 py-4 text-center text-slate-400">{s.noResult}</td>
                      <td className="px-4 py-4 text-center font-black text-amber-400 text-base">{s.points}</td>
                      <td className="px-6 py-4 text-right font-bold text-white">
                        {s.netRunRate > 0 ? `+${s.netRunRate.toFixed(3)}` : s.netRunRate.toFixed(3)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-400 text-xs">
                      No matches completed yet in this competition. Standings table will automatically calculate after matches.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: TOURNAMENT ANALYTICS & LEADERS */}
      {activeTab === 'analytics' && tournamentAnalytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Run Scorers (Orange Cap) */}
            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm flex items-center">
                  <Flame className="w-4 h-4 text-amber-400 mr-2" /> Top Run Scorers (Tournament Cap)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Player</th>
                      <th className="px-4 py-2.5 text-center">Inn</th>
                      <th className="px-4 py-2.5 text-center">Runs</th>
                      <th className="px-4 py-2.5 text-center">Avg</th>
                      <th className="px-4 py-2.5 text-center">SR</th>
                      <th className="px-4 py-2.5 text-center">High</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {tournamentAnalytics.topScorers.length > 0 ? (
                      tournamentAnalytics.topScorers.map((s, idx) => (
                        <tr
                          key={s.playerId}
                          onClick={() => navigate(`/players/${s.playerId}`)}
                          className="hover:bg-slate-800/40 cursor-pointer"
                        >
                          <td className="px-4 py-2 font-bold text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-2 font-bold text-white">{s.name}</td>
                          <td className="px-4 py-2 text-center text-slate-400">{s.innings}</td>
                          <td className="px-4 py-2 text-center font-black text-amber-400">{s.runs}</td>
                          <td className="px-4 py-2 text-center text-white">{s.average}</td>
                          <td className="px-4 py-2 text-center text-slate-300">{s.strikeRate}</td>
                          <td className="px-4 py-2 text-center text-white">{s.highScore}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                          No tournament batting records logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Top Wicket Takers (Purple Cap) */}
            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm flex items-center">
                  <Target className="w-4 h-4 text-blue-400 mr-2" /> Top Wicket Takers (Purple Cap)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Bowler</th>
                      <th className="px-4 py-2.5 text-center">Inn</th>
                      <th className="px-4 py-2.5 text-center">Overs</th>
                      <th className="px-4 py-2.5 text-center">Wickets</th>
                      <th className="px-4 py-2.5 text-center">Econ</th>
                      <th className="px-4 py-2.5 text-center">Best</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {tournamentAnalytics.topWicketTakers.length > 0 ? (
                      tournamentAnalytics.topWicketTakers.map((w, idx) => (
                        <tr
                          key={w.playerId}
                          onClick={() => navigate(`/players/${w.playerId}`)}
                          className="hover:bg-slate-800/40 cursor-pointer"
                        >
                          <td className="px-4 py-2 font-bold text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-2 font-bold text-white">{w.name}</td>
                          <td className="px-4 py-2 text-center text-slate-400">{w.innings}</td>
                          <td className="px-4 py-2 text-center text-slate-300">{w.overs}</td>
                          <td className="px-4 py-2 text-center font-black text-blue-400">{w.wickets}</td>
                          <td className="px-4 py-2 text-center text-white">{w.economy}</td>
                          <td className="px-4 py-2 text-center text-white">{w.bestBowling}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                          No tournament bowling records logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: FIXTURES & RESULTS */}
      {activeTab === 'matches' && (
        <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base">Fixtures & Match Schedule</h3>
            <Badge variant="blue">{matches.length} Scheduled</Badge>
          </div>

          {matches.length > 0 ? (
            <div className="space-y-3">
              {matches.map((m) => (
                <div
                  key={m.id}
                  onClick={() => navigate(`/matches/${m.id}`)}
                  className="p-4 bg-slate-950/80 hover:bg-slate-800/50 border border-slate-800 rounded-2xl cursor-pointer transition-colors flex flex-col md:flex-row items-center justify-between gap-4"
                >
                  <div className="space-y-1 text-center md:text-left">
                    <div className="font-bold text-white text-sm">
                      {m.homeTeam?.name || 'Home'} vs {m.awayTeam?.name || 'Away'}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center space-x-2">
                      <span>{new Date(m.matchDate).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{m.venue}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge variant={m.status === 'LIVE' ? 'emerald' : m.status === 'COMPLETED' ? 'blue' : 'amber'}>
                      {m.status}
                    </Badge>
                    {m.resultSummary && (
                      <span className="text-xs font-semibold text-slate-300">{m.resultSummary}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Fixtures Scheduled"
              description="No matches have been added for this tournament yet."
            />
          )}
        </Card>
      )}

      {/* TAB 4: ENROLLED TEAMS */}
      {activeTab === 'teams' && (
        <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-base">Participating Franchises</h3>
            <Badge variant="emerald">{competitionTeams.length} Enrolled</Badge>
          </div>

          {competitionTeams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {competitionTeams.map((ct) => (
                <div
                  key={ct.id}
                  className="flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl"
                >
                  <div
                    onClick={() => navigate(`/teams/${ct.teamId}`)}
                    className="flex items-center space-x-3 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-amber-400">
                      {ct.team.code}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm hover:text-amber-400 transition-colors">
                        {ct.team.name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {ct.groupName || 'Pool 1'} {ct.seed ? `• Seed ${ct.seed}` : ''}
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemoveTeam(ct.teamId)}
                      className="h-8 px-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No Enrolled Teams"
              description="No franchises have been registered to this tournament yet."
            />
          )}
        </Card>
      )}

      {/* Add Team Modal */}
      <Modal
        isOpen={isAddTeamOpen}
        onClose={() => setIsAddTeamOpen(false)}
        title="Enroll Franchise into Tournament"
        size="md"
      >
        <form onSubmit={handleAddTeam} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Select Team
            </label>
            <select
              required
              value={addTeamData.teamId}
              onChange={(e) => setAddTeamData({ ...addTeamData, teamId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Choose a team...</option>
              {availableTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Group / Pool (Optional)"
              placeholder="e.g. Group A"
              value={addTeamData.groupName}
              onChange={(e) => setAddTeamData({ ...addTeamData, groupName: e.target.value })}
            />
            <Input
              label="Seed #"
              type="number"
              value={addTeamData.seed}
              onChange={(e) => setAddTeamData({ ...addTeamData, seed: parseInt(e.target.value) || 1 })}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsAddTeamOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading || !addTeamData.teamId}>
              Enroll Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Tournament Lifecycle Status"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Lifecycle State"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            options={[
              { label: 'Upcoming', value: 'UPCOMING' },
              { label: 'Ongoing', value: 'ONGOING' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Draft', value: 'DRAFT' },
            ]}
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateStatus} disabled={actionLoading}>
              Save Status
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
