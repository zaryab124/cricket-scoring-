import { apiClient } from './client.js';
import { NotificationItem, ApiResponse } from '../types/index.js';

export const notificationApi = {
  getNotifications: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const res = await apiClient.get<ApiResponse<NotificationItem[]>>('/notifications', { params });
    return res.data;
  },

  markAsRead: async (id: string) => {
    const res = await apiClient.patch<ApiResponse<null>>(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async () => {
    const res = await apiClient.post<ApiResponse<null>>('/notifications/read-all');
    return res.data;
  },
};
