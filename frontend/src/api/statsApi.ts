import { apiClient } from './client.js';

export interface RankingEntry {
  rank: number;
  playerId: string;
  firstName: string;
  lastName: string;
  teamName?: string;
  teamCode?: string;
  playerRole: string;
  rating: number;
  points: number;
  metrics: Record<string, any>;
}

export interface RankingsResponse {
  category: string;
  format: string;
  competitionId?: string | null;
  rankings: RankingEntry[];
}

export interface LeaderboardResponse {
  topBatters: RankingEntry[];
  topBowlers: RankingEntry[];
  topAllRounders: RankingEntry[];
}

export interface AdminDashboardOverviewResponse {
  summary: {
    totalTournaments: number;
    activeTournaments: number;
    totalTeams: number;
    totalPlayers: number;
    totalMatches: number;
    liveMatches: number;
    completedMatches: number;
    scheduledMatches: number;
    totalRecordedDeliveries: number;
  };
  recentMatches: any[];
}

export const statsApi = {
  getRankings: async (params?: { category?: string; format?: string; competitionId?: string; limit?: number }) => {
    return apiClient.get<RankingsResponse>('/stats/rankings', { params });
  },
  getLeaderboard: async (params?: { format?: string; competitionId?: string }) => {
    return apiClient.get<LeaderboardResponse>('/stats/leaderboard', { params });
  },
  getAdminDashboard: async () => {
    return apiClient.get<AdminDashboardOverviewResponse>('/stats/admin-dashboard');
  },
};
