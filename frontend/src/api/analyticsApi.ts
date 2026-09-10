import { apiClient } from './client.js';

export interface MatchAnalyticsResponse {
  matchId: string;
  title: string;
  format: string;
  oversLimit: number;
  venue: string;
  status: string;
  winner?: { id: string; name: string } | null;
  resultSummary?: string | null;
  teamComparison: {
    homeTeam: { id: string; name: string; shortName: string; logoUrl?: string | null };
    awayTeam: { id: string; name: string; shortName: string; logoUrl?: string | null };
    innings: Array<{
      inningsNumber: number;
      teamId: string;
      teamName: string;
      runs: number;
      wickets: number;
      overs: string;
      runRate: number;
      dots: number;
      fours: number;
      sixes: number;
      extras: number;
    }>;
  };
  inningsAnalytics: Array<{
    inningsNumber: number;
    battingTeam: { id: string; name: string; shortName: string; logoUrl?: string | null };
    bowlingTeam: { id: string; name: string; shortName: string; logoUrl?: string | null };
    totalRuns: number;
    wickets: number;
    oversFormatted: string;
    runRate: number;
    dotBalls: number;
    boundaryFours: number;
    boundarySixes: number;
    extras: { wides: number; noBalls: number; byes: number; legByes: number; penalty: number; total: number };
    oversProgression: Array<{
      overNumber: number;
      runsInOver: number;
      wicketsInOver: number;
      cumulativeRuns: number;
      cumulativeWickets: number;
      bowlerId: string;
      bowlerName: string;
      deliveries: Array<any>;
    }>;
    batting: any[];
    bowling: any[];
    partnerships: any[];
    fallOfWickets: any[];
  }>;
}

export interface PlayerAnalyticsResponse {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    jerseyNumber?: number | null;
    playerRole: string;
    battingStyle: string;
    bowlingStyle: string;
    nationality?: string | null;
    avatarUrl?: string | null;
    teams: Array<{ id: string; name: string; role: string }>;
  };
  formatBreakdown: Record<string, {
    batting: {
      innings: number;
      runs: number;
      balls: number;
      average: number;
      strikeRate: number;
      highScore: number;
      fifties: number;
      hundreds: number;
    };
    bowling: {
      innings: number;
      overs: string;
      runs: number;
      wickets: number;
      economy: number;
      average: number;
    };
  }>;
  recentBatting: Array<{
    matchId: string;
    matchDate: string;
    format: string;
    opponent: string;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    strikeRate: number;
    isOut: boolean;
    dismissal?: string | null;
  }>;
  recentBowling: Array<{
    matchId: string;
    matchDate: string;
    format: string;
    opponent: string;
    legalBalls: number;
    overs: string;
    runsConceded: number;
    wickets: number;
    economy: number;
    dots: number;
  }>;
}

export interface TournamentAnalyticsResponse {
  competition: {
    id: string;
    name: string;
    code: string;
    format: string;
    seasonYear: number;
    status: string;
  };
  topScorers: Array<{
    playerId: string;
    name: string;
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
  }>;
  topWicketTakers: Array<{
    playerId: string;
    name: string;
    innings: number;
    overs: string;
    runsConceded: number;
    wickets: number;
    economy: number;
    average: number;
    bestBowling: string;
  }>;
  tournamentRecords: {
    highestIndividualScores: any[];
    mostSixes: any[];
    mostBoundaries: any[];
  };
}

export const analyticsApi = {
  getMatchAnalytics: async (matchId: string) => {
    return apiClient.get<MatchAnalyticsResponse>(`/matches/${matchId}/analytics`);
  },
  getPlayerAnalytics: async (playerId: string, params?: { format?: string; competitionId?: string; limit?: number }) => {
    return apiClient.get<PlayerAnalyticsResponse>(`/players/${playerId}/analytics`, { params });
  },
  getTournamentAnalytics: async (competitionId: string) => {
    return apiClient.get<TournamentAnalyticsResponse>(`/tournaments/${competitionId}/analytics`);
  },
};
