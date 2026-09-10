import React, { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  hoverEffect?: boolean;
  emeraldBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  hoverEffect = false,
  emeraldBorder = false,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`bg-pitch-900/80 border rounded-2xl overflow-hidden backdrop-blur-md transition-all duration-300 shadow-card-dark ${
        emeraldBorder
          ? 'border-emerald-500/40 shadow-glow-emerald'
          : 'border-slate-800/80'
      } ${
        hoverEffect
          ? 'hover:border-slate-700 hover:shadow-lg hover:-translate-y-0.5'
          : ''
      } ${className}`}
      {...props}
    >
      {header && (
        <div className="px-5 py-4 border-b border-slate-800/80 bg-pitch-950/40 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && (
        <div className="px-5 py-3.5 border-t border-slate-800/80 bg-pitch-950/30">
          {footer}
        </div>
      )}
    </div>
  );
};
