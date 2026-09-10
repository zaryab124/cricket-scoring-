import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { playerApi } from '../../api/playerApi.js';
import { Player, PlayerRoleType, BattingStyle, BowlingStyle } from '../../types/index.js';
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
import { Users, Plus, Shield, Search, Award } from 'lucide-react';

export const PlayersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    jerseyNumber: 10,
    playerRole: 'ALL_ROUNDER' as PlayerRoleType,
    battingStyle: 'RIGHT_HAND' as BattingStyle,
    bowlingStyle: 'RIGHT_ARM_FAST_MEDIUM' as BowlingStyle,
    nationality: 'India',
    bio: '',
  });

  const fetchPlayers = async () => {
    setIsLoading(true);
    try {
      const res = await playerApi.getPlayers({ search });
      if (res.data) setPlayers(res.data);
    } catch (err: any) {
      toastError(err.message || 'Failed to fetch players');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchPlayers, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName) {
      toastError('Please fill in player first and last name');
      return;
    }

    setIsSubmitting(true);
    try {
      await playerApi.createPlayer(formData);
      success(`Player "${formData.firstName} ${formData.lastName}" created!`);
      setIsCreateModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        jerseyNumber: 10,
        playerRole: 'ALL_ROUNDER',
        battingStyle: 'RIGHT_HAND',
        bowlingStyle: 'RIGHT_ARM_FAST_MEDIUM',
        nationality: 'India',
        bio: '',
      });
      fetchPlayers();
    } catch (err: any) {
      toastError(err.message || 'Failed to create player');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = ['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'TEAM_MANAGER'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Players Directory"
        subtitle="Catalog of cricket players, roles, batting & bowling profiles, and squad assignments."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Players' }]}
        actions={
          canCreate && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Add Player
            </Button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <Input
            placeholder="Search players by name, nationality..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading player profiles..." />
      ) : players.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8 text-emerald-400" />}
          title="No players found"
          description="No players match the search criteria."
          action={
            canCreate && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add Player
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {players.map((p) => (
            <Card
              key={p.id}
              hoverEffect
              onClick={() => navigate(`/players/${p.id}`)}
              className="flex flex-col justify-between cursor-pointer bg-slate-900 border-slate-800"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-slate-950 border border-emerald-500/30 flex items-center justify-center font-black text-white text-base">
                    {p.jerseyNumber ? `#${p.jerseyNumber}` : '🏏'}
                  </div>
                  <Badge variant="slate" size="sm">
                    {p.nationality || 'Cricket Global'}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                  {p.firstName} {p.lastName}
                </h3>
                <p className="text-xs text-emerald-400 font-semibold mb-3">
                  {p.playerRole.replace(/_/g, ' ')}
                </p>

                {p.bio && <p className="text-xs text-slate-400 mb-4 line-clamp-2">{p.bio}</p>}

                <div className="space-y-1 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Batting</span>
                    <span className="font-medium">{p.battingStyle.replace(/_/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Bowling</span>
                    <span className="font-medium">{p.bowlingStyle.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 mt-4">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  {p.teamMemberships && p.teamMemberships.length > 0
                    ? p.teamMemberships[0].team?.name || 'Club Squad'
                    : 'Free Agent'}
                </span>
                <span className="text-xs font-bold text-emerald-400">View Profile & Stats →</span>
              </div>
            </Card>
          ))}
        </div>

      )}

      {/* Create Player Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Player to System"
        subtitle="Specify player details, style, and role"
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
              onClick={handleCreatePlayer}
              isLoading={isSubmitting}
              icon={<Plus className="w-4 h-4" />}
            >
              Save Player
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreatePlayer} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="e.g. Kane"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Williamson"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Jersey Number"
              type="number"
              placeholder="e.g. 22"
              value={formData.jerseyNumber}
              onChange={(e) => setFormData({ ...formData, jerseyNumber: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="Nationality"
              placeholder="e.g. New Zealand"
              value={formData.nationality}
              onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
            />
          </div>

          <Select
            label="Player Primary Role"
            value={formData.playerRole}
            onChange={(e) => setFormData({ ...formData, playerRole: e.target.value as PlayerRoleType })}
            options={[
              { label: 'Top Order Batter', value: 'TOP_ORDER_BATTER' },
              { label: 'Middle Order Batter', value: 'MIDDLE_ORDER_BATTER' },
              { label: 'Wicket Keeper Batter', value: 'WICKET_KEEPER_BATTER' },
              { label: 'All Rounder', value: 'ALL_ROUNDER' },
              { label: 'Bowling All Rounder', value: 'BOWLING_ALL_ROUNDER' },
              { label: 'Fast Bowler', value: 'FAST_BOWLER' },
              { label: 'Spin Bowler', value: 'SPIN_BOWLER' },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Batting Style"
              value={formData.battingStyle}
              onChange={(e) => setFormData({ ...formData, battingStyle: e.target.value as BattingStyle })}
              options={[
                { label: 'Right Hand', value: 'RIGHT_HAND' },
                { label: 'Left Hand', value: 'LEFT_HAND' },
              ]}
            />
            <Select
              label="Bowling Style"
              value={formData.bowlingStyle}
              onChange={(e) => setFormData({ ...formData, bowlingStyle: e.target.value as BowlingStyle })}
              options={[
                { label: 'Right Arm Fast', value: 'RIGHT_ARM_FAST' },
                { label: 'Right Arm Fast Medium', value: 'RIGHT_ARM_FAST_MEDIUM' },
                { label: 'Right Arm Spin', value: 'RIGHT_ARM_OFF_SPIN' },
                { label: 'Left Arm Fast', value: 'LEFT_ARM_FAST' },
                { label: 'Left Arm Spin', value: 'LEFT_ARM_ORTHODOX' },
                { label: 'None / Non-Bowler', value: 'NONE' },
              ]}
            />
          </div>

          <Input
            label="Player Bio"
            placeholder="Brief player career description..."
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          />
        </form>
      </Modal>
    </div>
  );
};
