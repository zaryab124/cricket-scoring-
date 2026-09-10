import React, { ReactNode } from 'react';

export interface BadgeProps {
  variant?: 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'slate';
  dot?: boolean;
  size?: 'sm' | 'md';
  children: ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'emerald',
  dot = false,
  size = 'sm',
  children,
  className = '',
}) => {
  const variantStyles = {
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-500/30',
    red: 'bg-red-950/80 text-red-300 border-red-500/30',
    blue: 'bg-blue-950/80 text-blue-300 border-blue-500/30',
    purple: 'bg-purple-950/80 text-purple-300 border-purple-500/30',
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
  };

  const dotStyles = {
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    red: 'bg-red-400',
    blue: 'bg-blue-400',
    purple: 'bg-purple-400',
    slate: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-sm px-3 py-1 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-sm ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotStyles[variant]} animate-pulse`} />}
      <span>{children}</span>
    </span>
  );
};
