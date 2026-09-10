import { apiClient } from './client.js';
import { AuditLog, ApiResponse } from '../types/index.js';

export const auditApi = {
  getAuditLogs: async (params?: { page?: number; limit?: number; search?: string; entity?: string }) => {
    const res = await apiClient.get<ApiResponse<AuditLog[]>>('/audit-logs', { params });
    return res.data;
  },
};
