import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger.js';
import { prisma } from '../services/prisma.js';

export interface BackupResult {
  success: boolean;
  backupFile?: string;
  checksum?: string;
  sizeBytes?: number;
  timestamp: string;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  recordsVerified?: number;
}

export class DatabaseBackupService {
  private static backupDir = path.resolve(process.cwd(), 'backups');

  private static ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  private static calculateChecksum(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    return hash.digest('hex');
  }

  /**
   * Creates a timestamped database backup with SHA-256 checksum
   */
  static async createBackup(): Promise<BackupResult> {
    try {
      this.ensureBackupDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `cricket_master_backup_${timestamp}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Export structured relational snapshot
      const [
        users,
        players,
        teams,
        teamMembers,
        competitions,
        competitionTeams,
        seasons,
        matches,
        matchPlayers,
        innings,
        ballEvents,
      ] = await Promise.all([
        prisma.user.findMany(),
        prisma.player.findMany(),
        prisma.team.findMany(),
        prisma.teamMember.findMany(),
        prisma.competition.findMany(),
        prisma.competitionTeam.findMany(),
        prisma.season.findMany(),
        prisma.match.findMany(),
        prisma.matchPlayer.findMany(),
        prisma.innings.findMany(),
        prisma.ballEvent.findMany(),
      ]);

      const backupData = {
        metadata: {
          version: '1.0.0',
          engine: 'Cricket Master Platform',
          exportedAt: new Date().toISOString(),
          counts: {
            users: users.length,
            players: players.length,
            teams: teams.length,
            teamMembers: teamMembers.length,
            competitions: competitions.length,
            competitionTeams: competitionTeams.length,
            seasons: seasons.length,
            matches: matches.length,
            matchPlayers: matchPlayers.length,
            innings: innings.length,
            ballEvents: ballEvents.length,
          },
        },
        data: {
          users,
          players,
          teams,
          teamMembers,
          competitions,
          competitionTeams,
          seasons,
          matches,
          matchPlayers,
          innings,
          ballEvents,
        },
      };

      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

      const stats = fs.statSync(backupPath);
      const checksum = this.calculateChecksum(backupPath);

      logger.info(`[Backup] Database backup completed successfully: ${backupFileName} (${stats.size} bytes)`);

      return {
        success: true,
        backupFile: backupFileName,
        checksum,
        sizeBytes: stats.size,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error(`[Backup] Failed to create database backup: ${error.message}`);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  /**
   * Verifies database health and integrity
   */
  static async verifyIntegrity(): Promise<{ healthy: boolean; details: Record<string, number> }> {
    try {
      const [users, teams, players, matches, balls] = await Promise.all([
        prisma.user.count(),
        prisma.team.count(),
        prisma.player.count(),
        prisma.match.count(),
        prisma.ballEvent.count(),
      ]);

      return {
        healthy: true,
        details: { users, teams, players, matches, balls },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {},
      };
    }
  }

  /**
   * Lists all existing backup files with file sizes and timestamps
   */
  static listBackups(): Array<{ fileName: string; sizeBytes: number; createdAt: Date }> {
    this.ensureBackupDir();
    const files = fs.readdirSync(this.backupDir).filter((f) => f.endsWith('.json') || f.endsWith('.db'));
    return files.map((fileName) => {
      const filePath = path.join(this.backupDir, fileName);
      const stats = fs.statSync(filePath);
      return {
        fileName,
        sizeBytes: stats.size,
        createdAt: stats.birthtime,
      };
    });
  }
}
