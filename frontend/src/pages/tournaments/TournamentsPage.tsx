import React, { useEffect, useState } from 'react';
import { tournamentApi } from '../../api/tournamentApi.js';
import { Competition, CompetitionType, MatchFormat } from '../../types/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { Badge } from '../../components/common/Badge.js';
import { Modal } from '../../components/common/Modal.js';
import { Input } from '../../components/common/Input.js';
import { Select } from '../../components/common/Select.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import { Trophy, Plus, Calendar, Search } from 'lucide-react';

export const TournamentsPage: React.FC = () => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'TOURNAMENT' as CompetitionType,
    format: 'T20' as MatchFormat,
    seasonYear: 2026,
  });

  const fetchTournaments = async () => {
    setIsLoading(true);
    try {
      const res = await tournamentApi.getTournaments({ search });
      if (res.data) setCompetitions(res.data);
    } catch (err: any) {
      toastError(err.message || 'Failed to fetch tournaments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchTournaments, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toastError('Please fill in tournament name and code');
      return;
    }

    setIsSubmitting(true);
    try {
      await tournamentApi.createTournament(formData);
      success(`Tournament "${formData.name}" created successfully!`);
      setIsCreateModalOpen(false);
      setFormData({ name: '', code: '', type: 'TOURNAMENT', format: 'T20', seasonYear: 2026 });
      fetchTournaments();
    } catch (err: any) {
      toastError(err.message || 'Failed to create tournament');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = ['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tournaments & Leagues"
        subtitle="Manage competitions, official tournament editions, seasons, and competition structures."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Tournaments' }]}
        actions={
          canCreate && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Tournament
            </Button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <Input
            placeholder="Search competitions by name, code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading tournaments & leagues..." />
      ) : competitions.length === 0 ? (
        <EmptyState
          icon={<Trophy className="w-8 h-8 text-amber-400" />}
          title="No tournaments found"
          description="No tournaments or leagues have been scheduled yet."
          action={
            canCreate && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Tournament
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {competitions.map((c) => (
            <Card
              key={c.id}
              hoverEffect
              className="flex flex-col justify-between cursor-pointer"
              onClick={() => window.location.href = `/tournaments/${c.id}`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-lg shadow-inner">
                    🏆
                  </div>
                  <Badge variant={c.status === 'ONGOING' ? 'emerald' : c.status === 'COMPLETED' ? 'blue' : 'amber'} dot size="sm">
                    {c.status}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-white mb-1 hover:text-amber-400 transition-colors">{c.name}</h3>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs px-2 py-0.5 rounded bg-pitch-950 text-slate-400 border border-slate-800 font-mono">
                    {c.code}
                  </span>
                  <span className="text-xs text-emerald-400 font-semibold">{c.format} Format</span>
                  <span className="text-xs text-slate-400">• {c.type}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Season {c.seasonYear}
                </span>
                <span className="font-semibold text-slate-300">
                  {c._count?.matches ?? 0} Fixtures
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Tournament Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Tournament / League"
        subtitle="Configure competition structure and match format"
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
              onClick={handleCreateTournament}
              isLoading={isSubmitting}
              icon={<Plus className="w-4 h-4" />}
            >
              Save Tournament
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateTournament} className="space-y-4">
          <Input
            label="Competition Title"
            placeholder="e.g. World Cricket League 2026"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Unique Code"
              placeholder="e.g. WCL-2026"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />
            <Input
              label="Season Year"
              type="number"
              value={formData.seasonYear}
              onChange={(e) => setFormData({ ...formData, seasonYear: parseInt(e.target.value) || 2026 })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Competition Type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as CompetitionType })}
              options={[
                { label: 'Tournament / Cup', value: 'TOURNAMENT' },
                { label: 'League / Round Robin', value: 'LEAGUE' },
                { label: 'Bilateral Series', value: 'BILATERAL_SERIES' },
                { label: 'Knockout Stage', value: 'KNOCKOUT' },
              ]}
            />

            <Select
              label="Match Format"
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value as MatchFormat })}
              options={[
                { label: 'T20 (20 Overs)', value: 'T20' },
                { label: 'ODI (50 Overs)', value: 'ODI' },
                { label: 'Test Match (Multi-day)', value: 'TEST' },
                { label: 'The Hundred', value: 'THE_HUNDRED' },
                { label: 'T10 (10 Overs)', value: 'T10' },
              ]}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};
