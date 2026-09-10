import React, { ReactNode } from 'react';
import { Trophy } from 'lucide-react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-pitch-900 border border-slate-800 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        {icon || <Trophy className="w-8 h-8 text-emerald-500/60" />}
      </div>
      <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
      <p className="text-sm text-slate-400 mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
