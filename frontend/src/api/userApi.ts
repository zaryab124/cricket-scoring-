import { apiClient } from './client.js';
import { User, ApiResponse, UserRole, UserStatus } from '../types/index.js';

export interface PlatformStats {
  totalUsers: number;
  totalPlayers: number;
  totalTeams: number;
  totalCompetitions: number;
  totalMatches: number;
  liveMatches: number;
  recentAuditLogs: any[];
}

export const userApi = {
  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
    const res = await apiClient.get<ApiResponse<User[]>>('/users', { params });
    return res.data;
  },

  getUser: async (id: string) => {
    const res = await apiClient.get<ApiResponse<User>>(`/users/${id}`);
    return res.data;
  },

  updateRole: async (id: string, role: UserRole) => {
    const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}/role`, { role });
    return res.data;
  },

  updateStatus: async (id: string, status: UserStatus) => {
    const res = await apiClient.patch<ApiResponse<User>>(`/users/${id}/status`, { status });
    return res.data;
  },

  updateProfile: async (data: { firstName?: string; lastName?: string; phoneNumber?: string }) => {
    const res = await apiClient.patch<ApiResponse<User>>('/users/profile', data);
    return res.data;
  },

  getPlatformStats: async () => {
    const res = await apiClient.get<ApiResponse<PlatformStats>>('/users/platform-stats');
    return res.data;
  },
};
