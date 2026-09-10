import { UserRole, Permission } from '../types/index.js';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'users:read',
    'users:write',
    'users:delete',
    'system:audit_logs',
    'system:settings',
    'tournaments:create',
    'tournaments:manage',
    'leagues:create',
    'leagues:manage',
    'teams:create',
    'teams:manage',
    'teams:roster_manage',
    'players:create',
    'players:manage',
    'players:profile_edit',
    'matches:create',
    'matches:manage',
    'matches:score',
    'matches:view_live',
    'stats:view',
    'stats:manage',
    'rankings:manage',
  ],
  TOURNAMENT_ADMIN: [
    'tournaments:create',
    'tournaments:manage',
    'matches:create',
    'matches:manage',
    'teams:read' as any,
    'players:read' as any,
    'matches:view_live',
    'stats:view',
  ],
  LEAGUE_ADMIN: [
    'leagues:create',
    'leagues:manage',
    'tournaments:manage',
    'matches:create',
    'matches:manage',
    'matches:view_live',
    'stats:view',
  ],
  SCORER: [
    'matches:score',
    'matches:view_live',
    'stats:view',
  ],
  TEAM_MANAGER: [
    'teams:manage',
    'teams:roster_manage',
    'players:create',
    'players:manage',
    'matches:view_live',
    'stats:view',
  ],
  PLAYER: [
    'players:profile_edit',
    'matches:view_live',
    'stats:view',
  ],
  VIEWER: [
    'matches:view_live',
    'stats:view',
  ],
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  TOURNAMENT_ADMIN: 70,
  LEAGUE_ADMIN: 60,
  TEAM_MANAGER: 40,
  SCORER: 30,
  PLAYER: 20,
  VIEWER: 10,
};

export const hasPermission = (role: UserRole, permission: Permission): boolean => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
};

export const hasRoleOrHigher = (currentRole: UserRole, targetRole: UserRole): boolean => {
  return (ROLE_HIERARCHY[currentRole] ?? 0) >= (ROLE_HIERARCHY[targetRole] ?? 0);
};
