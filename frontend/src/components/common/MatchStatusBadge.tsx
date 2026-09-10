import React from 'react';
import { MatchStatus } from '../../types/index.js';
import { Badge } from './Badge.js';

export interface MatchStatusBadgeProps {
  status: MatchStatus;
  size?: 'sm' | 'md';
}

export const MatchStatusBadge: React.FC<MatchStatusBadgeProps> = ({ status, size = 'sm' }) => {
  const statusConfig: Record<
    MatchStatus,
    { label: string; variant: 'emerald' | 'red' | 'amber' | 'blue' | 'purple' | 'slate'; dot: boolean }
  > = {
    LIVE: { label: 'LIVE', variant: 'red', dot: true },
    INNINGS_BREAK: { label: 'INNINGS BREAK', variant: 'amber', dot: true },
    TOSS_COMPLETED: { label: 'TOSS DONE', variant: 'amber', dot: false },
    SUPER_OVER: { label: 'SUPER OVER', variant: 'red', dot: true },
    RAIN_DELAY: { label: 'RAIN DELAY', variant: 'amber', dot: true },
    SCHEDULED: { label: 'UPCOMING', variant: 'blue', dot: false },
    COMPLETED: { label: 'COMPLETED', variant: 'emerald', dot: false },
    ABANDONED: { label: 'ABANDONED', variant: 'slate', dot: false },
    NO_RESULT: { label: 'NO RESULT', variant: 'slate', dot: false },
  };

  const current = statusConfig[status] || { label: status, variant: 'slate', dot: false };

  return (
    <Badge variant={current.variant} dot={current.dot} size={size}>
      {current.label}
    </Badge>
  );
};
