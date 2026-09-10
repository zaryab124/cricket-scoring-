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

export type MatchFormat = 'T20' | 'ODI' | 'TEST' | 'THE_HUNDRED' | 'T10' | 'CUSTOM';

export type CompetitionType = 'TOURNAMENT' | 'LEAGUE' | 'BILATERAL_SERIES' | 'KNOCKOUT';

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

export type PlayerRoleType =
  | 'TOP_ORDER_BATTER'
  | 'MIDDLE_ORDER_BATTER'
  | 'WICKET_KEEPER_BATTER'
  | 'ALL_ROUNDER'
  | 'BOWLING_ALL_ROUNDER'
  | 'FAST_BOWLER'
  | 'SPIN_BOWLER';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  playerProfile?: Player;
}

export interface Player {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  jerseyNumber?: number;
  battingStyle: BattingStyle;
  bowlingStyle: BowlingStyle;
  playerRole: PlayerRoleType;
  nationality?: string;
  bio?: string;
  isVerified: boolean;
  user?: Partial<User>;
  teamMemberships?: TeamMember[];
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string;
  logoUrl?: string;
  bannerUrl?: string;
  homeGround?: string;
  city?: string;
  country?: string;
  managerId?: string;
  manager?: Partial<User>;
  members?: TeamMember[];
  _count?: {
    members: number;
  };
  status: string;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  team?: Partial<Team>;
  playerId: string;
  player: Player;
  role: string;
  jerseyNumber?: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isWicketKeeper: boolean;
  joinedAt: string;
  isActive: boolean;
}

export interface Competition {
  id: string;
  name: string;
  code: string;
  type: CompetitionType;
  format: MatchFormat;
  seasonYear: number;
  startDate?: string;
  endDate?: string;
  bannerUrl?: string;
  logoUrl?: string;
  status: string;
  organizer?: Partial<User>;
  matches?: Match[];
  _count?: {
    matches: number;
    seasons: number;
    teams?: number;
  };
  createdAt: string;
}

export interface Match {
  id: string;
  competitionId?: string;
  competition?: Partial<Competition>;
  matchNumber?: number;
  title?: string;
  format: MatchFormat;
  oversLimit: number;
  venue: string;
  city?: string;
  matchDate: string;
  status: MatchStatus;
  homeTeamId: string;
  homeTeam: Team;
  awayTeamId: string;
  awayTeam: Team;
  winnerId?: string;
  winner?: Team;
  winMargin?: number;
  winType?: string;
  resultSummary?: string;
  innings?: Array<{
    id: string;
    inningsNumber: number;
    totalRuns: number;
    wickets: number;
    overs: number;
    battingTeamId: string;
  }>;
  scorer?: Partial<User>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: Partial<User>;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Phase 1 Cricket Scoring & Scorecard Types
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
  | 'HIT_BALL_TWICE'
  | 'TIMED_OUT';

export type ExtraType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE' | 'PENALTY';

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
  dismissalText: string;
  wicketType?: string;
  bowlerName?: string;
  fielderName?: string;
  isOnStrike?: boolean;
  isBatting?: boolean;
}

export interface BowlingScorecardEntry {
  playerId: string;
  name: string;
  jerseyNumber?: number | null;
  overs: string;
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
  oversFormatted: string;
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
    format: MatchFormat;
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

export interface PlayerCareerStats {
  batting: {
    innings: number;
    runs: number;
    balls: number;
    average: number;
    strikeRate: number;
    highScore: number;
    fifties: number;
    hundreds: number;
    fours: number;
    sixes: number;
    notOuts: number;
  };
  bowling: {
    innings: number;
    overs: string;
    runs: number;
    wickets: number;
    economy: number;
    average: number;
    bestBowling: string;
    fiveWicketHauls: number;
  };
  fielding: {
    catches: number;
    runOuts: number;
    stumpings: number;
  };
}

export interface MatchSquadsData {
  matchId: string;
  homeTeam: {
    team: Team;
    playingXI: Array<{
      id: string;
      playerId: string;
      player: Player;
      isPlayingXI: boolean;
      isCaptain: boolean;
      isViceCaptain: boolean;
      isWicketKeeper: boolean;
      battingOrder?: number;
    }>;
    bench: Array<{
      id: string;
      playerId: string;
      player: Player;
      isPlayingXI: boolean;
      isCaptain: boolean;
      isViceCaptain: boolean;
      isWicketKeeper: boolean;
    }>;
  };
  awayTeam: {
    team: Team;
    playingXI: Array<{
      id: string;
      playerId: string;
      player: Player;
      isPlayingXI: boolean;
      isCaptain: boolean;
      isViceCaptain: boolean;
      isWicketKeeper: boolean;
      battingOrder?: number;
    }>;
    bench: Array<{
      id: string;
      playerId: string;
      player: Player;
      isPlayingXI: boolean;
      isCaptain: boolean;
      isViceCaptain: boolean;
      isWicketKeeper: boolean;
    }>;
  };
}

