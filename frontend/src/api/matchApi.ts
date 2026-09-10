import { apiClient } from './client.js';
import { Match, ApiResponse, MatchStatus, MatchFormat } from '../types/index.js';

export const matchApi = {
  getMatches: async (params?: { page?: number; limit?: number; status?: MatchStatus; competitionId?: string; search?: string }) => {
    const res = await apiClient.get<ApiResponse<Match[]>>('/matches', { params });
    return res.data;
  },

  getMatch: async (id: string) => {
    const res = await apiClient.get<ApiResponse<Match>>(`/matches/${id}`);
    return res.data;
  },

  createMatch: async (data: {
    homeTeamId: string;
    awayTeamId: string;
    venue: string;
    matchDate: string;
    format?: MatchFormat;
    oversLimit?: number;
    competitionId?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<Match>>('/matches', data);
    return res.data;
  },

  updateMatchStatus: async (id: string, data: { status: MatchStatus; resultSummary?: string }) => {
    const res = await apiClient.patch<ApiResponse<Match>>(`/matches/${id}/status`, data);
    return res.data;
  },

  recordToss: async (id: string, data: { tossWinnerId: string; tossDecision: 'BAT' | 'BOWL' }) => {
    const res = await apiClient.post<ApiResponse<Match>>(`/matches/${id}/toss`, data);
    return res.data;
  },

  setSquads: async (id: string, data: {
    homeTeamSquad?: Array<{
      playerId: string;
      isPlayingXI?: boolean;
      isCaptain?: boolean;
      isViceCaptain?: boolean;
      isWicketKeeper?: boolean;
      battingOrder?: number;
    }>;
    awayTeamSquad?: Array<{
      playerId: string;
      isPlayingXI?: boolean;
      isCaptain?: boolean;
      isViceCaptain?: boolean;
      isWicketKeeper?: boolean;
      battingOrder?: number;
    }>;
  }) => {
    const res = await apiClient.post<ApiResponse<any>>(`/matches/${id}/squads`, data);
    return res.data;
  },

  getMatchSquads: async (id: string) => {
    const res = await apiClient.get<ApiResponse<any>>(`/matches/${id}/squads`);
    return res.data;
  },
};

