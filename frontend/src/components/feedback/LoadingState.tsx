import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  fullscreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  fullscreen = false,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center animate-fadeIn">
      <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4 shadow-glow-emerald">
        <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-300">{message}</p>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-pitch-950 flex items-center justify-center">
        {content}
      </div>
    );
  }

  return content;
};
