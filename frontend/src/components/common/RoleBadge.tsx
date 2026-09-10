import React from 'react';
import { UserRole } from '../../types/index.js';
import { Badge } from './Badge.js';
import { ShieldAlert, Trophy, Shield, Award, Users, Activity, Eye } from 'lucide-react';

export interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'sm' }) => {
  const roleConfig: Record<
    UserRole,
    { label: string; variant: 'purple' | 'amber' | 'blue' | 'emerald' | 'slate' | 'red'; icon: React.ReactNode }
  > = {
    SUPER_ADMIN: {
      label: 'Super Admin',
      variant: 'red',
      icon: <ShieldAlert className="w-3.5 h-3.5" />,
    },
    TOURNAMENT_ADMIN: {
      label: 'Tournament Admin',
      variant: 'amber',
      icon: <Trophy className="w-3.5 h-3.5" />,
    },
    LEAGUE_ADMIN: {
      label: 'League Admin',
      variant: 'blue',
      icon: <Shield className="w-3.5 h-3.5" />,
    },
    SCORER: {
      label: 'Official Scorer',
      variant: 'emerald',
      icon: <Activity className="w-3.5 h-3.5" />,
    },
    TEAM_MANAGER: {
      label: 'Team Manager',
      variant: 'purple',
      icon: <Users className="w-3.5 h-3.5" />,
    },
    PLAYER: {
      label: 'Player',
      variant: 'emerald',
      icon: <Award className="w-3.5 h-3.5" />,
    },
    VIEWER: {
      label: 'Viewer',
      variant: 'slate',
      icon: <Eye className="w-3.5 h-3.5" />,
    },
  };

  const current = roleConfig[role] || { label: role, variant: 'slate', icon: null };

  return (
    <Badge variant={current.variant} size={size} className="gap-1.5 font-medium">
      <span className="shrink-0">{current.icon}</span>
      <span>{current.label}</span>
    </Badge>
  );
};
