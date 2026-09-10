import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { RoleBadge } from '../../components/common/RoleBadge.js';
import { Button } from '../../components/common/Button.js';
import { ShieldAlert, ArrowLeft, LayoutDashboard } from 'lucide-react';

export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
      <div className="w-20 h-20 rounded-3xl bg-red-950/40 border border-red-500/30 flex items-center justify-center text-red-400 mb-6 shadow-2xl shadow-red-500/10">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <h1 className="text-3xl font-black text-white tracking-tight mb-2">403 Access Restricted</h1>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">
        Your current account role does not have the required permissions to view or manage this
        resource.
      </p>

      {user && (
        <div className="mb-8 p-4 rounded-2xl bg-pitch-900 border border-slate-800 w-full flex items-center justify-between">
          <div className="text-left">
            <p className="text-xs text-slate-400">Current Role</p>
            <p className="text-sm font-bold text-white">
              {user.firstName} {user.lastName}
            </p>
          </div>
          <RoleBadge role={user.role} />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="md"
          icon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(-1)}
        >
          Go Back
        </Button>
        <Button
          variant="primary"
          size="md"
          icon={<LayoutDashboard className="w-4 h-4" />}
          onClick={() => navigate('/dashboard')}
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};
