import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamApi } from '../../api/teamApi.js';
import { Team } from '../../types/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Modal } from '../../components/common/Modal.js';
import { Input } from '../../components/common/Input.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import { Shield, Plus, Users, MapPin, Search } from 'lucide-react';

export const TeamsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    code: '',
    city: '',
    country: 'India',
    homeGround: '',
  });

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const res = await teamApi.getTeams({ search });
      if (res.data) setTeams(res.data);
    } catch (err: any) {
      toastError(err.message || 'Failed to fetch teams');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchTeams, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.shortName || !formData.code) {
      toastError('Please fill in team name, short name, and unique code');
      return;
    }

    setIsSubmitting(true);
    try {
      await teamApi.createTeam(formData);
      success(`Team "${formData.name}" created successfully!`);
      setIsCreateModalOpen(false);
      setFormData({ name: '', shortName: '', code: '', city: '', country: 'India', homeGround: '' });
      fetchTeams();
    } catch (err: any) {
      toastError(err.message || 'Failed to create team');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = ['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'TEAM_MANAGER'].includes(
    user?.role || ''
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clubs & Franchises"
        subtitle="Explore cricket teams, official rosters, home grounds, and franchise profiles."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Teams' }]}
        actions={
          canCreate && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Register Team
            </Button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <Input
            placeholder="Search teams by name, code, city..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading cricket clubs & teams..." />
      ) : teams.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-8 h-8 text-emerald-400" />}
          title="No teams found"
          description="No cricket teams match your search criteria. Create one to get started."
          action={
            canCreate && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Register Team
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((t) => (
            <Card
              key={t.id}
              hoverEffect
              onClick={() => navigate(`/teams/${t.id}`)}
              className="flex flex-col justify-between cursor-pointer bg-slate-900 border-slate-800"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 border border-slate-700 flex items-center justify-center font-black text-emerald-400 text-lg shadow-inner">
                    {t.shortName}
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-950 text-slate-400 text-xs font-bold border border-slate-800">
                    {t.code}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                  {t.name}
                </h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mb-4">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {t.homeGround || t.city || 'Home Ground TBA'}
                  {t.country ? `, ${t.country}` : ''}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Users className="w-4 h-4 text-emerald-400" />
                  {t._count?.members ?? 0} Squad Players
                </span>
                <span className="text-xs font-bold text-emerald-400">View Roster →</span>
              </div>
            </Card>
          ))}
        </div>

      )}

      {/* Create Team Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Register New Cricket Team"
        subtitle="Define team identity, home ground, and franchise details"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsCreateModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateTeam}
              isLoading={isSubmitting}
              icon={<Plus className="w-4 h-4" />}
            >
              Create Team
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <Input
            label="Team Full Name"
            placeholder="e.g. Royal Challengers Bangalore"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Short Name (2-6 chars)"
              placeholder="e.g. RCB"
              value={formData.shortName}
              onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
              required
            />
            <Input
              label="Unique Code"
              placeholder="e.g. RCB-2026"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              placeholder="e.g. Bengaluru"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="Country"
              placeholder="e.g. India"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>

          <Input
            label="Home Stadium"
            placeholder="e.g. M. Chinnaswamy Stadium"
            value={formData.homeGround}
            onChange={(e) => setFormData({ ...formData, homeGround: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
};
