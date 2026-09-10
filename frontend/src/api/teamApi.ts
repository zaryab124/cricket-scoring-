import { apiClient } from './client.js';
import { Team, ApiResponse } from '../types/index.js';

export const teamApi = {
  getTeams: async (params?: { page?: number; limit?: number; search?: string }) => {
    const res = await apiClient.get<ApiResponse<Team[]>>('/teams', { params });
    return res.data;
  },

  getTeam: async (id: string) => {
    const res = await apiClient.get<ApiResponse<Team>>(`/teams/${id}`);
    return res.data;
  },

  createTeam: async (data: {
    name: string;
    shortName: string;
    code: string;
    city?: string;
    country?: string;
    homeGround?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<Team>>('/teams', data);
    return res.data;
  },

  updateTeam: async (id: string, data: Partial<{
    name: string;
    shortName: string;
    code: string;
    city: string;
    country: string;
    homeGround: string;
    logoUrl: string;
    bannerUrl: string;
  }>) => {
    const res = await apiClient.patch<ApiResponse<Team>>(`/teams/${id}`, data);
    return res.data;
  },

  addMember: async (teamId: string, data: {
    playerId: string;
    role?: string;
    jerseyNumber?: number;
    isCaptain?: boolean;
    isViceCaptain?: boolean;
    isWicketKeeper?: boolean;
  }) => {
    const res = await apiClient.post<ApiResponse<any>>(`/teams/${teamId}/members`, data);
    return res.data;
  },

  updateMemberRoles: async (teamId: string, playerId: string, data: {
    role?: string;
    jerseyNumber?: number;
    isCaptain?: boolean;
    isViceCaptain?: boolean;
    isWicketKeeper?: boolean;
    isActive?: boolean;
  }) => {
    const res = await apiClient.patch<ApiResponse<any>>(`/teams/${teamId}/members/${playerId}/roles`, data);
    return res.data;
  },

  removeMember: async (teamId: string, playerId: string) => {
    const res = await apiClient.delete<ApiResponse<null>>(`/teams/${teamId}/members/${playerId}`);
    return res.data;
  },

  getSquadHistory: async (teamId: string) => {
    const res = await apiClient.get<ApiResponse<any>>(`/teams/${teamId}/history`);
    return res.data;
  },

  getTeamStats: async (teamId: string) => {
    const res = await apiClient.get<ApiResponse<any>>(`/teams/${teamId}/stats`);
    return res.data;
  },
};


