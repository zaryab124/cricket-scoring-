import { apiClient } from './client.js';
import { Player, ApiResponse, PlayerRoleType, BattingStyle, BowlingStyle } from '../types/index.js';

export const playerApi = {
  getPlayers: async (params?: { page?: number; limit?: number; search?: string; role?: string; teamId?: string }) => {
    const res = await apiClient.get<ApiResponse<Player[]>>('/players', { params });
    return res.data;
  },

  getPlayer: async (id: string) => {
    const res = await apiClient.get<ApiResponse<Player>>(`/players/${id}`);
    return res.data;
  },

  createPlayer: async (data: {
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
    playerRole?: PlayerRoleType;
    battingStyle?: BattingStyle;
    bowlingStyle?: BowlingStyle;
    nationality?: string;
    bio?: string;
    isWicketKeeper?: boolean;
    status?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<Player>>('/players', data);
    return res.data;
  },

  updatePlayer: async (id: string, data: Partial<{
    firstName: string;
    lastName: string;
    jerseyNumber: number;
    playerRole: PlayerRoleType;
    battingStyle: BattingStyle;
    bowlingStyle: BowlingStyle;
    nationality: string;
    bio: string;
    isWicketKeeper: boolean;
    status: string;
  }>) => {
    const res = await apiClient.patch<ApiResponse<Player>>(`/players/${id}`, data);
    return res.data;
  },

  getPlayerStats: async (id: string) => {
    const res = await apiClient.get<ApiResponse<any>>(`/players/${id}/stats`);
    return res.data;
  },
};

