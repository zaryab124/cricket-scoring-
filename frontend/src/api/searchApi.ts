import { apiClient } from './client.js';

export interface GlobalSearchResponse {
  query: string;
  type: string;
  totalResults: number;
  players: any[];
  teams: any[];
  tournaments: any[];
  matches: any[];
}

export const searchApi = {
  search: async (params: { q?: string; type?: string; format?: string; status?: string; limit?: number }) => {
    return apiClient.get<GlobalSearchResponse>('/search', { params });
  },
};
