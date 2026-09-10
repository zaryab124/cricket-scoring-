import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchApi } from '../../api/matchApi.js';
import { teamApi } from '../../api/teamApi.js';
import { Match, Team, MatchFormat } from '../../types/index.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useToast } from '../../hooks/useToast.js';
import { PageHeader } from '../../components/layout/PageHeader.js';
import { Card } from '../../components/common/Card.js';
import { Button } from '../../components/common/Button.js';
import { MatchStatusBadge } from '../../components/common/MatchStatusBadge.js';
import { Modal } from '../../components/common/Modal.js';
import { Input } from '../../components/common/Input.js';
import { Select } from '../../components/common/Select.js';
import { LoadingState } from '../../components/feedback/LoadingState.js';
import { EmptyState } from '../../components/feedback/EmptyState.js';
import {
  Activity,
  Plus,
  Calendar,
  MapPin,
  Search,
  PlayCircle,
  Eye,
  Coins,
  Shield,
  Trophy,
} from 'lucide-react';

export const MatchesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTossModalOpen, setIsTossModalOpen] = useState(false);
  const [selectedMatchForToss, setSelectedMatchForToss] = useState<Match | null>(null);
  const [tossData, setTossData] = useState<{ tossWinnerId: string; tossDecision: 'BAT' | 'BOWL' }>({
    tossWinnerId: '',
    tossDecision: 'BAT',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    homeTeamId: '',
    awayTeamId: '',
    venue: '',
    matchDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    format: 'T20' as MatchFormat,
    oversLimit: 20,
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [matchesRes, teamsRes] = await Promise.all([
        matchApi.getMatches({ search }),
        teamApi.getTeams({ limit: 50 }),
      ]);
      if (matchesRes.data) setMatches(matchesRes.data);
      const teamList = teamsRes.data;
      if (teamList) {
        setTeams(teamList);
        if (teamList.length >= 2 && !formData.homeTeamId) {
          setFormData((prev) => ({
            ...prev,
            homeTeamId: teamList[0].id,
            awayTeamId: teamList[1].id,
          }));
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to fetch match fixtures');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.homeTeamId || !formData.awayTeamId || !formData.venue) {
      error('Please select both teams and provide venue');
      return;
    }

    if (formData.homeTeamId === formData.awayTeamId) {
      error('Home team and Away team must be different');
      return;
    }

    setIsSubmitting(true);
    try {
      await matchApi.createMatch(formData);
      success('Match fixture created successfully!');
      setIsCreateModalOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to schedule match');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordToss = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatchForToss || !tossData.tossWinnerId) return;
    setIsSubmitting(true);
    try {
      await matchApi.recordToss(selectedMatchForToss.id, tossData);
      success('Toss recorded successfully!');
      setIsTossModalOpen(false);
      fetchData();
    } catch (err: any) {
      error(err.message || 'Failed to record toss');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreate = ['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'].includes(user?.role || '');
  const isScorer = ['SUPER_ADMIN', 'SCORER', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN'].includes(user?.role || '');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <PageHeader
        title="Fixtures & Live Match Center"
        subtitle="Live scoring, ball-by-ball scorecards, fixtures, toss, and team rosters."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Matches' }]}
        actions={
          canCreate && (
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Schedule Fixture
            </Button>
          )
        }
      />

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="max-w-md w-full">
          <Input
            placeholder="Search fixtures by team or venue..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading fixtures and live match scorecards..." />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<Activity className="w-8 h-8 text-emerald-400" />}
          title="No matches found"
          description="No match fixtures scheduled yet."
          action={
            canCreate && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Schedule Fixture
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {matches.map((m) => (
            <Card key={m.id} hoverEffect className="flex flex-col justify-between bg-slate-900 border-slate-800">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-950 font-bold text-white border border-slate-800">
                      {m.format}
                    </span>
                    <span className="text-xs text-slate-400 font-medium truncate max-w-[180px]">
                      {m.oversLimit} Overs Max
                    </span>
                  </div>
                  <MatchStatusBadge status={m.status} />
                </div>

                {/* Teams Clash Card */}
                <div
                  onClick={() => navigate(`/matches/${m.id}`)}
                  className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 mb-4 space-y-3 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-emerald-400">
                        {m.homeTeam.shortName}
                      </div>
                      <span className="font-bold text-white text-sm">{m.homeTeam.name}</span>
                    </div>
                    {m.innings?.find((i) => i.battingTeamId === m.homeTeamId) && (
                      <span className="font-bold text-sm text-emerald-400">
                        {m.innings.find((i) => i.battingTeamId === m.homeTeamId)?.totalRuns}/
                        {m.innings.find((i) => i.battingTeamId === m.homeTeamId)?.wickets}
                      </span>
                    )}
                  </div>

                  <div className="border-t border-slate-800/60" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                        {m.awayTeam.shortName}
                      </div>
                      <span className="font-bold text-white text-sm">{m.awayTeam.name}</span>
                    </div>
                    {m.innings?.find((i) => i.battingTeamId === m.awayTeamId) && (
                      <span className="font-bold text-sm text-emerald-400">
                        {m.innings.find((i) => i.battingTeamId === m.awayTeamId)?.totalRuns}/
                        {m.innings.find((i) => i.battingTeamId === m.awayTeamId)?.wickets}
                      </span>
                    )}
                  </div>
                </div>

                {/* Result or Toss Info */}
                {m.resultSummary && (
                  <div className="text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-3 py-1.5 rounded-lg mb-3 flex items-center">
                    <Trophy className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                    <span>{m.resultSummary}</span>
                  </div>
                )}

                <div className="space-y-1.5 text-xs text-slate-400">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    {m.venue} {m.city ? `• ${m.city}` : ''}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(m.matchDate).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/matches/${m.id}`)}
                  className="flex-1"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" /> Match Center
                </Button>

                {isScorer && (
                  <>
                    {m.status === 'SCHEDULED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMatchForToss(m);
                          setTossData({ tossWinnerId: m.homeTeamId, tossDecision: 'BAT' });
                          setIsTossModalOpen(true);
                        }}
                        className="text-xs text-amber-400 hover:text-amber-300"
                      >
                        <Coins className="w-3.5 h-3.5 mr-1" /> Toss
                      </Button>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate(`/matches/${m.id}/score`)}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <PlayCircle className="w-3.5 h-3.5 mr-1" /> Score
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Match Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Schedule Cricket Fixture"
        subtitle="Select participating clubs, format, and venue"
        size="md"
      >
        <form onSubmit={handleCreateMatch} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Home Team"
              value={formData.homeTeamId}
              onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value })}
              options={teams.map((t) => ({ label: t.name, value: t.id }))}
            />

            <Select
              label="Away Team"
              value={formData.awayTeamId}
              onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })}
              options={teams.map((t) => ({ label: t.name, value: t.id }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Match Format"
              value={formData.format}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  format: e.target.value as MatchFormat,
                  oversLimit: e.target.value === 'ODI' ? 50 : e.target.value === 'T10' ? 10 : 20,
                })
              }
              options={[
                { label: 'T20 (20 Overs)', value: 'T20' },
                { label: 'ODI (50 Overs)', value: 'ODI' },
                { label: 'T10 (10 Overs)', value: 'T10' },
                { label: 'The Hundred', value: 'THE_HUNDRED' },
                { label: 'Test Match', value: 'TEST' },
              ]}
            />

            <Input
              label="Overs Limit"
              type="number"
              value={formData.oversLimit}
              onChange={(e) => setFormData({ ...formData, oversLimit: parseInt(e.target.value) || 20 })}
              required
            />
          </div>

          <Input
            label="Venue Stadium"
            placeholder="e.g. Wankhede Stadium, Mumbai"
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            required
          />

          <Input
            label="Match Scheduled Date & Time"
            type="datetime-local"
            value={formData.matchDate}
            onChange={(e) => setFormData({ ...formData, matchDate: e.target.value })}
            required
          />

          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              Schedule Match
            </Button>
          </div>
        </form>
      </Modal>

      {/* Record Toss Modal */}
      {selectedMatchForToss && (
        <Modal
          isOpen={isTossModalOpen}
          onClose={() => setIsTossModalOpen(false)}
          title={`Record Match Toss: ${selectedMatchForToss.homeTeam.name} vs ${selectedMatchForToss.awayTeam.name}`}
          size="md"
        >
          <form onSubmit={handleRecordToss} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Toss Winner
              </label>
              <select
                value={tossData.tossWinnerId}
                onChange={(e) => setTossData({ ...tossData, tossWinnerId: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value={selectedMatchForToss.homeTeamId}>{selectedMatchForToss.homeTeam.name}</option>
                <option value={selectedMatchForToss.awayTeamId}>{selectedMatchForToss.awayTeam.name}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Toss Decision
              </label>
              <select
                value={tossData.tossDecision}
                onChange={(e) => setTossData({ ...tossData, tossDecision: e.target.value as 'BAT' | 'BOWL' })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
              >
                <option value="BAT">Bat First</option>
                <option value="BOWL">Bowl First</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
              <Button variant="ghost" onClick={() => setIsTossModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={isSubmitting}>
                Record Toss
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

