import { Request, Response, NextFunction } from 'express';
import { prisma } from '../services/prisma.js';
import { ScorecardService } from '../services/scorecard.service.js';
import { ScoringEngine } from '../services/scoring.engine.js';
import { matchEventHub } from '../services/events.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class ScoringController {
  /**
   * Retrieves complete structured live scorecard
   */
  static async getMatchScorecard(req: Request, res: Response, next: NextFunction) {
    try {
      const scorecard = await ScorecardService.getMatchScorecard(req.params.matchId);
      sendSuccess(res, scorecard, 'Match scorecard retrieved');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Starts a new innings (1st, 2nd, etc.) with opening batsmen & bowler
   */
  static async startInnings(req: Request, res: Response, next: NextFunction) {
    try {
      const innings = await ScoringEngine.startInnings(req.params.matchId, req.body);
      sendSuccess(res, innings, 'Innings started successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Records a ball delivery with full legal/extras/wickets/strike rotation
   */
  static async recordBall(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ScoringEngine.recordBall(req.params.matchId, req.body);
      sendSuccess(res, result, 'Ball event recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Undoes the last recorded ball in current innings with full rollback
   */
  static async undoLastBall(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ScoringEngine.undoLastBall(req.params.matchId);
      sendSuccess(res, result, 'Last delivery undone successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assigns bowler for the next over with consecutive over restriction
   */
  static async changeBowler(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ScoringEngine.changeBowler(req.params.matchId, req.body.bowlerId);
      sendSuccess(res, result, 'Bowler updated for next over');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sets new batsman on dismissal
   */
  static async setNewBatsman(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ScoringEngine.setNewBatsman(
        req.params.matchId,
        req.body.batsmanId,
        req.body.position
      );
      sendSuccess(res, result, 'New batsman set successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Concludes innings or declares
   */
  static async completeInnings(req: Request, res: Response, next: NextFunction) {
    try {
      const isDeclared = req.body.isDeclared || false;
      const result = await ScoringEngine.completeInnings(req.params.matchId, isDeclared);
      sendSuccess(res, result, 'Innings marked as completed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Real-time Server-Sent Events (SSE) stream for live scorecard
   */
  static async streamMatchEvents(req: Request, res: Response) {
    const { matchId } = req.params;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      res.status(404).json({ success: false, message: 'Match not found for live stream' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', matchId, timestamp: new Date().toISOString() })}\n\n`);

    const unsubscribe = matchEventHub.subscribeMatch(matchId, (eventData) => {
      res.write(`data: ${JSON.stringify(eventData)}\n\n`);
    });

    // 25-second keepalive heartbeat to prevent intermediate proxy/load balancer timeouts
    const keepAliveTimer = setInterval(() => {
      if (!res.writableEnded) {
        res.write(`:keepalive\n\n`);
      }
    }, 25000);

    const cleanup = () => {
      clearInterval(keepAliveTimer);
      unsubscribe();
    };

    req.on('close', cleanup);
    req.on('error', cleanup);
    res.on('finish', cleanup);
  }
}

