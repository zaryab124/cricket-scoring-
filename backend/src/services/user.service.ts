import { prisma } from './prisma.js';
import { AppError } from '../utils/appError.js';
import { UserRole, UserStatus, PaginationParams } from '../types/index.js';

export class UserService {
  static async listUsers(params: PaginationParams & { role?: UserRole; status?: UserStatus }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.role) where.role = params.role;
    if (params.status) where.status = params.status;
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search } },
        { lastName: { contains: params.search } },
        { email: { contains: params.search } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          avatarUrl: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
    ]);

    return { users, total, page, limit };
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        playerProfile: true,
        managedTeams: {
          select: { id: true, name: true, code: true, logoUrl: true },
        },
        organizedComps: {
          select: { id: true, name: true, code: true, type: true, status: true },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User not found');
    }

    return user;
  }

  static async updateUserRole(id: string, newRole: UserRole, currentUserId: string) {
    if (id === currentUserId && newRole !== 'SUPER_ADMIN') {
      throw AppError.badRequest('You cannot demote your own Super Admin account');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    // Notify user of role update
    await prisma.notification.create({
      data: {
        userId: id,
        type: 'ROLE_ASSIGNMENT',
        title: 'Role Updated',
        message: `Your account role has been updated to ${newRole}.`,
      },
    });

    return updated;
  }

  static async updateUserStatus(id: string, newStatus: UserStatus) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw AppError.notFound('User not found');
    }

    return prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });
  }

  static async updateProfile(id: string, data: { firstName?: string; lastName?: string; phoneNumber?: string; avatarUrl?: string }) {
    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        status: true,
      },
    });
  }

  static async getPlatformStats() {
    const [
      totalUsers,
      totalPlayers,
      totalTeams,
      totalCompetitions,
      totalMatches,
      liveMatches,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.player.count(),
      prisma.team.count(),
      prisma.competition.count(),
      prisma.match.count(),
      prisma.match.count({ where: { status: 'LIVE' } }),
      prisma.auditLog.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      totalUsers,
      totalPlayers,
      totalTeams,
      totalCompetitions,
      totalMatches,
      liveMatches,
      recentAuditLogs,
    };
  }
}
