export type UserRole =
  | 'SUPER_ADMIN'
  | 'TOURNAMENT_ADMIN'
  | 'LEAGUE_ADMIN'
  | 'SCORER'
  | 'TEAM_MANAGER'
  | 'PLAYER'
  | 'VIEWER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';

export type MatchStatus =
  | 'SCHEDULED'
  | 'TOSS_COMPLETED'
  | 'LIVE'
  | 'INNINGS_BREAK'
  | 'RAIN_DELAY'
  | 'SUPER_OVER'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'NO_RESULT';

export type MatchFormat =
  | 'TEST'
  | 'ODI'
  | 'T20'
  | 'T10'
  | '60_OVERS'
  | '40_OVERS'
  | '30_OVERS'
  | 'THE_HUNDRED'
  | 'CUSTOM';

export type TossDecision = 'BAT' | 'BOWL';

export type CompetitionType =
  | 'TOURNAMENT'
  | 'LEAGUE'
  | 'BILATERAL_SERIES'
  | 'KNOCKOUT'
  | 'GROUP_AND_KNOCKOUT';

export type BattingStyle = 'RIGHT_HAND' | 'LEFT_HAND';

export type BowlingStyle =
  | 'RIGHT_ARM_FAST'
  | 'RIGHT_ARM_FAST_MEDIUM'
  | 'RIGHT_ARM_MEDIUM'
  | 'RIGHT_ARM_OFF_SPIN'
  | 'RIGHT_ARM_LEG_SPIN'
  | 'LEFT_ARM_FAST'
  | 'LEFT_ARM_FAST_MEDIUM'
  | 'LEFT_ARM_MEDIUM'
  | 'LEFT_ARM_ORTHODOX'
  | 'LEFT_ARM_CHINAMAN'
  | 'NONE';

export type PlayerRole =
  | 'TOP_ORDER_BATTER'
  | 'MIDDLE_ORDER_BATTER'
  | 'WICKET_KEEPER_BATTER'
  | 'ALL_ROUNDER'
  | 'BOWLING_ALL_ROUNDER'
  | 'FAST_BOWLER'
  | 'SPIN_BOWLER';

export type WicketType =
  | 'BOWLED'
  | 'CAUGHT'
  | 'LBW'
  | 'RUN_OUT'
  | 'STUMPED'
  | 'HIT_WICKET'
  | 'RETIRED_HURT'
  | 'RETIRED_OUT'
  | 'OBSTRUCTING_FIELD'
  | 'TIMED_OUT'
  | 'HIT_BALL_TWICE';

export type ExtraType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY';

export type Permission =
  // User & System
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'system:audit_logs'
  | 'system:settings'
  // Competitions & Tournaments
  | 'tournaments:create'
  | 'tournaments:manage'
  | 'leagues:create'
  | 'leagues:manage'
  // Teams & Players
  | 'teams:create'
  | 'teams:manage'
  | 'teams:roster_manage'
  | 'players:create'
  | 'players:manage'
  | 'players:profile_edit'
  // Matches & Scoring
  | 'matches:create'
  | 'matches:manage'
  | 'matches:score'
  | 'matches:view_live'
  // Statistics & Rankings
  | 'stats:view'
  | 'stats:manage'
  | 'rankings:manage';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// -------------------------------------------------------------
// Scoring Engine Interfaces & DTOs
// -------------------------------------------------------------

export interface RecordBallDto {
  runsScored?: number; // Off bat (0, 1, 2, 3, 4, 5, 6)
  extraType?: ExtraType;
  extraRuns?: number; // 1 for Wide/No-ball, or Bye count
  isWicket?: boolean;
  wicketType?: WicketType;
  dismissedPlayerId?: string;
  fielderId?: string;
  isRunOutCrossed?: boolean; // Whether batters crossed before run out
  newBatsmanId?: string; // Next incoming batsman if wicket fell
  wagonZone?: string;
  ballSpeedKmph?: number;
  customCommentary?: string;
}

export interface StartInningsDto {
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  targetRuns?: number;
}

export interface BattingScorecardEntry {
  playerId: string;
  name: string;
  jerseyNumber?: number | null;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isOut: boolean;
  wicketType?: string | null;
  dismissalText: string;
  bowlerName?: string | null;
  fielderName?: string | null;
  battingOrder?: number;
  isOnStrike?: boolean;
  isBatting?: boolean;
}

export interface BowlingScorecardEntry {
  playerId: string;
  name: string;
  jerseyNumber?: number | null;
  overs: string; // e.g. "3.4"
  oversNumeric: number;
  legalBalls: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  dots: number;
  wides: number;
  noBalls: number;
  isBowlingNow?: boolean;
}

export interface FallOfWicketEntry {
  wicketNumber: number;
  score: number;
  overs: string;
  playerId: string;
  playerName: string;
}

export interface PartnershipEntry {
  runs: number;
  balls: number;
  player1: { id: string; name: string; runs: number; balls: number };
  player2: { id: string; name: string; runs: number; balls: number };
  isCurrent: boolean;
}

export interface ExtrasSummary {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  penalty: number;
  total: number;
}

export interface InningsScorecardData {
  id: string;
  inningsNumber: number;
  battingTeam: { id: string; name: string; shortName: string; logoUrl?: string | null };
  bowlingTeam: { id: string; name: string; shortName: string; logoUrl?: string | null };
  totalRuns: number;
  wickets: number;
  oversFormatted: string; // e.g. "18.4"
  legalBalls: number;
  currentRunRate: number;
  targetRuns?: number | null;
  requiredRuns?: number | null;
  requiredRunRate?: number | null;
  remainingBalls?: number | null;
  isDeclared: boolean;
  isCompleted: boolean;
  currentStriker?: { id: string; name: string; runs: number; balls: number } | null;
  currentNonStriker?: { id: string; name: string; runs: number; balls: number } | null;
  currentBowler?: { id: string; name: string; overs: string; runs: number; wickets: number } | null;
  batting: BattingScorecardEntry[];
  bowling: BowlingScorecardEntry[];
  extras: ExtrasSummary;
  fallOfWickets: FallOfWicketEntry[];
  partnerships: PartnershipEntry[];
  recentBalls: Array<{
    id: string;
    overNumber: number;
    ballNumber: number;
    text: string;
    isWicket: boolean;
    isBoundary: boolean;
    runs: number;
  }>;
}

export interface MatchScorecardData {
  match: {
    id: string;
    title: string;
    format: string;
    oversLimit: number;
    venue: string;
    city?: string | null;
    matchDate: string;
    status: MatchStatus;
    homeTeam: { id: string; name: string; shortName: string; logoUrl?: string | null };
    awayTeam: { id: string; name: string; shortName: string; logoUrl?: string | null };
    tossWinner?: { id: string; name: string } | null;
    tossDecision?: string | null;
    winner?: { id: string; name: string } | null;
    winMargin?: number | null;
    winType?: string | null;
    resultSummary?: string | null;
    manOfTheMatch?: string | null;
  };
  innings: InningsScorecardData[];
  currentInnings?: InningsScorecardData | null;
  commentary: Array<{
    id: string;
    inningsNumber: number;
    overNumber: number;
    ballNumber: number;
    bowlerName: string;
    batsmanName: string;
    runs: number;
    text: string;
    isWicket: boolean;
    isBoundary: boolean;
    timestamp: string;
  }>;
}
