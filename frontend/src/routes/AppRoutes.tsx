import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.js';
import { RoleGuard } from './RoleGuard.js';
import { AppShell } from '../components/layout/AppShell.js';

import { LoginPage } from '../pages/auth/LoginPage.js';
import { RegisterPage } from '../pages/auth/RegisterPage.js';
import { UnauthorizedPage } from '../pages/auth/UnauthorizedPage.js';
import { DashboardPage } from '../pages/dashboard/DashboardPage.js';
import { UsersPage } from '../pages/users/UsersPage.js';
import { TeamsPage } from '../pages/teams/TeamsPage.js';
import { TeamDetailPage } from '../pages/teams/TeamDetailPage.js';
import { PlayersPage } from '../pages/players/PlayersPage.js';
import { PlayerDetailPage } from '../pages/players/PlayerDetailPage.js';
import { TournamentsPage } from '../pages/tournaments/TournamentsPage.js';
import { TournamentDetailPage } from '../pages/tournaments/TournamentDetailPage.js';
import { MatchesPage } from '../pages/matches/MatchesPage.js';
import { MatchDetailPage } from '../pages/matches/MatchDetailPage.js';
import { ScorerConsolePage } from '../pages/scoring/ScorerConsolePage.js';
import { RankingsPage } from '../pages/stats/RankingsPage.js';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage.js';
import { NotificationsPage } from '../pages/notifications/NotificationsPage.js';
import { SettingsPage } from '../pages/settings/SettingsPage.js';
import { NotFoundPage } from '../pages/notfound/NotFoundPage.js';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected App Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <DashboardPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/matches"
        element={
          <ProtectedRoute>
            <AppShell>
              <MatchesPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/matches/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <MatchDetailPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/matches/:id/score"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN', 'SCORER']}>
              <AppShell>
                <ScorerConsolePage />
              </AppShell>
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tournaments"
        element={
          <ProtectedRoute>
            <AppShell>
              <TournamentsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/rankings"
        element={
          <ProtectedRoute>
            <AppShell>
              <RankingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tournaments/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <TournamentDetailPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <AppShell>
              <TeamsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teams/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <TeamDetailPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/players"
        element={
          <ProtectedRoute>
            <AppShell>
              <PlayersPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/players/:id"
        element={
          <ProtectedRoute>
            <AppShell>
              <PlayerDetailPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'LEAGUE_ADMIN']}>
              <AppShell>
                <UsersPage />
              </AppShell>
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <AppShell>
              <NotificationsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <RoleGuard allowedRoles={['SUPER_ADMIN']}>
              <AppShell>
                <AuditLogsPage />
              </AppShell>
            </RoleGuard>
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppShell>
              <SettingsPage />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Root Redirection */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* 404 Not Found Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

