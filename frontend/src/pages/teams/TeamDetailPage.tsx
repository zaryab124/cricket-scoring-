import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teamApi } from '../../api/teamApi.js';
import { playerApi } from '../../api/playerApi.js';
import { Team, Player } from '../../types/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { ErrorState } from '../../components/feedback/ErrorState.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import {
  ArrowLeft,
  Users,
  Shield,
  Plus,
  Edit,
  Trash2,
  Crown,
  History,
  MapPin,
  CheckCircle,
} from 'lucide-react';

export const TeamDetailPage: React.FC = () => {
  const { id: teamId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [team, setTeam] = useState<Team | null>(null);
  const [teamStats, setTeamStats] = useState<any | null>(null);
  const [squadHistory, setSquadHistory] = useState<any | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'squad' | 'stats' | 'history'>('squad');

  // Modals
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isEditTeamOpen, setIsEditTeamOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  // Form states
  const [newMemberData, setNewMemberData] = useState({
    playerId: '',
    role: 'PLAYER',
    jerseyNumber: 1,
    isCaptain: false,
    isViceCaptain: false,
    isWicketKeeper: false,
  });

  const [editTeamData, setEditTeamData] = useState<any>({});

  const canManage =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'TOURNAMENT_ADMIN' ||
    user?.role === 'LEAGUE_ADMIN' ||
    (user?.role === 'TEAM_MANAGER' && team?.managerId === user.id);

  const fetchTeamData = useCallback(async () => {
    if (!teamId) return;
    try {
      setLoading(true);
      const [teamRes, statsRes, histRes, playersRes] = await Promise.all([
        teamApi.getTeam(teamId),
        teamApi.getTeamStats(teamId).catch(() => ({ data: null })),
        teamApi.getSquadHistory(teamId).catch(() => ({ data: null })),
        playerApi.getPlayers({ limit: 100 }).catch(() => ({ data: [] })),
      ]);

      if (teamRes.data) {
        setTeam(teamRes.data);
        setEditTeamData({
          name: teamRes.data.name,
          shortName: teamRes.data.shortName,
          code: teamRes.data.code,
          city: teamRes.data.city,
          country: teamRes.data.country,
          homeGround: teamRes.data.homeGround,
        });
      }
      if (statsRes.data) setTeamStats(statsRes.data.stats);
      if (histRes.data) setSquadHistory(histRes.data);
      if (playersRes.data) setAllPlayers(playersRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !newMemberData.playerId) return;
    setActionLoading(true);
    try {
      await teamApi.addMember(teamId, newMemberData);
      setIsAddMemberOpen(false);
      await fetchTeamData();
      success('Player drafted into squad');
    } catch (err: any) {
      toastError(err.message || 'Failed to add member');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !selectedMember) return;
    setActionLoading(true);
    try {
      await teamApi.updateMemberRoles(teamId, selectedMember.playerId, {
        isCaptain: selectedMember.isCaptain,
        isViceCaptain: selectedMember.isViceCaptain,
        isWicketKeeper: selectedMember.isWicketKeeper,
        role: selectedMember.isCaptain
          ? 'CAPTAIN'
          : selectedMember.isViceCaptain
          ? 'VICE_CAPTAIN'
          : selectedMember.isWicketKeeper
          ? 'WICKET_KEEPER'
          : 'PLAYER',
        jerseyNumber: selectedMember.jerseyNumber,
      });
      setIsRoleModalOpen(false);
      await fetchTeamData();
      success('Squad roles updated');
    } catch (err: any) {
      toastError(err.message || 'Failed to update squad roles');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (playerId: string) => {
    if (!teamId || !confirm('Are you sure you want to remove this player from the active roster?')) return;
    setActionLoading(true);
    try {
      await teamApi.removeMember(teamId, playerId);
      await fetchTeamData();
      info('Player transferred from active roster');
    } catch (err: any) {
      toastError(err.message || 'Failed to remove player');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId) return;
    setActionLoading(true);
    try {
      await teamApi.updateTeam(teamId, editTeamData);
      setIsEditTeamOpen(false);
      await fetchTeamData();
      success('Team details updated');
    } catch (err: any) {
      toastError(err.message || 'Failed to update team');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading club roster..." />;
  if (error || !team) {
    return <ErrorState title="Team Error" message={error || 'Team not found'} onRetry={fetchTeamData} />;
  }

  const activeMembers = team.members || [];
  const existingMemberPlayerIds = new Set(activeMembers.map((m) => m.playerId));
  const availablePlayers = allPlayers.filter((p) => !existingMemberPlayerIds.has(p.id));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teams')} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Teams
        </Button>
        {canManage && (
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditTeamOpen(true)}>
              <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Team
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsAddMemberOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Draft Player
            </Button>
          </div>
        )}
      </div>

      {/* Team Hero Card */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-black text-2xl text-emerald-400 shadow-xl">
            {team.shortName}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-white">{team.name}</h1>
              <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
                {team.code}
              </span>
              <Badge variant="emerald">ACTIVE FRANCHISE</Badge>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-1 text-xs font-semibold text-slate-300">
              {team.homeGround && (
                <span className="flex items-center">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400" /> {team.homeGround}
                </span>
              )}
              {team.city && <span>• {team.city}, {team.country || 'India'}</span>}
              <span>•</span>
              <span className="flex items-center">
                <Users className="w-3.5 h-3.5 mr-1 text-slate-400" /> {activeMembers.length} Active Players
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('squad')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'squad'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Squad ({activeMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'stats'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Match Performance & Stats</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Transfer & Squad History</span>
        </button>
      </div>

      {/* TAB: STATS & PERFORMANCE */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800 p-4 text-center">
              <div className="text-xs uppercase text-slate-400 font-bold mb-1">Matches Played</div>
              <div className="text-2xl font-black text-white">{teamStats?.matchesPlayed ?? 0}</div>
              <div className="text-[11px] text-slate-400 mt-1">
                {teamStats?.wins ?? 0}W • {teamStats?.losses ?? 0}L • {teamStats?.ties ?? 0}T
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4 text-center">
              <div className="text-xs uppercase text-slate-400 font-bold mb-1">Win Percentage</div>
              <div className="text-2xl font-black text-emerald-400">{teamStats?.winPercentage ?? 0}%</div>
              <div className="text-[11px] text-slate-400 mt-1">Decided Matches</div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4 text-center">
              <div className="text-xs uppercase text-slate-400 font-bold mb-1">Highest Score</div>
              <div className="text-2xl font-black text-amber-400">{teamStats?.highestScore ?? 0}</div>
              <div className="text-[11px] text-slate-400 mt-1">{teamStats?.totalRunsScored ?? 0} Total Runs</div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-4 text-center">
              <div className="text-xs uppercase text-slate-400 font-bold mb-1">Wickets Taken</div>
              <div className="text-2xl font-black text-cyan-400">{teamStats?.totalWicketsTaken ?? 0}</div>
              <div className="text-[11px] text-slate-400 mt-1">Bowling Total</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
              <h3 className="font-bold text-white text-base">Venue Record (Home vs Away)</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="font-semibold text-slate-300">Home Ground</span>
                  <span className="font-bold text-white">
                    {teamStats?.homeRecord?.played ?? 0} Matches ({teamStats?.homeRecord?.won ?? 0}W - {teamStats?.homeRecord?.lost ?? 0}L)
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="font-semibold text-slate-300">Away / Neutral</span>
                  <span className="font-bold text-white">
                    {teamStats?.awayRecord?.played ?? 0} Matches ({teamStats?.awayRecord?.won ?? 0}W - {teamStats?.awayRecord?.lost ?? 0}L)
                  </span>
                </div>
              </div>
            </Card>

            <Card className="bg-slate-900 border-slate-800 p-5 space-y-4">
              <h3 className="font-bold text-white text-base">Recent Match Form</h3>
              <div className="flex items-center gap-2 pt-2">
                {teamStats?.recentForm && teamStats.recentForm.length > 0 ? (
                  teamStats.recentForm.map((result: string, idx: number) => (
                    <span
                      key={idx}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm border shadow ${
                        result === 'W'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : result === 'L'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-slate-700/30 text-slate-400 border-slate-700'
                      }`}
                    >
                      {result}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No match records yet.</span>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 1: ACTIVE SQUAD */}
      {activeTab === 'squad' && (
        <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <th className="pb-3">Player</th>
                  <th className="pb-3">Role / Specialty</th>
                  <th className="pb-3">Batting</th>
                  <th className="pb-3">Bowling</th>
                  <th className="pb-3 text-center">Jersey #</th>
                  <th className="pb-3 text-center">Leadership</th>
                  {canManage && <th className="pb-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium text-slate-200">
                {activeMembers.length > 0 ? (
                  activeMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 font-bold text-white">
                        <span
                          className="cursor-pointer hover:text-emerald-400"
                          onClick={() => navigate(`/players/${m.playerId}`)}
                        >
                          {m.player.firstName} {m.player.lastName}
                        </span>
                      </td>
                      <td className="py-3.5 text-xs text-slate-300">{m.player.playerRole}</td>
                      <td className="py-3.5 text-xs text-slate-400">{m.player.battingStyle}</td>
                      <td className="py-3.5 text-xs text-slate-400">{m.player.bowlingStyle}</td>
                      <td className="py-3.5 text-center font-bold text-slate-300">#{m.jerseyNumber || m.player.jerseyNumber || '—'}</td>
                      <td className="py-3.5 text-center">
                        <div className="flex justify-center space-x-1">
                          {m.isCaptain && <Badge variant="amber">CAPTAIN</Badge>}
                          {m.isViceCaptain && <Badge variant="blue">VICE-CAPTAIN</Badge>}
                          {m.isWicketKeeper && <Badge variant="emerald">KEEPER</Badge>}
                          {!m.isCaptain && !m.isViceCaptain && !m.isWicketKeeper && (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                        </div>
                      </td>
                      {canManage && (
                        <td className="py-3.5 text-right space-x-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMember(m);
                              setIsRoleModalOpen(true);
                            }}
                            className="h-7 text-xs text-slate-300 hover:text-white"
                          >
                            <Crown className="w-3.5 h-3.5 mr-1 text-amber-400" /> Roles
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveMember(m.playerId)}
                            className="h-7 px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No players drafted into this club yet. Click "Draft Player" to populate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: TRANSFER HISTORY */}
      {activeTab === 'history' && squadHistory && (
        <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
          <h3 className="font-bold text-white text-base">Past / Transferred Squad Members</h3>
          {squadHistory.pastMembers.length > 0 ? (
            <div className="space-y-2">
              {squadHistory.pastMembers.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                  <div>
                    <span className="font-bold text-white">{m.player.firstName} {m.player.lastName}</span>
                    <span className="text-slate-400 ml-2">({m.player.playerRole})</span>
                  </div>
                  <div className="text-slate-500">
                    Left: {m.leftAt ? new Date(m.leftAt).toLocaleDateString() : 'Inactive'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No Past Transfers" description="All players ever drafted remain active on the roster." />
          )}
        </Card>
      )}

      {/* Draft Member Modal */}
      <Modal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        title="Draft Player into Squad"
        size="md"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Select Player
            </label>
            <select
              required
              value={newMemberData.playerId}
              onChange={(e) => setNewMemberData({ ...newMemberData, playerId: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Choose a player...</option>
              {availablePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.playerRole})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Squad Jersey #
            </label>
            <input
              type="number"
              value={newMemberData.jerseyNumber}
              onChange={(e) => setNewMemberData({ ...newMemberData, jerseyNumber: Number(e.target.value) })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div className="space-y-2 pt-2">
            <label className="flex items-center space-x-2 text-sm text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={newMemberData.isCaptain}
                onChange={(e) => setNewMemberData({ ...newMemberData, isCaptain: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Assign as Team Captain</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={newMemberData.isViceCaptain}
                onChange={(e) => setNewMemberData({ ...newMemberData, isViceCaptain: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Assign as Vice Captain</span>
            </label>

            <label className="flex items-center space-x-2 text-sm text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={newMemberData.isWicketKeeper}
                onChange={(e) => setNewMemberData({ ...newMemberData, isWicketKeeper: e.target.checked })}
                className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
              />
              <span>Designate as Wicket Keeper</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsAddMemberOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading || !newMemberData.playerId}>
              Confirm Draft
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Roles Modal */}
      {selectedMember && (
        <Modal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          title={`Update Squad Roles: ${selectedMember.player?.firstName} ${selectedMember.player?.lastName}`}
          size="md"
        >
          <form onSubmit={handleUpdateRoles} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Jersey Number
              </label>
              <input
                type="number"
                value={selectedMember.jerseyNumber || ''}
                onChange={(e) => setSelectedMember({ ...selectedMember, jerseyNumber: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center space-x-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMember.isCaptain || false}
                  onChange={(e) => setSelectedMember({ ...selectedMember, isCaptain: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Captain</span>
              </label>

              <label className="flex items-center space-x-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMember.isViceCaptain || false}
                  onChange={(e) => setSelectedMember({ ...selectedMember, isViceCaptain: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Vice Captain</span>
              </label>

              <label className="flex items-center space-x-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedMember.isWicketKeeper || false}
                  onChange={(e) => setSelectedMember({ ...selectedMember, isWicketKeeper: e.target.checked })}
                  className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Wicket Keeper</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setIsRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={actionLoading}>
                Save Roles
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
