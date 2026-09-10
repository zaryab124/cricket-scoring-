import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/appError.js';
import { prisma } from '../services/prisma.js';
import { AuthenticatedUser } from '../types/index.js';

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw AppError.unauthorized('Authentication token is missing or malformed', undefined, 'NO_TOKEN');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw AppError.unauthorized('User account associated with this token no longer exists', undefined, 'USER_NOT_FOUND');
    }

    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden(`Your account is currently ${user.status.toLowerCase()}. Please contact support.`, undefined, 'ACCOUNT_INACTIVE');
    }

    req.user = user as unknown as AuthenticatedUser;
    next();
  } catch (error) {
    next(error);
  }
};

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyAccessToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
        },
      });
      if (user && user.status === 'ACTIVE') {
        req.user = user as unknown as AuthenticatedUser;
      }
    }
    next();
  } catch {
    // If token invalid, simply proceed as anonymous guest
    next();
  }
};
