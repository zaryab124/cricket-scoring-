import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { playerApi } from '../../api/playerApi.js';
import { analyticsApi, PlayerAnalyticsResponse } from '../../api/analyticsApi.js';
import { Player, PlayerCareerStats, BattingStyle, BowlingStyle, PlayerRoleType } from '../../types/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { ErrorState } from '../../components/feedback/ErrorState.js';
import {
  ArrowLeft,
  UserCheck,
  Shield,
  Award,
  Activity,
  Edit,
  MapPin,
  Calendar,
  Flame,
  Target,
  TrendingUp,
  BarChart2,
} from 'lucide-react';

export const PlayerDetailPage: React.FC = () => {
  const { id: playerId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [player, setPlayer] = useState<(Player & { careerStats?: PlayerCareerStats & { bowling: PlayerCareerStats['bowling'] & { threeWicketHauls?: number } }; recentMatches?: any[] }) | null>(null);
  const [analytics, setAnalytics] = useState<PlayerAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('T20');

  const canEdit =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'TEAM_MANAGER' ||
    (user?.role === 'PLAYER' && player?.userId === user.id);

  const fetchPlayer = useCallback(async () => {
    if (!playerId) return;
    try {
      setLoading(true);
      const [pRes, aRes] = await Promise.all([
        playerApi.getPlayer(playerId),
        analyticsApi.getPlayerAnalytics(playerId).catch(() => ({ data: null })),
      ]);
      if (pRes.data) {
        setPlayer(pRes.data);
        setEditFormData({
          firstName: pRes.data.firstName,
          lastName: pRes.data.lastName,
          jerseyNumber: pRes.data.jerseyNumber,
          battingStyle: pRes.data.battingStyle,
          bowlingStyle: pRes.data.bowlingStyle,
          playerRole: pRes.data.playerRole,
          nationality: pRes.data.nationality,
          bio: pRes.data.bio,
        });
      }
      if (aRes.data) {
        setAnalytics(aRes.data);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load player profile');
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchPlayer();
  }, [fetchPlayer]);

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerId) return;
    setActionLoading(true);
    try {
      await playerApi.updatePlayer(playerId, editFormData);
      setIsEditModalOpen(false);
      await fetchPlayer();
      success('Player profile updated successfully');
    } catch (err: any) {
      toastError(err.message || 'Failed to update player');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <LoadingState message="Loading player profile and statistics..." />;
  if (error || !player) {
    return <ErrorState title="Player Error" message={error || 'Player not found'} onRetry={fetchPlayer} />;
  }

  const { careerStats } = player;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/players')} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Players
        </Button>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
            <Edit className="w-3.5 h-3.5 mr-1.5" /> Edit Profile
          </Button>
        )}
      </div>

      {/* Player Hero Card */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center font-black text-3xl text-emerald-400 shadow-xl">
            {player.firstName[0]}
            {player.lastName[0]}
          </div>

          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl md:text-3xl font-black text-white">
                {player.firstName} {player.lastName}
              </h1>
              {player.jerseyNumber && (
                <span className="text-sm font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-800/50 px-2.5 py-0.5 rounded-full">
                  #{player.jerseyNumber}
                </span>
              )}
              {player.isVerified && <Badge variant="emerald">VERIFIED PRO</Badge>}
            </div>

            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              {player.bio || 'Professional cricketer active on the Cricket Master network.'}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2 text-xs font-semibold text-slate-300">
              <span className="flex items-center"><Shield className="w-3.5 h-3.5 mr-1 text-emerald-400" /> {player.playerRole}</span>
              <span>•</span>
              <span>Batting: <span className="text-white font-bold">{player.battingStyle}</span></span>
              <span>•</span>
              <span>Bowling: <span className="text-white font-bold">{player.bowlingStyle}</span></span>
              {player.nationality && (
                <>
                  <span>•</span>
                  <span>Nationality: <span className="text-white font-bold">{player.nationality}</span></span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Career Statistics */}
      {careerStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Batting Career Stats */}
          <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center">
                <Flame className="w-4 h-4 text-emerald-400 mr-2" /> Batting Career Stats
              </h3>
              <Badge variant="emerald">{careerStats.batting.innings} Innings</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Runs</div>
                <div className="text-2xl font-black text-white">{careerStats.batting.runs}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Average</div>
                <div className="text-2xl font-black text-emerald-400">{careerStats.batting.average}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Strike Rate</div>
                <div className="text-2xl font-black text-white">{careerStats.batting.strikeRate}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">High Score</div>
                <div className="text-2xl font-black text-white">{careerStats.batting.highScore}</div>
              </div>
            </div>

            <div className="flex justify-between text-xs font-semibold text-slate-300 pt-2 border-t border-slate-800 px-1">
              <span>50s: <span className="text-white font-bold">{careerStats.batting.fifties}</span></span>
              <span>100s: <span className="text-white font-bold">{careerStats.batting.hundreds}</span></span>
              <span>4s: <span className="text-white font-bold">{careerStats.batting.fours}</span></span>
              <span>6s: <span className="text-white font-bold">{careerStats.batting.sixes}</span></span>
            </div>
          </Card>

          {/* Bowling Career Stats */}
          <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center">
                <Target className="w-4 h-4 text-emerald-400 mr-2" /> Bowling Career Stats
              </h3>
              <Badge variant="blue">{careerStats.bowling.innings} Innings</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Wickets</div>
                <div className="text-2xl font-black text-emerald-400">{careerStats.bowling.wickets}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Economy</div>
                <div className="text-2xl font-black text-white">{careerStats.bowling.economy}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Overs Bowled</div>
                <div className="text-2xl font-black text-white">{careerStats.bowling.overs}</div>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase">Best Bowling</div>
                <div className="text-xl font-black text-white">{careerStats.bowling.bestBowling}</div>
              </div>
            </div>

            <div className="flex justify-between text-xs font-semibold text-slate-300 pt-2 border-t border-slate-800 px-1">
              <span>Runs Conceded: <span className="text-white font-bold">{careerStats.bowling.runs}</span></span>
              <span>3W: <span className="text-white font-bold">{careerStats.bowling.threeWicketHauls || 0}</span></span>
              <span>5W: <span className="text-white font-bold">{careerStats.bowling.fiveWicketHauls}</span></span>
            </div>
          </Card>

          {/* Fielding & Teams Card */}
          <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center">
                <Award className="w-4 h-4 text-emerald-400 mr-2" /> Fielding & Club Roster
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Catches</div>
                <div className="text-xl font-bold text-white">{careerStats.fielding.catches}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Run Outs</div>
                <div className="text-xl font-bold text-white">{careerStats.fielding.runOuts}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Stumpings</div>
                <div className="text-xl font-bold text-white">{careerStats.fielding.stumpings}</div>
              </div>
            </div>

            {/* Current Team Memberships */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Club Teams:</div>
              {player.teamMemberships && player.teamMemberships.length > 0 ? (
                <div className="space-y-2">
                  {player.teamMemberships.map((tm) => (
                    <div
                      key={tm.id}
                      onClick={() => navigate(`/teams/${tm.teamId}`)}
                      className="flex items-center justify-between p-2.5 bg-slate-950/70 hover:bg-slate-800/50 border border-slate-800 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="font-semibold text-sm text-white">{tm.team?.name || 'Club'}</div>
                      <Badge variant={tm.isCaptain ? 'amber' : 'blue'}>{tm.role}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Not currently assigned to any club roster.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Format-Specific Analytics & Recent Match Form */}
      {analytics && (
        <div className="space-y-6">
          {/* Format Splits */}
          <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center">
                <BarChart2 className="w-4 h-4 text-emerald-400 mr-2" /> Format-Specific Performance Splits
              </h3>
              <div className="flex gap-1.5">
                {['T20', 'ODI', 'TEST'].map((fmt) => (
                  <Button
                    key={fmt}
                    size="sm"
                    variant={selectedFormat === fmt ? 'primary' : 'ghost'}
                    onClick={() => setSelectedFormat(fmt)}
                    className="text-xs"
                  >
                    {fmt}
                  </Button>
                ))}
              </div>
            </div>

            {analytics.formatBreakdown[selectedFormat] ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Batting Split */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-sm">Batting ({selectedFormat})</span>
                    <Badge variant="emerald">{analytics.formatBreakdown[selectedFormat].batting.innings} Inn</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Runs</div>
                      <div className="font-bold text-white">{analytics.formatBreakdown[selectedFormat].batting.runs}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Average</div>
                      <div className="font-bold text-emerald-400">{analytics.formatBreakdown[selectedFormat].batting.average}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">SR</div>
                      <div className="font-bold text-white">{analytics.formatBreakdown[selectedFormat].batting.strikeRate}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">High</div>
                      <div className="font-bold text-white">{analytics.formatBreakdown[selectedFormat].batting.highScore}</div>
                    </div>
                  </div>
                </div>

                {/* Bowling Split */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-sm">Bowling ({selectedFormat})</span>
                    <Badge variant="blue">{analytics.formatBreakdown[selectedFormat].bowling.innings} Inn</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Overs</div>
                      <div className="font-bold text-white">{analytics.formatBreakdown[selectedFormat].bowling.overs}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Wickets</div>
                      <div className="font-bold text-blue-400">{analytics.formatBreakdown[selectedFormat].bowling.wickets}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Economy</div>
                      <div className="font-bold text-white">{analytics.formatBreakdown[selectedFormat].bowling.economy}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 uppercase">Average</div>
                      <div className="font-bold text-white">{analytics.formatBreakdown[selectedFormat].bowling.average}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No data available for {selectedFormat}.</p>
            )}
          </Card>

          {/* Recent Match Form Table */}
          {analytics.recentBatting.length > 0 && (
            <Card className="bg-slate-900 border-slate-800 overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h3 className="font-bold text-white text-sm flex items-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mr-2" /> Recent Match Performance Trend
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Opponent</th>
                      <th className="px-4 py-2.5">Format</th>
                      <th className="px-4 py-2.5 text-right">Runs (Balls)</th>
                      <th className="px-4 py-2.5 text-right">SR</th>
                      <th className="px-4 py-2.5 text-right">4s / 6s</th>
                      <th className="px-4 py-2.5">Dismissal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {analytics.recentBatting.map((m, idx) => (
                      <tr
                        key={idx}
                        onClick={() => navigate(`/matches/${m.matchId}`)}
                        className="hover:bg-slate-800/40 cursor-pointer"
                      >
                        <td className="px-4 py-2 text-slate-400">{new Date(m.matchDate).toLocaleDateString()}</td>
                        <td className="px-4 py-2 font-bold text-white">{m.opponent}</td>
                        <td className="px-4 py-2">
                          <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] font-semibold text-slate-300">{m.format}</span>
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-emerald-400">
                          {m.runs} <span className="text-slate-400 font-normal">({m.balls})</span>
                        </td>
                        <td className="px-4 py-2 text-right text-white font-medium">{m.strikeRate.toFixed(1)}</td>
                        <td className="px-4 py-2 text-right text-slate-300">{m.fours} / {m.sixes}</td>
                        <td className="px-4 py-2 text-slate-400">{m.dismissal || 'not out'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Edit Player Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Player Profile"
        size="lg"
      >
        <form onSubmit={handleUpdatePlayer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                First Name
              </label>
              <input
                required
                value={editFormData.firstName || ''}
                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Last Name
              </label>
              <input
                required
                value={editFormData.lastName || ''}
                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Jersey #
              </label>
              <input
                type="number"
                value={editFormData.jerseyNumber || ''}
                onChange={(e) => setEditFormData({ ...editFormData, jerseyNumber: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Batting Style
              </label>
              <select
                value={editFormData.battingStyle || 'RIGHT_HAND'}
                onChange={(e) => setEditFormData({ ...editFormData, battingStyle: e.target.value as BattingStyle })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="RIGHT_HAND">Right Hand</option>
                <option value="LEFT_HAND">Left Hand</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Player Role
              </label>
              <select
                value={editFormData.playerRole || 'ALL_ROUNDER'}
                onChange={(e) => setEditFormData({ ...editFormData, playerRole: e.target.value as PlayerRoleType })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="TOP_ORDER_BATTER">Top Order Batter</option>
                <option value="MIDDLE_ORDER_BATTER">Middle Order Batter</option>
                <option value="WICKET_KEEPER_BATTER">Wicket Keeper Batter</option>
                <option value="ALL_ROUNDER">All Rounder</option>
                <option value="BOWLING_ALL_ROUNDER">Bowling All Rounder</option>
                <option value="FAST_BOWLER">Fast Bowler</option>
                <option value="SPIN_BOWLER">Spin Bowler</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Bio / Description
            </label>
            <textarea
              rows={3}
              value={editFormData.bio || ''}
              onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
