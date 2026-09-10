import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scoringApi } from '../../api/scoringApi.js';
import { matchApi } from '../../api/matchApi.js';
import { analyticsApi, MatchAnalyticsResponse } from '../../api/analyticsApi.js';
import { MatchScorecardData, MatchSquadsData } from '../../types/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { ErrorState } from '../../components/feedback/ErrorState.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import {
  Activity,
  Award,
  Users,
  MessageSquare,
  BarChart3,
  Shield,
  ArrowLeft,
  Calendar,
  MapPin,
  RefreshCw,
  Trophy,
  Flame,
  Clock,
  PlayCircle,
  TrendingUp,
} from 'lucide-react';

export const MatchDetailPage: React.FC = () => {
  const { id: matchId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scorecard, setScorecard] = useState<MatchScorecardData | null>(null);
  const [squads, setSquads] = useState<MatchSquadsData | null>(null);
  const [analytics, setAnalytics] = useState<MatchAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'scorecard' | 'analytics' | 'commentary' | 'squads'>('summary');
  const [selectedInningsIndex, setSelectedInningsIndex] = useState<number>(0);
  const [commentaryFilter, setCommentaryFilter] = useState<'ALL' | 'BOUNDARIES' | 'WICKETS'>('ALL');

  const isScorerOrAdmin =
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'SCORER' ||
    user?.role === 'TOURNAMENT_ADMIN' ||
    user?.role === 'LEAGUE_ADMIN';

  const fetchData = useCallback(async () => {
    if (!matchId) return;
    try {
      const [scRes, sqRes, anRes] = await Promise.all([
        scoringApi.getMatchScorecard(matchId),
        matchApi.getMatchSquads(matchId).catch(() => ({ data: null })),
        analyticsApi.getMatchAnalytics(matchId).catch(() => ({ data: null })),
      ]);
      if (scRes.data) {
        setScorecard(scRes.data);
        if (scRes.data.innings.length > 0) {
          setSelectedInningsIndex(scRes.data.innings.length - 1);
        }
      }
      if (sqRes.data) setSquads(sqRes.data);
      if (anRes.data) setAnalytics(anRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch match details');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // Initial Fetch & SSE Live Stream
  useEffect(() => {
    fetchData();

    if (!matchId) return;

    // Connect to Server-Sent Events (SSE) stream for live updates
    const streamUrl = `/api/v1/scoring/${matchId}/live-stream`;
    const eventSource = new EventSource(streamUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'INITIAL_STATE' || payload.type === 'BALL_RECORDED' || payload.type === 'BALL_UNDONE' || payload.type === 'INNINGS_COMPLETED' || payload.type === 'MATCH_CONCLUDED') {
          fetchData();
        }
      } catch {
        // Heartbeat or malformed payload
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [matchId, fetchData]);

  if (loading) return <LoadingState message="Loading live match center..." />;
  if (error || !scorecard) {
    return <ErrorState title="Match Center Error" message={error || 'Match not found'} onRetry={fetchData} />;
  }

  const { match, innings, currentInnings, commentary } = scorecard;
  const activeInnings = innings[selectedInningsIndex] || currentInnings || innings[0];

  const filteredCommentary = commentary.filter((c) => {
    if (commentaryFilter === 'BOUNDARIES') return c.isBoundary;
    if (commentaryFilter === 'WICKETS') return c.isWicket;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/matches')} className="text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Fixtures
        </Button>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
          {isScorerOrAdmin && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/matches/${match.id}/score`)}
              className="bg-emerald-600 hover:bg-emerald-500 shadow-md"
            >
              <PlayCircle className="w-4 h-4 mr-1.5" /> Scorer Keypad
            </Button>
          )}
        </div>
      </div>

      {/* Match Hero Live Header Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border border-slate-700/80 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Info Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
            <span className="text-white font-bold">{match.title}</span>
            <span>•</span>
            <span>{match.format} ({match.oversLimit} Overs)</span>
            <span>•</span>
            <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" /> {match.venue}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant={match.status === 'LIVE' ? 'emerald' : match.status === 'COMPLETED' ? 'blue' : 'amber'}>
              {match.status}
            </Badge>
          </div>
        </div>

        {/* Main Teams & Score Center */}
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-6 text-center md:text-left">
          {/* Home Team */}
          <div className="flex flex-col md:flex-row items-center space-y-3 md:space-y-0 md:space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xl text-white shadow-inner">
              {match.homeTeam.shortName}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{match.homeTeam.name}</h2>
              {innings.find((i) => i.battingTeam.id === match.homeTeam.id) && (
                <div className="text-2xl font-black text-emerald-400 mt-0.5">
                  {innings.find((i) => i.battingTeam.id === match.homeTeam.id)?.totalRuns}/
                  {innings.find((i) => i.battingTeam.id === match.homeTeam.id)?.wickets}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    ({innings.find((i) => i.battingTeam.id === match.homeTeam.id)?.oversFormatted} ov)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Center Status / Equation */}
          <div className="text-center">
            {match.status === 'COMPLETED' ? (
              <div className="bg-emerald-950/40 border border-emerald-800/40 px-4 py-2 rounded-xl inline-block">
                <Trophy className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <div className="text-xs font-bold text-white">{match.resultSummary || 'Match Completed'}</div>
              </div>
            ) : match.status === 'LIVE' && currentInnings ? (
              <div className="bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-xl inline-block">
                <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-rose-400 animate-pulse uppercase tracking-wider mb-1">
                  <Flame className="w-3.5 h-3.5" /> Live Match
                </div>
                <div className="text-sm font-bold text-white">
                  CRR: <span className="text-emerald-400">{currentInnings.currentRunRate.toFixed(2)}</span>
                  {currentInnings.requiredRunRate && (
                    <span className="text-amber-400 ml-2">RRR: {currentInnings.requiredRunRate.toFixed(2)}</span>
                  )}
                </div>
                {currentInnings.targetRuns && currentInnings.requiredRuns !== null && (
                  <div className="text-xs text-slate-300 mt-1">
                    Need <span className="text-white font-bold">{currentInnings.requiredRuns}</span> runs in{' '}
                    <span className="text-white font-bold">{currentInnings.remainingBalls}</span> balls
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-slate-400 font-medium">
                {match.resultSummary || 'Scheduled to begin'}
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col md:flex-row-reverse items-center space-y-3 md:space-y-0 md:space-x-4 md:space-x-reverse text-center md:text-right">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-xl text-white shadow-inner">
              {match.awayTeam.shortName}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{match.awayTeam.name}</h2>
              {innings.find((i) => i.battingTeam.id === match.awayTeam.id) && (
                <div className="text-2xl font-black text-emerald-400 mt-0.5">
                  {innings.find((i) => i.battingTeam.id === match.awayTeam.id)?.totalRuns}/
                  {innings.find((i) => i.battingTeam.id === match.awayTeam.id)?.wickets}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    ({innings.find((i) => i.battingTeam.id === match.awayTeam.id)?.oversFormatted} ov)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'summary'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Center</span>
        </button>

        <button
          onClick={() => setActiveTab('scorecard')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'scorecard'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Full Scorecard</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'analytics'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics & Comparisons</span>
        </button>

        <button
          onClick={() => setActiveTab('commentary')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'commentary'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Commentary ({commentary.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('squads')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 flex items-center space-x-2 ${
            activeTab === 'squads'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Playing XI & Squads</span>
        </button>
      </div>

      {/* TAB 1: SUMMARY / LIVE CENTER */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {currentInnings ? (
            <>
              {/* Live Over Delivery Strip */}
              {currentInnings.recentBalls && currentInnings.recentBalls.length > 0 && (
                <Card className="bg-slate-900 border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                      <Flame className="w-3.5 h-3.5 text-rose-400 mr-1.5" /> Recent Deliveries
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {currentInnings.battingTeam.name} ({currentInnings.oversFormatted} ov)
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {currentInnings.recentBalls.map((b, idx) => {
                      let bgClass = 'bg-slate-800 text-slate-300 border-slate-700';
                      if (b.isWicket) bgClass = 'bg-rose-950 text-rose-300 border-rose-800 font-black';
                      else if (b.text === '4') bgClass = 'bg-blue-950 text-blue-300 border-blue-800 font-bold';
                      else if (b.text === '6') bgClass = 'bg-emerald-950 text-emerald-300 border-emerald-800 font-black';
                      else if (b.text.includes('Wd') || b.text.includes('Nb')) bgClass = 'bg-amber-950 text-amber-300 border-amber-800 font-bold';

                      return (
                        <div
                          key={idx}
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs shadow-md transition-all ${bgClass}`}
                        >
                          {b.text}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}

              {/* Active Batsmen & Bowler Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Batsmen */}
                <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center">
                    <Flame className="w-4 h-4 text-emerald-400 mr-2" /> Current Batters
                  </h3>
                  <div className="space-y-3">
                    {currentInnings.currentStriker && (
                      <div className="flex items-center justify-between p-3 bg-slate-950/80 border border-emerald-800/40 rounded-xl">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <div>
                            <div className="font-bold text-sm text-white flex items-center">
                              {currentInnings.currentStriker.name}
                              <span className="text-xs text-emerald-400 ml-1.5 font-extrabold">*</span>
                            </div>
                            <div className="text-xs text-slate-400">On Strike</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-white">
                            {currentInnings.currentStriker.runs}{' '}
                            <span className="text-xs font-normal text-slate-400">({currentInnings.currentStriker.balls}b)</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            SR:{' '}
                            {currentInnings.currentStriker.balls > 0
                              ? ((currentInnings.currentStriker.runs / currentInnings.currentStriker.balls) * 100).toFixed(1)
                              : '0.0'}
                          </div>
                        </div>
                      </div>
                    )}

                    {currentInnings.currentNonStriker && (
                      <div className="flex items-center justify-between p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                        <div>
                          <div className="font-semibold text-sm text-white">{currentInnings.currentNonStriker.name}</div>
                          <div className="text-xs text-slate-400">Non-Striker</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-white">
                            {currentInnings.currentNonStriker.runs}{' '}
                            <span className="text-xs font-normal text-slate-400">({currentInnings.currentNonStriker.balls}b)</span>
                          </div>
                          <div className="text-xs text-slate-400">
                            SR:{' '}
                            {currentInnings.currentNonStriker.balls > 0
                              ? ((currentInnings.currentNonStriker.runs / currentInnings.currentNonStriker.balls) * 100).toFixed(1)
                              : '0.0'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Active Bowler */}
                <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center">
                    <Shield className="w-4 h-4 text-emerald-400 mr-2" /> Current Bowler
                  </h3>
                  {currentInnings.currentBowler ? (
                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-base text-white">{currentInnings.currentBowler.name}</div>
                        <Badge variant="blue">Bowling</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase">Overs</div>
                          <div className="text-lg font-bold text-white">{currentInnings.currentBowler.overs}</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase">Runs</div>
                          <div className="text-lg font-bold text-white">{currentInnings.currentBowler.runs}</div>
                        </div>
                        <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-slate-400 uppercase">Wickets</div>
                          <div className="text-lg font-bold text-emerald-400">{currentInnings.currentBowler.wickets}</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 py-4">No active bowler currently assigned.</p>
                  )}
                </Card>
              </div>
            </>
          ) : (
            <Card className="p-8 text-center bg-slate-900 border-slate-800 space-y-3">
              <Clock className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-lg font-bold text-white">Match Scheduled</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                {match.resultSummary || 'The match has not started yet. Toss and innings will appear here live once scoring begins.'}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* TAB 2: FULL SCORECARD */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6">
          {innings.length > 0 ? (
            <>
              {/* Innings Selector Tabs */}
              <div className="flex space-x-2">
                {innings.map((inn, idx) => (
                  <Button
                    key={inn.id}
                    variant={selectedInningsIndex === idx ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedInningsIndex(idx)}
                  >
                    {inn.battingTeam.shortName} Innings ({inn.totalRuns}/{inn.wickets})
                  </Button>
                ))}
              </div>

              {/* Batting Scorecard Table */}
              <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-white text-base">
                    {activeInnings.battingTeam.name} Batting ({activeInnings.totalRuns}/{activeInnings.wickets} in {activeInnings.oversFormatted} ov)
                  </h3>
                  <span className="text-xs text-slate-400">Extras: {activeInnings.extras.total}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="px-6 py-3">Batter</th>
                        <th className="px-6 py-3">Dismissal</th>
                        <th className="px-4 py-3 text-right">R</th>
                        <th className="px-4 py-3 text-right">B</th>
                        <th className="px-4 py-3 text-right">4s</th>
                        <th className="px-4 py-3 text-right">6s</th>
                        <th className="px-4 py-3 text-right">SR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                      {activeInnings.batting.map((b) => (
                        <tr key={b.playerId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-3.5 font-bold text-white flex items-center">
                            {b.name}
                            {b.isOnStrike && <span className="text-xs text-emerald-400 ml-1 font-bold">*</span>}
                          </td>
                          <td className="px-6 py-3.5 text-xs text-slate-400">{b.dismissalText}</td>
                          <td className="px-4 py-3.5 text-right font-black text-white">{b.runs}</td>
                          <td className="px-4 py-3.5 text-right text-slate-400">{b.balls}</td>
                          <td className="px-4 py-3.5 text-right text-slate-400">{b.fours}</td>
                          <td className="px-4 py-3.5 text-right text-slate-400">{b.sixes}</td>
                          <td className="px-4 py-3.5 text-right text-emerald-400 font-semibold">{b.strikeRate.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Bowling Scorecard Table */}
              <Card className="bg-slate-900 border-slate-800 overflow-hidden">
                <div className="p-4 bg-slate-950 border-b border-slate-800">
                  <h3 className="font-bold text-white text-base">{activeInnings.bowlingTeam.name} Bowling</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                      <tr>
                        <th className="px-6 py-3">Bowler</th>
                        <th className="px-4 py-3 text-right">O</th>
                        <th className="px-4 py-3 text-right">M</th>
                        <th className="px-4 py-3 text-right">R</th>
                        <th className="px-4 py-3 text-right">W</th>
                        <th className="px-4 py-3 text-right">Econ</th>
                        <th className="px-4 py-3 text-right">Dots</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                      {activeInnings.bowling.map((b) => (
                        <tr key={b.playerId} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-3.5 font-bold text-white">{b.name}</td>
                          <td className="px-4 py-3.5 text-right text-slate-300">{b.overs}</td>
                          <td className="px-4 py-3.5 text-right text-slate-400">{b.maidens}</td>
                          <td className="px-4 py-3.5 text-right text-slate-300">{b.runs}</td>
                          <td className="px-4 py-3.5 text-right font-black text-emerald-400">{b.wickets}</td>
                          <td className="px-4 py-3.5 text-right text-slate-300">{b.economy.toFixed(2)}</td>
                          <td className="px-4 py-3.5 text-right text-slate-400">{b.dots}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <EmptyState title="No Scorecard Available" description="No innings have been recorded yet for this fixture." />
          )}
        </div>
      )}

      {/* TAB 3: ANALYTICS & COMPARISONS */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Team Head-to-Head Comparison Card */}
          <Card className="bg-slate-900 border-slate-800 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center">
                <BarChart3 className="w-4 h-4 text-emerald-400 mr-2" /> Match Comparisons & Performance Metrics
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analytics.teamComparison.innings.map((inn) => (
                <div key={inn.inningsNumber} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="font-bold text-white">{inn.teamName} (Inn {inn.inningsNumber})</span>
                    <span className="text-xl font-black text-emerald-400">{inn.runs}/{inn.wickets} ({inn.overs} ov)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400 uppercase text-[10px]">Run Rate</span>
                      <div className="font-bold text-white text-sm">{inn.runRate.toFixed(2)}</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400 uppercase text-[10px]">Boundaries</span>
                      <div className="font-bold text-white text-sm">{inn.fours} 4s / {inn.sixes} 6s</div>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                      <span className="text-slate-400 uppercase text-[10px]">Dot Balls</span>
                      <div className="font-bold text-white text-sm">{inn.dots}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Over-by-Over Progression Breakdown */}
          {analytics.inningsAnalytics.map((ia) => (
            <Card key={ia.inningsNumber} className="bg-slate-900 border-slate-800 overflow-hidden">
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                <h4 className="font-bold text-white text-sm flex items-center">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mr-2" />
                  Over-by-Over Scoring Progression: {ia.battingTeam.name}
                </h4>
                <Badge variant="emerald">{ia.totalRuns}/{ia.wickets}</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/60 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2.5 text-center">Over</th>
                      <th className="px-4 py-2.5">Bowler</th>
                      <th className="px-4 py-2.5 text-center">Runs in Over</th>
                      <th className="px-4 py-2.5 text-center">Wickets</th>
                      <th className="px-4 py-2.5 text-center">Cumulative Score</th>
                      <th className="px-4 py-2.5">Deliveries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {ia.oversProgression.map((ov) => (
                      <tr key={ov.overNumber} className="hover:bg-slate-800/40">
                        <td className="px-4 py-2 text-center font-bold text-white">Ov {ov.overNumber}</td>
                        <td className="px-4 py-2 text-slate-200">{ov.bowlerName}</td>
                        <td className="px-4 py-2 text-center font-bold text-emerald-400">+{ov.runsInOver}</td>
                        <td className="px-4 py-2 text-center text-rose-400 font-bold">{ov.wicketsInOver || '—'}</td>
                        <td className="px-4 py-2 text-center font-black text-white">{ov.cumulativeRuns}/{ov.cumulativeWickets}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            {ov.deliveries.map((d, dIdx) => (
                              <span
                                key={dIdx}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  d.isWicket
                                    ? 'bg-rose-900/80 text-rose-200'
                                    : d.isBoundarySix
                                    ? 'bg-emerald-900/80 text-emerald-200'
                                    : d.isBoundaryFour
                                    ? 'bg-blue-900/80 text-blue-200'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {d.isWicket ? 'W' : d.runsScored + d.extraRuns}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 4: BALL COMMENTARY */}
      {activeTab === 'commentary' && (
        <Card className="bg-slate-900 border-slate-800 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold text-white flex items-center">
              <MessageSquare className="w-4 h-4 text-emerald-400 mr-2" /> Live Ball-by-Ball Commentary
            </h3>
            <div className="flex space-x-1.5">
              {(['ALL', 'BOUNDARIES', 'WICKETS'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCommentaryFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    commentaryFilter === filter
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 divide-y divide-slate-800/60">
            {filteredCommentary.length > 0 ? (
              filteredCommentary.map((c) => (
                <div key={c.id} className="pt-3 flex items-start space-x-3">
                  <div className="font-black text-xs px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400">
                    {c.overNumber}.{c.ballNumber}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-sm">{c.bowlerName} to {c.batsmanName}</span>
                      {c.isWicket && <Badge variant="red">WICKET</Badge>}
                      {c.isBoundary && <Badge variant="blue">BOUNDARY</Badge>}
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{c.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 py-8">No commentary matching selected filter.</p>
            )}
          </div>
        </Card>
      )}

      {/* TAB 5: PLAYING XI & SQUADS */}
      {activeTab === 'squads' && squads && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Home Team Squad */}
          <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">{squads.homeTeam.team.name} Playing XI</h3>
              <Badge variant="blue">11 Selected</Badge>
            </div>
            <div className="space-y-2">
              {squads.homeTeam.playingXI.map((m, idx) => (
                <div
                  key={m.playerId}
                  onClick={() => navigate(`/players/${m.playerId}`)}
                  className="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-800/50 border border-slate-800/80 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-slate-500 w-5">{idx + 1}.</span>
                    <div>
                      <div className="font-semibold text-sm text-white flex items-center space-x-1.5">
                        <span>{m.player.firstName} {m.player.lastName}</span>
                        {m.isCaptain && <Badge variant="amber">C</Badge>}
                        {m.isViceCaptain && <Badge variant="blue">VC</Badge>}
                        {m.isWicketKeeper && <Badge variant="emerald">WK</Badge>}
                      </div>
                      <div className="text-xs text-slate-400">{m.player.playerRole}</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">#{m.player.jerseyNumber || '—'}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Away Team Squad */}
          <Card className="bg-slate-900 border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">{squads.awayTeam.team.name} Playing XI</h3>
              <Badge variant="blue">11 Selected</Badge>
            </div>
            <div className="space-y-2">
              {squads.awayTeam.playingXI.map((m, idx) => (
                <div
                  key={m.playerId}
                  onClick={() => navigate(`/players/${m.playerId}`)}
                  className="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-800/50 border border-slate-800/80 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-slate-500 w-5">{idx + 1}.</span>
                    <div>
                      <div className="font-semibold text-sm text-white flex items-center space-x-1.5">
                        <span>{m.player.firstName} {m.player.lastName}</span>
                        {m.isCaptain && <Badge variant="amber">C</Badge>}
                        {m.isViceCaptain && <Badge variant="blue">VC</Badge>}
                        {m.isWicketKeeper && <Badge variant="emerald">WK</Badge>}
                      </div>
                      <div className="text-xs text-slate-400">{m.player.playerRole}</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">#{m.player.jerseyNumber || '—'}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
