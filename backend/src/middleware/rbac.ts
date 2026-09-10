import { Request, Response, NextFunction } from 'express';
import { UserRole, Permission } from '../types/index.js';
import { hasPermission } from '../config/roles.js';
import { AppError } from '../utils/appError.js';

export const requireRoles = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required to access this resource'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}. Current role: ${req.user.role}`,
          { requiredRoles: allowedRoles, currentRole: req.user.role },
          'INSUFFICIENT_ROLE'
        )
      );
    }

    next();
  };
};

export const requirePermissions = (...requiredPermissions: Permission[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required to access this resource'));
    }

    const missingPermissions = requiredPermissions.filter(
      (perm) => !hasPermission(req.user!.role, perm)
    );

    if (missingPermissions.length > 0) {
      return next(
        AppError.forbidden(
          `Access denied. Missing required permission(s): ${missingPermissions.join(', ')}`,
          { missingPermissions, role: req.user.role },
          'MISSING_PERMISSIONS'
        )
      );
    }

    next();
  };
};
