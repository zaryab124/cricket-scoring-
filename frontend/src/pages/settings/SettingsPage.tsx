import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { userApi } from '../../api/userApi.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Input } from '../../components/common/Input.js';
import { RoleBadge } from '../../components/common/RoleBadge.js';
import { User, Phone, Save, Shield, Database, Cpu, CheckCircle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, refreshUserProfile } = useAuth();
  const { success, error: toastError } = useToast();

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phoneNumber: user?.phoneNumber || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await userApi.updateProfile(formData);
      await refreshUserProfile();
      success('Profile details updated successfully');
    } catch (err: any) {
      toastError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Platform & Account Settings"
        subtitle="Manage your personal profile, security configuration, and examine Phase 0 architecture."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
      />

      {/* Profile Section */}
      <Card
        header={
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Personal Profile</span>
          </div>
        }
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Email Address" value={user?.email || ''} disabled helperText="Email address cannot be changed" />
            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              icon={<Phone className="w-4 h-4" />}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              icon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Role & Access Info */}
      <Card
        header={
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Shield className="w-4 h-4 text-purple-400" />
            <span>Role-Based Access Control (RBAC) Status</span>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-pitch-950 border border-slate-800">
            <div>
              <p className="text-xs text-slate-400">Assigned Privilege Tier</p>
              <p className="text-sm font-bold text-white mt-0.5">{user?.role.replace(/_/g, ' ')}</p>
            </div>
            {user && <RoleBadge role={user.role} />}
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            All user actions, fixtures administration, tournament orchestration, scoring, and data
            mutations are verified against the Phase 0 role hierarchy and permissions matrix.
          </p>
        </div>
      </Card>

      {/* Technical Architecture Overview */}
      <Card
        header={
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Phase 0 Technical Architecture Summary</span>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-pitch-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Fullstack TypeScript & Prisma</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Express REST API with Prisma ORM, Zod payload validation, and SQLite / PostgreSQL readiness.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-pitch-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Security & Audit Trails</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              JWT Access/Refresh token lifecycle, bcrypt password security, rate limiting, and mutation audit logs.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-pitch-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>7-Tier Role Hierarchy</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Super Admin, Tournament Admin, League Admin, Scorer, Team Manager, Player, Viewer.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-pitch-950 border border-slate-800 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Modular Sports UI System</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Responsive layout, design tokens, typed table/modal/badge components, and error boundaries.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
