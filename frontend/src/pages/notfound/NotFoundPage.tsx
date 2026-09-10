import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button.js';
import { LayoutDashboard } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-pitch-900 border border-slate-800 flex items-center justify-center text-3xl mb-6 shadow-inner">
        🏏
      </div>
      <h1 className="text-4xl font-black text-white tracking-tight mb-2">404</h1>
      <p className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">
        Page Not Found
      </p>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed">
        The route or resource you are trying to access does not exist on this server.
      </p>
      <Link to="/dashboard">
        <Button variant="primary" size="md" icon={<LayoutDashboard className="w-4 h-4" />}>
          Return to Dashboard
        </Button>
      </Link>
    </div>
  );
};
