import { Request, Response, NextFunction } from 'express';
import { SearchService } from '../services/search.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export class SearchController {
  static async search(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query.q as string | undefined;
      const type = req.query.type as string | undefined;
      const format = req.query.format as string | undefined;
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;

      const results = await SearchService.globalSearch({
        q,
        type,
        format,
        status,
        limit,
      });

      sendSuccess(res, results, 'Search results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
