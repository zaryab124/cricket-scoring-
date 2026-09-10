import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`[${req.method} ${req.url}] Error: ${err.message}`, {
    stack: err.stack,
    details: err.details,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || 'ERROR',
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle Prisma Known Request Errors
  if (err.code === 'P2002') {
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'A unique constraint was violated. Record already exists.',
        details: err.meta,
      },
    });
    return;
  }

  if (err.code === 'P2025') {
    res.status(404).json({
      success: false,
      error: {
        code: 'RECORD_NOT_FOUND',
        message: 'Record not found in the database.',
      },
    });
    return;
  }

  if (err.code === 'P2003') {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_RELATION',
        message: 'A foreign key relationship or referenced entity is invalid or does not exist.',
      },
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authorization token.',
      },
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_EXPIRED',
        message: 'Authorization token has expired. Please refresh token or log in again.',
      },
    });
    return;
  }

  // Unhandled internal errors
  const isDev = config.env === 'development';
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDev ? err.message : 'An unexpected internal server error occurred.',
      ...(isDev && { stack: err.stack }),
    },
  });
};
