import { apiClient } from './client.js';
import { Competition, ApiResponse, CompetitionType, MatchFormat } from '../types/index.js';

export interface TournamentStanding {
  teamId: string;
  teamName: string;
  teamShortName: string;
  teamCode: string;
  logoUrl?: string | null;
  groupName?: string | null;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  netRunRate: number;
  runsScored: number;
  oversFaced: string;
  runsConceded: number;
  oversBowled: string;
}

export const tournamentApi = {
  getTournaments: async (params?: { page?: number; limit?: number; type?: CompetitionType; search?: string; status?: string }) => {
    const res = await apiClient.get<ApiResponse<Competition[]>>('/tournaments', { params });
    return res.data;
  },

  getTournament: async (id: string) => {
    const res = await apiClient.get<ApiResponse<Competition>>(`/tournaments/${id}`);
    return res.data;
  },

  createTournament: async (data: {
    name: string;
    code: string;
    type: CompetitionType;
    format: MatchFormat;
    seasonYear?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<Competition>>('/tournaments', data);
    return res.data;
  },

  updateTournament: async (id: string, data: Partial<{
    name: string;
    code: string;
    type: CompetitionType;
    format: MatchFormat;
    seasonYear: number;
    startDate: string;
    endDate: string;
    status: string;
  }>) => {
    const res = await apiClient.put<ApiResponse<Competition>>(`/tournaments/${id}`, data);
    return res.data;
  },

  updateTournamentStatus: async (id: string, status: string) => {
    const res = await apiClient.patch<ApiResponse<Competition>>(`/tournaments/${id}/status`, { status });
    return res.data;
  },

  getTournamentTeams: async (id: string) => {
    const res = await apiClient.get<ApiResponse<any[]>>(`/tournaments/${id}/teams`);
    return res.data;
  },

  addTeamToTournament: async (id: string, data: { teamId: string; groupName?: string; seed?: number; status?: string }) => {
    const res = await apiClient.post<ApiResponse<any>>(`/tournaments/${id}/teams`, data);
    return res.data;
  },

  removeTeamFromTournament: async (id: string, teamId: string) => {
    const res = await apiClient.delete<ApiResponse<null>>(`/tournaments/${id}/teams/${teamId}`);
    return res.data;
  },

  getTournamentStandings: async (id: string) => {
    const res = await apiClient.get<ApiResponse<{ competition: any; standings: TournamentStanding[] }>>(`/tournaments/${id}/standings`);
    return res.data;
  },
};

