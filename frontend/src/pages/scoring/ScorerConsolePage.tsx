import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scoringApi, StartInningsPayload, RecordBallPayload } from '../../api/scoringApi.js';
import { matchApi } from '../../api/matchApi.js';
import {
  MatchScorecardData,
  MatchSquadsData,
  WicketType,
  ExtraType,
  BattingScorecardEntry,
  BowlingScorecardEntry,
} from '../../types/index.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { ErrorState } from '../../components/feedback/ErrorState.js';
import { useToast } from '../../hooks/useToast.js';
import {
  Activity,
  RotateCcw,
  Award,
  ArrowLeft,
  Play,
  CheckCircle2,
  RefreshCw,
  Trophy,
  Sparkles,
  Flame,
  AlertTriangle,
} from 'lucide-react';

export const ScorerConsolePage: React.FC = () => {
  const { id: matchId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: toastError, info } = useToast();

  const [scorecard, setScorecard] = useState<MatchScorecardData | null>(null);
  const [squads, setSquads] = useState<MatchSquadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  // Modals state
  const [showStartInningsModal, setShowStartInningsModal] = useState(false);
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showBowlerModal, setShowBowlerModal] = useState(false);
  const [showCompleteInningsModal, setShowCompleteInningsModal] = useState(false);
  const [isDeclaredInnings, setIsDeclaredInnings] = useState(false);

  // Start Innings Form
  const [startInnData, setStartInnData] = useState<Partial<StartInningsPayload>>({
    inningsNumber: 1,
    strikerId: '',
    nonStrikerId: '',
    bowlerId: '',
  });

  // Wicket Form
  const [wicketData, setWicketData] = useState<{
    wicketType: WicketType;
    dismissedPlayerId: string;
    fielderId: string;
    newBatsmanId: string;
    runsScored: number;
  }>({
    wicketType: 'CAUGHT',
    dismissedPlayerId: '',
    fielderId: '',
    newBatsmanId: '',
    runsScored: 0,
  });

  // Change Bowler Form
  const [selectedBowlerId, setSelectedBowlerId] = useState('');

  // Fetch Scorecard & Squads
  const fetchMatchData = useCallback(async () => {
    if (!matchId) return;
    try {
      const [scRes, sqRes] = await Promise.all([
        scoringApi.getMatchScorecard(matchId),
        matchApi.getMatchSquads(matchId),
      ]);
      if (scRes.data) setScorecard(scRes.data);
      if (sqRes.data) setSquads(sqRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load match console data');
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  // Initial Load + Auto Sync Polling
  useEffect(() => {
    fetchMatchData();
    const interval = setInterval(fetchMatchData, 5000);
    return () => clearInterval(interval);
  }, [fetchMatchData]);

  // SSE Live Event Stream Connection
  useEffect(() => {
    if (!matchId) return;
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/v1/scoring/${matchId}/live-stream`);
      eventSource.onopen = () => {
        setSseConnected(true);
      };
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && (data.event || data.type)) {
            // Re-fetch match data on live events from server
            fetchMatchData();
          }
        } catch {
          // Heartbeat / ping
        }
      };
      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch {
      setSseConnected(false);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [matchId, fetchMatchData]);

  if (loading) return <LoadingState message="Loading live scorer console..." />;
  if (error || !scorecard) {
    return <ErrorState title="Console Error" message={error || 'Match not found'} onRetry={fetchMatchData} />;
  }

  const { match, currentInnings, innings } = scorecard;
  const isMatchCompleted = match.status === 'COMPLETED';
  const battingTeamId = currentInnings?.battingTeam?.id;
  const isHomeBatting = battingTeamId === match.homeTeam.id;

  const battingSquad = isHomeBatting ? squads?.homeTeam?.playingXI || [] : squads?.awayTeam?.playingXI || [];
  const bowlingSquad = isHomeBatting ? squads?.awayTeam?.playingXI || [] : squads?.homeTeam?.playingXI || [];

  // Identify remaining batsmen
  const dismissedPlayerIds = new Set(
    currentInnings?.fallOfWickets?.map((f) => f.playerId) || []
  );
  const activeStrikerId = currentInnings?.currentStriker?.id;
  const activeNonStrikerId = currentInnings?.currentNonStriker?.id;

  const availableNewBatsmen = battingSquad.filter(
    (p) =>
      p.playerId !== activeStrikerId &&
      p.playerId !== activeNonStrikerId &&
      !dismissedPlayerIds.has(p.playerId)
  );

  // Innings 1 Summary helpers
  const inn1 = innings?.[0];
  const inn2 = innings?.[1];
  const isInningsBreak = inn1 && inn1.isCompleted && (!inn2 || !currentInnings || (currentInnings.isCompleted && innings.length === 1));

  // Top performers from Innings 1
  const inn1TopBatsman = inn1?.batting?.reduce<BattingScorecardEntry | undefined>(
    (prev, curr) => (!prev || curr.runs > prev.runs ? curr : prev),
    inn1.batting[0]
  );
  const inn1BestBowler = inn1?.bowling?.reduce<BowlingScorecardEntry | undefined>(
    (prev, curr) => (!prev || curr.wickets > prev.wickets ? curr : prev),
    inn1.bowling[0]
  );

  // Helper: Open Start 2nd Innings Modal
  const openStartSecondInnings = () => {
    if (!inn1) return;
    const secondInnBatting = inn1.bowlingTeam.id;
    const secondInnBowling = inn1.battingTeam.id;
    setStartInnData({
      inningsNumber: 2,
      battingTeamId: secondInnBatting,
      bowlingTeamId: secondInnBowling,
      targetRuns: inn1.totalRuns + 1,
      strikerId: '',
      nonStrikerId: '',
      bowlerId: '',
    });
    setShowStartInningsModal(true);
  };

  // Keypad Actions
  const handleRecordBall = async (runs: number, extraRuns = 0, extraType: ExtraType | null = null) => {
    if (!matchId || isMatchCompleted || actionLoading) return;
    setActionLoading(true);
    try {
      const payload: RecordBallPayload = {
        runsScored: runs,
        extraRuns,
        extraType,
        isWicket: false,
      };
      await scoringApi.recordBall(matchId, payload);
      await fetchMatchData();
      success('Delivery recorded');
    } catch (err: any) {
      toastError(err.message || 'Failed to record ball');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUndo = async () => {
    if (!matchId || actionLoading) return;
    setActionLoading(true);
    try {
      await scoringApi.undoLastBall(matchId);
      await fetchMatchData();
      info('Last delivery undone');
    } catch (err: any) {
      toastError(err.message || 'Failed to undo ball');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitWicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId || isMatchCompleted || actionLoading) return;
    setActionLoading(true);
    try {
      await scoringApi.recordBall(matchId, {
        runsScored: Number(wicketData.runsScored) || 0,
        isWicket: true,
        wicketType: wicketData.wicketType,
        dismissedPlayerId: wicketData.dismissedPlayerId || activeStrikerId,
        fielderId: wicketData.fielderId || null,
        newBatsmanId: wicketData.newBatsmanId || null,
      });
      setShowWicketModal(false);
      await fetchMatchData();
      success('Wicket recorded successfully');
    } catch (err: any) {
      toastError(err.message || 'Failed to record wicket');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeBowler = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId || !selectedBowlerId || actionLoading) return;
    setActionLoading(true);
    try {
      await scoringApi.changeBowler(matchId, selectedBowlerId);
      setShowBowlerModal(false);
      setSelectedBowlerId('');
      await fetchMatchData();
      success('Bowler updated for next over');
    } catch (err: any) {
      toastError(err.message || 'Failed to change bowler');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartInnings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchId || actionLoading) return;
    if (
      !startInnData.battingTeamId ||
      !startInnData.bowlingTeamId ||
      !startInnData.strikerId ||
      !startInnData.nonStrikerId ||
      !startInnData.bowlerId
    ) {
      toastError('Please select both opening batsmen and the opening bowler');
      return;
    }
    if (startInnData.strikerId === startInnData.nonStrikerId) {
      toastError('Striker and Non-Striker must be two different players');
      return;
    }
    setActionLoading(true);
    try {
      await scoringApi.startInnings(matchId, startInnData as StartInningsPayload);
      setShowStartInningsModal(false);
      await fetchMatchData();
      success(`Innings ${startInnData.inningsNumber || 1} initiated successfully!`);
    } catch (err: any) {
      toastError(err.message || 'Failed to start innings');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteInnings = async () => {
    if (!matchId || actionLoading) return;
    setActionLoading(true);
    try {
      await scoringApi.completeInnings(matchId, isDeclaredInnings);
      setShowCompleteInningsModal(false);
      await fetchMatchData();
      success('Innings concluded successfully');
    } catch (err: any) {
      toastError(err.message || 'Failed to complete innings');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/matches/${matchId}`)} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5 mr-1" /> Match Center
          </Button>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                Official Scorer Console
              </span>
              <Badge variant={match.status === 'LIVE' ? 'emerald' : match.status === 'COMPLETED' ? 'blue' : 'amber'}>
                {match.status}
              </Badge>
              {sseConnected && (
                <span className="inline-flex items-center text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  Live Sync
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-white mt-1">
              {match.homeTeam.name} vs {match.awayTeam.name}
            </h1>
            <p className="text-xs text-slate-400">
              {match.venue} • {match.format} ({match.oversLimit} Overs)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={fetchMatchData} disabled={actionLoading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${actionLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          {isMatchCompleted ? (
            <Badge variant="blue" className="px-3 py-1 text-sm font-semibold">
              <Trophy className="w-4 h-4 mr-1 text-amber-400 inline" /> Match Completed
            </Badge>
          ) : !currentInnings || currentInnings.isCompleted ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (scorecard.innings.length === 1) {
                  openStartSecondInnings();
                } else {
                  const nextInnNum = (scorecard.innings.length || 0) + 1;
                  const defaultBatting = nextInnNum === 1 ? match.homeTeam.id : match.awayTeam.id;
                  const defaultBowling = nextInnNum === 1 ? match.awayTeam.id : match.homeTeam.id;
                  setStartInnData({
                    inningsNumber: nextInnNum,
                    battingTeamId: defaultBatting,
                    bowlingTeamId: defaultBowling,
                  });
                  setShowStartInningsModal(true);
                }
              }}
            >
              <Play className="w-4 h-4 mr-1.5" /> Start Innings {scorecard.innings.length + 1}
            </Button>
          ) : (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setIsDeclaredInnings(false);
                setShowCompleteInningsModal(true);
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Conclude Innings
            </Button>
          )}
        </div>
      </div>

      {/* Match Completed Banner */}
      {isMatchCompleted && (
        <Card className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-emerald-500/30 p-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-500/40">
                <Trophy className="w-8 h-8 text-amber-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Match Result</span>
                <h2 className="text-2xl font-black text-white">{match.resultSummary || 'Match Finished'}</h2>
                <p className="text-sm text-slate-300 mt-1">
                  Scoring locked. All official stats and career records have been updated.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="primary" onClick={() => navigate(`/matches/${matchId}`)}>
                View Official Scorecard
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Innings Break Banner */}
      {isInningsBreak && !isMatchCompleted && (
        <Card className="bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border-amber-500/30 p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant="amber">Innings Break</Badge>
                <span className="text-xs text-slate-400">1st Innings Completed</span>
              </div>
              <h2 className="text-xl font-bold text-white">
                {inn1?.battingTeam.name} scored {inn1?.totalRuns}/{inn1?.wickets} ({inn1?.oversFormatted} ov)
              </h2>
              <p className="text-sm text-amber-300 font-semibold">
                Target for {inn1?.bowlingTeam.name}: <span className="text-white font-extrabold text-base">{inn1 ? inn1.totalRuns + 1 : 0}</span> runs from {match.oversLimit} overs
              </p>

              {/* Innings 1 Top Performers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {inn1TopBatsman && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center space-x-3">
                    <Flame className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400">Top Batter</div>
                      <div className="text-sm font-bold text-white">
                        {inn1TopBatsman.name}: {inn1TopBatsman.runs} ({inn1TopBatsman.balls}b)
                      </div>
                    </div>
                  </div>
                )}
                {inn1BestBowler && (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center space-x-3">
                    <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400">Top Bowler</div>
                      <div className="text-sm font-bold text-white">
                        {inn1BestBowler.name}: {inn1BestBowler.wickets}/{inn1BestBowler.runs} ({inn1BestBowler.overs} ov)
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button
                variant="primary"
                size="lg"
                className="w-full md:w-auto shadow-lg shadow-emerald-900/30"
                onClick={openStartSecondInnings}
              >
                <Play className="w-5 h-5 mr-2" /> Start 2nd Innings
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Score & Striker Display Banner */}
      {currentInnings && !currentInnings.isCompleted ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Running Scoreboard Card */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="p-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
                <div>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                    Innings {currentInnings.inningsNumber}
                  </span>
                  <h2 className="text-2xl font-black text-white">{currentInnings.battingTeam.name}</h2>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-extrabold text-white tracking-tight">
                    {currentInnings.totalRuns}
                    <span className="text-emerald-400">/{currentInnings.wickets}</span>
                  </div>
                  <div className="text-xs font-medium text-slate-400 mt-0.5">
                    Overs: <span className="text-white font-semibold">{currentInnings.oversFormatted}</span> / {match.oversLimit}
                  </div>
                </div>
              </div>

              {/* Rate & Target Equation */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 mb-6 text-center">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">Current RR</div>
                  <div className="text-lg font-bold text-emerald-400">{currentInnings.currentRunRate.toFixed(2)}</div>
                </div>
                {currentInnings.targetRuns ? (
                  <>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-400">Target</div>
                      <div className="text-lg font-bold text-white">{currentInnings.targetRuns}</div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-400">Need</div>
                      <div className="text-lg font-bold text-amber-400">
                        {currentInnings.requiredRuns} off {currentInnings.remainingBalls}b
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-400">Req. RR</div>
                      <div className="text-lg font-bold text-amber-400">
                        {currentInnings.requiredRunRate?.toFixed(2) || '—'}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-400">Projected (6 RPO)</div>
                      <div className="text-lg font-bold text-white">
                        {Math.round(currentInnings.totalRuns + (match.oversLimit * 6 - currentInnings.legalBalls) * 1.0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-400">Projected (8 RPO)</div>
                      <div className="text-lg font-bold text-white">
                        {Math.round(currentInnings.totalRuns + (match.oversLimit * 6 - currentInnings.legalBalls) * 1.33)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-slate-400">Extras</div>
                      <div className="text-lg font-bold text-white">{currentInnings.extras.total}</div>
                    </div>
                  </>
                )}
              </div>

              {/* Active Batsmen & Bowler Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Active Batsmen */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Active Batsmen</span>
                    <span className="text-[10px] text-emerald-400 font-bold">★ On Strike</span>
                  </div>

                  {/* Striker */}
                  <div
                    className={`flex items-center justify-between p-2.5 rounded-lg border ${
                      currentInnings.currentStriker
                        ? 'bg-emerald-950/20 border-emerald-800/40'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-emerald-400 font-bold">★</span>
                      <div>
                        <div className="font-semibold text-sm text-white">
                          {currentInnings.currentStriker?.name || 'Not Set'}
                        </div>
                        <div className="text-xs text-slate-400">Striker</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-white">
                        {currentInnings.currentStriker?.runs || 0}{' '}
                        <span className="text-xs text-slate-400 font-normal">
                          ({currentInnings.currentStriker?.balls || 0})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Non-Striker */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                    <div>
                      <div className="font-semibold text-sm text-slate-200">
                        {currentInnings.currentNonStriker?.name || 'Not Set'}
                      </div>
                      <div className="text-xs text-slate-400">Non-Striker</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-slate-200">
                        {currentInnings.currentNonStriker?.runs || 0}{' '}
                        <span className="text-xs text-slate-400 font-normal">
                          ({currentInnings.currentNonStriker?.balls || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Bowler */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      <span>Current Bowler</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowBowlerModal(true)}
                        className="h-6 text-xs text-emerald-400 hover:text-emerald-300 p-0"
                      >
                        Change Bowler
                      </Button>
                    </div>

                    {currentInnings.currentBowler ? (
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <div className="flex justify-between items-center mb-1">
                          <div className="font-bold text-white text-sm">{currentInnings.currentBowler.name}</div>
                          <div className="text-xs font-bold text-emerald-400">
                            {currentInnings.currentBowler.wickets}/{currentInnings.currentBowler.runs}
                          </div>
                        </div>
                        <div className="text-xs text-slate-400">
                          Overs: <span className="text-white font-semibold">{currentInnings.currentBowler.overs}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-800/40 text-center text-xs text-amber-300">
                        Over completed. Please select a new bowler.
                      </div>
                    )}
                  </div>

                  {/* Recent Deliveries in current over */}
                  <div className="mt-3">
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">This Over:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentInnings.recentBalls.slice(-6).map((b, idx) => (
                        <span
                          key={b.id || idx}
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            b.isWicket
                              ? 'bg-rose-600 text-white'
                              : b.runs === 4
                              ? 'bg-blue-600 text-white'
                              : b.runs === 6
                              ? 'bg-purple-600 text-white'
                              : b.text.includes('Wd') || b.text.includes('Nb')
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-800 text-slate-200 border border-slate-700'
                          }`}
                        >
                          {b.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* High-Speed Scorer Keypad */}
          <Card className="bg-slate-900 border-slate-800 p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white">Scoring Keypad</h3>
                </div>
                <Button variant="danger" size="sm" onClick={handleUndo} disabled={actionLoading || isMatchCompleted} className="h-8">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Undo
                </Button>
              </div>

              {/* Main Runs Matrix */}
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {[0, 1, 2, 3, 4, 6].map((runs) => (
                  <button
                    key={runs}
                    disabled={actionLoading || !currentInnings.currentBowler || isMatchCompleted}
                    onClick={() => handleRecordBall(runs)}
                    className={`py-3.5 rounded-xl font-black text-xl transition-all duration-150 transform active:scale-95 shadow-md flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed ${
                      runs === 0
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : runs === 4
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : runs === 6
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <span>{runs}</span>
                    <span className="text-[10px] font-medium opacity-80 uppercase">
                      {runs === 0 ? 'Dot' : runs === 4 ? 'Four' : runs === 6 ? 'Six' : 'Run'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Extras Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  disabled={actionLoading || !currentInnings.currentBowler || isMatchCompleted}
                  onClick={() => handleRecordBall(0, 1, 'WIDE')}
                  className="py-2.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/50 rounded-xl text-amber-300 font-bold text-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +1 Wide (Wd)
                </button>
                <button
                  disabled={actionLoading || !currentInnings.currentBowler || isMatchCompleted}
                  onClick={() => handleRecordBall(0, 1, 'NO_BALL')}
                  className="py-2.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/50 rounded-xl text-amber-300 font-bold text-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +1 No Ball (Nb)
                </button>
                <button
                  disabled={actionLoading || !currentInnings.currentBowler || isMatchCompleted}
                  onClick={() => handleRecordBall(0, 1, 'BYE')}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 font-bold text-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +1 Bye (B)
                </button>
                <button
                  disabled={actionLoading || !currentInnings.currentBowler || isMatchCompleted}
                  onClick={() => handleRecordBall(0, 1, 'LEG_BYE')}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 font-bold text-sm transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +1 Leg Bye (Lb)
                </button>
              </div>
            </div>

            {/* Wicket Action Trigger */}
            <Button
              variant="danger"
              size="lg"
              className="w-full py-4 text-base font-black uppercase tracking-wider shadow-lg bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={actionLoading || !currentInnings.currentBowler || isMatchCompleted}
              onClick={() => {
                setWicketData({
                  wicketType: 'CAUGHT',
                  dismissedPlayerId: activeStrikerId || '',
                  fielderId: '',
                  newBatsmanId: availableNewBatsmen[0]?.playerId || '',
                  runsScored: 0,
                });
                setShowWicketModal(true);
              }}
            >
              ⚡ Wicket / Out
            </Button>
          </Card>
        </div>
      ) : !isInningsBreak && !isMatchCompleted ? (
        <Card className="p-12 text-center bg-slate-900 border-slate-800">
          <Award className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Active Innings</h2>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Match is ready. Start the 1st innings by selecting opening batsmen and bowler.
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => {
              setStartInnData({
                inningsNumber: 1,
                battingTeamId: match.homeTeam.id,
                bowlingTeamId: match.awayTeam.id,
              });
              setShowStartInningsModal(true);
            }}
          >
            <Play className="w-5 h-5 mr-2" /> Start 1st Innings
          </Button>
        </Card>
      ) : null}

      {/* ================= MODALS ================= */}

      {/* 1. Start Innings Modal */}
      <Modal
        isOpen={showStartInningsModal}
        onClose={() => setShowStartInningsModal(false)}
        title={`Start Innings ${startInnData.inningsNumber || 1}`}
        size="lg"
      >
        <form onSubmit={handleStartInnings} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Batting Team
              </label>
              <select
                value={startInnData.battingTeamId}
                onChange={(e) => {
                  const bId = e.target.value;
                  const fId = bId === match.homeTeam.id ? match.awayTeam.id : match.homeTeam.id;
                  setStartInnData((prev) => ({
                    ...prev,
                    battingTeamId: bId,
                    bowlingTeamId: fId,
                    strikerId: '',
                    nonStrikerId: '',
                    bowlerId: '',
                  }));
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
                <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Bowling Team
              </label>
              <input
                disabled
                value={startInnData.bowlingTeamId === match.homeTeam.id ? match.homeTeam.name : match.awayTeam.name}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm"
              />
            </div>
          </div>

          {startInnData.targetRuns ? (
            <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-center">
              <span className="text-xs text-amber-300 uppercase tracking-wider font-semibold">Chasing Target: </span>
              <span className="text-lg font-bold text-white ml-2">{startInnData.targetRuns} Runs</span>
            </div>
          ) : null}

          {/* Openers selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Striker (Opening Batsman 1)
              </label>
              <select
                required
                value={startInnData.strikerId}
                onChange={(e) => setStartInnData((p) => ({ ...p, strikerId: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Select Opening Striker</option>
                {(startInnData.battingTeamId === match.homeTeam.id
                  ? squads?.homeTeam?.playingXI || []
                  : squads?.awayTeam?.playingXI || []
                ).map((m) => (
                  <option key={m.playerId} value={m.playerId}>
                    {m.player.firstName} {m.player.lastName} (#{m.player.jerseyNumber || '—'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Non-Striker (Opening Batsman 2)
              </label>
              <select
                required
                value={startInnData.nonStrikerId}
                onChange={(e) => setStartInnData((p) => ({ ...p, nonStrikerId: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Select Opening Non-Striker</option>
                {(startInnData.battingTeamId === match.homeTeam.id
                  ? squads?.homeTeam?.playingXI || []
                  : squads?.awayTeam?.playingXI || []
                )
                  .filter((m) => m.playerId !== startInnData.strikerId)
                  .map((m) => (
                    <option key={m.playerId} value={m.playerId}>
                      {m.player.firstName} {m.player.lastName} (#{m.player.jerseyNumber || '—'})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Opening Bowler */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Opening Bowler
            </label>
            <select
              required
              value={startInnData.bowlerId}
              onChange={(e) => setStartInnData((p) => ({ ...p, bowlerId: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Select Opening Bowler</option>
              {(startInnData.bowlingTeamId === match.homeTeam.id
                ? squads?.homeTeam?.playingXI || []
                : squads?.awayTeam?.playingXI || []
              ).map((m) => (
                <option key={m.playerId} value={m.playerId}>
                  {m.player.firstName} {m.player.lastName} ({m.player.bowlingStyle || 'Bowler'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setShowStartInningsModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              Start Innings
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Wicket Modal */}
      <Modal
        isOpen={showWicketModal}
        onClose={() => setShowWicketModal(false)}
        title="Record Wicket / Dismissal"
        size="md"
      >
        <form onSubmit={handleSubmitWicket} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Dismissal Type
            </label>
            <select
              value={wicketData.wicketType}
              onChange={(e) => setWicketData((p) => ({ ...p, wicketType: e.target.value as WicketType }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="BOWLED">Bowled</option>
              <option value="CAUGHT">Caught</option>
              <option value="LBW">LBW (Leg Before Wicket)</option>
              <option value="RUN_OUT">Run Out</option>
              <option value="STUMPED">Stumped</option>
              <option value="HIT_WICKET">Hit Wicket</option>
              <option value="RETIRED_HURT">Retired Hurt</option>
              <option value="RETIRED_OUT">Retired Out</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Dismissed Player
            </label>
            <select
              value={wicketData.dismissedPlayerId}
              onChange={(e) => setWicketData((p) => ({ ...p, dismissedPlayerId: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value={activeStrikerId}>{currentInnings?.currentStriker?.name} (Striker)</option>
              <option value={activeNonStrikerId}>{currentInnings?.currentNonStriker?.name} (Non-Striker)</option>
            </select>
          </div>

          {/* Runs completed on Run Out delivery */}
          {wicketData.wicketType === 'RUN_OUT' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Runs Completed Before Run Out
              </label>
              <select
                value={wicketData.runsScored}
                onChange={(e) => setWicketData((p) => ({ ...p, runsScored: Number(e.target.value) }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value={0}>0 Runs</option>
                <option value={1}>1 Run</option>
                <option value={2}>2 Runs</option>
                <option value={3}>3 Runs</option>
              </select>
            </div>
          )}

          {/* Fielder Selector */}
          {(wicketData.wicketType === 'CAUGHT' ||
            wicketData.wicketType === 'RUN_OUT' ||
            wicketData.wicketType === 'STUMPED') && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {wicketData.wicketType === 'CAUGHT'
                  ? 'Caught By (Fielder)'
                  : wicketData.wicketType === 'STUMPED'
                  ? 'Stumped By (Wicket Keeper)'
                  : 'Fielder (Throw / Run Out)'}
              </label>
              <select
                value={wicketData.fielderId}
                onChange={(e) => setWicketData((p) => ({ ...p, fielderId: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">Select Fielder</option>
                {bowlingSquad.map((m) => (
                  <option key={m.playerId} value={m.playerId}>
                    {m.player.firstName} {m.player.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Next Batter Selector */}
          {availableNewBatsmen.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Next Incoming Batsman
              </label>
              <select
                value={wicketData.newBatsmanId}
                onChange={(e) => setWicketData((p) => ({ ...p, newBatsmanId: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="">None / Will select later</option>
                {availableNewBatsmen.map((m) => (
                  <option key={m.playerId} value={m.playerId}>
                    {m.player.firstName} {m.player.lastName} (#{m.player.jerseyNumber || '—'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setShowWicketModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" disabled={actionLoading}>
              Confirm Dismissal
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Change Bowler Modal */}
      <Modal
        isOpen={showBowlerModal}
        onClose={() => setShowBowlerModal(false)}
        title="Select Bowler for Next Over"
        size="md"
      >
        <form onSubmit={handleChangeBowler} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Select Bowler
            </label>
            <select
              required
              value={selectedBowlerId}
              onChange={(e) => setSelectedBowlerId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="">Choose a bowler...</option>
              {bowlingSquad.map((m) => (
                <option key={m.playerId} value={m.playerId}>
                  {m.player.firstName} {m.player.lastName} ({m.player.bowlingStyle || 'Bowler'})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5">
              Note: Under standard MCC cricket laws, the same bowler cannot bowl two consecutive overs from both ends.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setShowBowlerModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading || !selectedBowlerId}>
              Confirm Bowler
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Complete / Conclude Innings Modal */}
      <Modal
        isOpen={showCompleteInningsModal}
        onClose={() => setShowCompleteInningsModal(false)}
        title="Conclude Current Innings"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-white">Are you sure you want to conclude this innings?</div>
              <div className="text-xs text-slate-300 mt-1">
                Current score: {currentInnings?.battingTeam.name} {currentInnings?.totalRuns}/{currentInnings?.wickets} in {currentInnings?.oversFormatted} overs.
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="isDeclared"
              checked={isDeclaredInnings}
              onChange={(e) => setIsDeclaredInnings(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="isDeclared" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Mark as Declared (e.g. Test / Multi-day match)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setShowCompleteInningsModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleCompleteInnings} disabled={actionLoading}>
              Conclude Innings
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
