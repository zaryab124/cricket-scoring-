import { apiClient } from './client.js';
import { ApiResponse, MatchScorecardData, InningsScorecardData, ExtraType, WicketType } from '../types/index.js';

export interface StartInningsPayload {
  inningsNumber: number;
  battingTeamId: string;
  bowlingTeamId: string;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  targetRuns?: number;
}

export interface RecordBallPayload {
  runsScored?: number;
  extraRuns?: number;
  extraType?: ExtraType | null;
  isWicket?: boolean;
  wicketType?: WicketType | null;
  dismissedPlayerId?: string | null;
  fielderId?: string | null;
  newBatsmanId?: string | null;
  wagonZone?: string | null;
  ballSpeedKmph?: number | null;
  customCommentary?: string | null;
}

export interface SetNewBatsmanPayload {
  batsmanId: string;
  position: 'STRIKER' | 'NON_STRIKER';
}

export const scoringApi = {
  getMatchScorecard: async (matchId: string) => {
    const res = await apiClient.get<ApiResponse<MatchScorecardData>>(`/scoring/${matchId}/scorecard`);
    return res.data;
  },

  startInnings: async (matchId: string, payload: StartInningsPayload) => {
    const res = await apiClient.post<ApiResponse<InningsScorecardData>>(`/scoring/${matchId}/start-innings`, payload);
    return res.data;
  },

  recordBall: async (matchId: string, payload: RecordBallPayload) => {
    const res = await apiClient.post<ApiResponse<{ ballEvent: any; innings: any; isOverCompleted: boolean }>>(
      `/scoring/${matchId}/ball`,
      payload
    );
    return res.data;
  },

  undoLastBall: async (matchId: string) => {
    const res = await apiClient.post<ApiResponse<{ undoneBall: any; innings: any }>>(`/scoring/${matchId}/undo`);
    return res.data;
  },

  changeBowler: async (matchId: string, bowlerId: string) => {
    const res = await apiClient.post<ApiResponse<any>>(`/scoring/${matchId}/bowler`, { bowlerId });
    return res.data;
  },

  setNewBatsman: async (matchId: string, payload: SetNewBatsmanPayload) => {
    const res = await apiClient.post<ApiResponse<any>>(`/scoring/${matchId}/batsman`, payload);
    return res.data;
  },

  completeInnings: async (matchId: string, isDeclared = false) => {
    const res = await apiClient.post<ApiResponse<any>>(`/scoring/${matchId}/complete-innings`, { isDeclared });
    return res.data;
  },
};
