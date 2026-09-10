import { z } from 'zod';

export const RegisterSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phoneNumber: z.string().optional(),
    role: z.enum([
      'SUPER_ADMIN',
      'TOURNAMENT_ADMIN',
      'LEAGUE_ADMIN',
      'SCORER',
      'TEAM_MANAGER',
      'PLAYER',
      'VIEWER',
    ]).optional(),
  }),
});

export const LoginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const RefreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

export const UpdateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum([
      'SUPER_ADMIN',
      'TOURNAMENT_ADMIN',
      'LEAGUE_ADMIN',
      'SCORER',
      'TEAM_MANAGER',
      'PLAYER',
      'VIEWER',
    ]),
  }),
});

export const UpdateUserStatusSchema = z.object({
  body: z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']),
  }),
});

export const UpdateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phoneNumber: z.string().optional(),
    avatarUrl: z.string().url().optional(),
  }),
});

// Team Schemas
export const CreateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Team name must be at least 2 characters'),
    shortName: z.string().min(2, 'Short name must be at least 2 characters').max(6),
    code: z.string().min(2).max(10),
    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    homeGround: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    managerId: z.string().uuid().optional(),
  }),
});

export const UpdateTeamSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    shortName: z.string().min(2).max(6).optional(),
    code: z.string().min(2).max(10).optional(),
    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    homeGround: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    managerId: z.string().uuid().optional(),
  }),
});

export const AddTeamMemberSchema = z.object({
  body: z.object({
    playerId: z.string().uuid('Invalid player ID'),
    role: z.string().default('PLAYER'),
    jerseyNumber: z.number().int().min(1).max(999).optional(),
    isCaptain: z.boolean().optional(),
    isViceCaptain: z.boolean().optional(),
    isWicketKeeper: z.boolean().optional(),
  }),
});

export const UpdateTeamMemberRolesSchema = z.object({
  body: z.object({
    role: z.string().optional(),
    jerseyNumber: z.number().int().min(1).max(999).optional(),
    isCaptain: z.boolean().optional(),
    isViceCaptain: z.boolean().optional(),
    isWicketKeeper: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

// Player Schemas
export const CreatePlayerSchema = z.object({
  body: z.object({
    userId: z.string().uuid().optional(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    jerseyNumber: z.number().int().min(1).max(999).optional(),
    battingStyle: z.enum(['RIGHT_HAND', 'LEFT_HAND']).optional(),
    bowlingStyle: z.enum([
      'RIGHT_ARM_FAST',
      'RIGHT_ARM_FAST_MEDIUM',
      'RIGHT_ARM_MEDIUM',
      'RIGHT_ARM_OFF_SPIN',
      'RIGHT_ARM_LEG_SPIN',
      'LEFT_ARM_FAST',
      'LEFT_ARM_FAST_MEDIUM',
      'LEFT_ARM_MEDIUM',
      'LEFT_ARM_ORTHODOX',
      'LEFT_ARM_CHINAMAN',
      'NONE',
    ]).optional(),
    playerRole: z.enum([
      'TOP_ORDER_BATTER',
      'MIDDLE_ORDER_BATTER',
      'WICKET_KEEPER_BATTER',
      'ALL_ROUNDER',
      'BOWLING_ALL_ROUNDER',
      'FAST_BOWLER',
      'SPIN_BOWLER',
    ]).optional(),
    isWicketKeeper: z.boolean().optional(),
    status: z.enum(['ACTIVE', 'INJURED', 'RETIRED', 'SUSPENDED']).optional(),
    nationality: z.string().optional(),
    bio: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    dateOfBirth: z.string().optional(),
  }),
});

export const UpdatePlayerSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    jerseyNumber: z.number().int().min(1).max(999).optional(),
    battingStyle: z.enum(['RIGHT_HAND', 'LEFT_HAND']).optional(),
    bowlingStyle: z.enum([
      'RIGHT_ARM_FAST',
      'RIGHT_ARM_FAST_MEDIUM',
      'RIGHT_ARM_MEDIUM',
      'RIGHT_ARM_OFF_SPIN',
      'RIGHT_ARM_LEG_SPIN',
      'LEFT_ARM_FAST',
      'LEFT_ARM_FAST_MEDIUM',
      'LEFT_ARM_MEDIUM',
      'LEFT_ARM_ORTHODOX',
      'LEFT_ARM_CHINAMAN',
      'NONE',
    ]).optional(),
    playerRole: z.enum([
      'TOP_ORDER_BATTER',
      'MIDDLE_ORDER_BATTER',
      'WICKET_KEEPER_BATTER',
      'ALL_ROUNDER',
      'BOWLING_ALL_ROUNDER',
      'FAST_BOWLER',
      'SPIN_BOWLER',
    ]).optional(),
    isWicketKeeper: z.boolean().optional(),
    status: z.enum(['ACTIVE', 'INJURED', 'RETIRED', 'SUSPENDED']).optional(),
    nationality: z.string().optional(),
    bio: z.string().optional(),
    avatarUrl: z.string().url().optional(),
    dateOfBirth: z.string().optional(),
  }),
});

// Competition & Match Schemas
export const CreateCompetitionSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name is required'),
    code: z.string().min(2).max(30),
    type: z.enum(['TOURNAMENT', 'LEAGUE', 'BILATERAL_SERIES', 'KNOCKOUT', 'GROUP_AND_KNOCKOUT']).default('TOURNAMENT'),
    format: z.enum(['T20', 'ODI', 'TEST', 'THE_HUNDRED', 'T10', 'CUSTOM']).default('T20'),
    seasonYear: z.number().int().min(2020).max(2100).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    bannerUrl: z.string().url().optional(),
    logoUrl: z.string().url().optional(),
    rulesJson: z.string().optional(),
  }),
});

export const UpdateCompetitionSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    code: z.string().min(2).max(30).optional(),
    type: z.enum(['TOURNAMENT', 'LEAGUE', 'BILATERAL_SERIES', 'KNOCKOUT', 'GROUP_AND_KNOCKOUT']).optional(),
    format: z.enum(['T20', 'ODI', 'TEST', 'THE_HUNDRED', 'T10', 'CUSTOM']).optional(),
    seasonYear: z.number().int().min(2020).max(2100).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    bannerUrl: z.string().url().optional(),
    logoUrl: z.string().url().optional(),
    status: z.enum(['DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED']).optional(),
    rulesJson: z.string().optional(),
  }),
});

export const UpdateCompetitionStatusSchema = z.object({
  body: z.object({
    status: z.enum(['DRAFT', 'UPCOMING', 'ONGOING', 'COMPLETED']),
  }),
});

export const AddCompetitionTeamSchema = z.object({
  body: z.object({
    teamId: z.string().uuid('Invalid team ID'),
    groupName: z.string().optional(),
    seed: z.number().int().optional(),
    status: z.enum(['REGISTERED', 'ACTIVE', 'ELIMINATED', 'WITHDRAWN']).optional(),
  }),
});

export const CreateMatchSchema = z.object({
  body: z.object({
    competitionId: z.string().uuid().optional(),
    seasonId: z.string().uuid().optional(),
    matchNumber: z.number().int().optional(),
    title: z.string().optional(),
    format: z.enum(['T20', 'ODI', 'TEST', 'THE_HUNDRED', 'T10', 'CUSTOM']).default('T20'),
    oversLimit: z.number().int().min(1).max(50).default(20),
    venue: z.string().min(2, 'Venue is required'),
    city: z.string().optional(),
    matchDate: z.string(),
    homeTeamId: z.string().uuid('Invalid home team ID'),
    awayTeamId: z.string().uuid('Invalid away team ID'),
    scorerId: z.string().uuid().optional(),
  }),
});

export const RecordTossSchema = z.object({
  body: z.object({
    tossWinnerId: z.string().uuid('Invalid toss winner team ID'),
    tossDecision: z.enum(['BAT', 'BOWL']),
  }),
});

export const SetSquadsSchema = z.object({
  body: z.object({
    homeTeamSquad: z.array(z.object({
      playerId: z.string().uuid(),
      isPlayingXI: z.boolean().default(true),
      isCaptain: z.boolean().optional(),
      isViceCaptain: z.boolean().optional(),
      isWicketKeeper: z.boolean().optional(),
      battingOrder: z.number().int().optional(),
    })).optional(),
    awayTeamSquad: z.array(z.object({
      playerId: z.string().uuid(),
      isPlayingXI: z.boolean().default(true),
      isCaptain: z.boolean().optional(),
      isViceCaptain: z.boolean().optional(),
      isWicketKeeper: z.boolean().optional(),
      battingOrder: z.number().int().optional(),
    })).optional(),
    players: z.array(z.object({
      teamId: z.string().uuid(),
      playerId: z.string().uuid(),
      isPlayingXI: z.boolean().default(true),
      isCaptain: z.boolean().optional(),
      isViceCaptain: z.boolean().optional(),
      isWicketKeeper: z.boolean().optional(),
      battingOrder: z.number().int().optional(),
    })).optional(),
  }),
});

// Scoring Engine Schemas
export const StartInningsSchema = z.object({
  body: z.object({
    inningsNumber: z.number().int().min(1).max(4),
    battingTeamId: z.string().uuid('Invalid batting team ID'),
    bowlingTeamId: z.string().uuid('Invalid bowling team ID'),
    strikerId: z.string().uuid('Invalid striker player ID'),
    nonStrikerId: z.string().uuid('Invalid non-striker player ID'),
    bowlerId: z.string().uuid('Invalid bowler player ID'),
    targetRuns: z.number().int().optional(),
  }),
});

export const RecordBallSchema = z.object({
  body: z.object({
    runsScored: z.number().int().min(0).max(6).default(0),
    extraRuns: z.number().int().min(0).max(7).default(0),
    extraType: z.enum(['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE', 'PENALTY']).optional().nullable(),
    isWicket: z.boolean().default(false),
    wicketType: z.enum([
      'BOWLED',
      'CAUGHT',
      'LBW',
      'RUN_OUT',
      'STUMPED',
      'HIT_WICKET',
      'RETIRED_HURT',
      'RETIRED_OUT',
      'OBSTRUCTING_FIELD',
      'HIT_BALL_TWICE',
      'TIMED_OUT',
    ]).optional().nullable(),
    dismissedPlayerId: z.string().uuid().optional().nullable(),
    fielderId: z.string().uuid().optional().nullable(),
    newBatsmanId: z.string().uuid().optional().nullable(),
    wagonZone: z.string().optional().nullable(),
    ballSpeedKmph: z.number().optional().nullable(),
    customCommentary: z.string().optional().nullable(),
  }),
});

export const ChangeBowlerSchema = z.object({
  body: z.object({
    bowlerId: z.string().uuid('Invalid bowler player ID'),
  }),
});

export const SetNewBatsmanSchema = z.object({
  body: z.object({
    batsmanId: z.string().uuid('Invalid batsman player ID'),
    position: z.enum(['STRIKER', 'NON_STRIKER']),
  }),
});

export const CompleteInningsSchema = z.object({
  body: z.object({
    isDeclared: z.boolean().default(false),
  }),
});
