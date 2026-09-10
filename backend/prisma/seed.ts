import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🏏 Starting Cricket Master database seeding...');

  // 1. Clean existing records in relational order
  await prisma.ballEvent.deleteMany();
  await prisma.innings.deleteMany();
  await prisma.matchPlayer.deleteMany();
  await prisma.match.deleteMany();
  await prisma.season.deleteMany();
  await prisma.competition.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.player.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('Password@123', 10);

  // 2. Create Users for all 7 roles
  const superAdmin = await prisma.user.create({
    data: {
      email: 'superadmin@cricketmaster.io',
      passwordHash: defaultPassword,
      firstName: 'Alexander',
      lastName: 'Vance',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      phoneNumber: '+1-555-0101',
    },
  });

  const tournamentAdmin = await prisma.user.create({
    data: {
      email: 'tournamentadmin@cricketmaster.io',
      passwordHash: defaultPassword,
      firstName: 'Sarah',
      lastName: 'Jenkins',
      role: 'TOURNAMENT_ADMIN',
      status: 'ACTIVE',
      phoneNumber: '+1-555-0102',
    },
  });

  const leagueAdmin = await prisma.user.create({
    data: {
      email: 'leagueadmin@cricketmaster.io',
      passwordHash: defaultPassword,
      firstName: 'Marcus',
      lastName: 'Sterling',
      role: 'LEAGUE_ADMIN',
      status: 'ACTIVE',
      phoneNumber: '+1-555-0103',
    },
  });

  const scorer = await prisma.user.create({
    data: {
      email: 'scorer@cricketmaster.io',
      passwordHash: defaultPassword,
      firstName: 'David',
      lastName: 'Miller',
      role: 'SCORER',
      status: 'ACTIVE',
      phoneNumber: '+1-555-0104',
    },
  });

  const teamManager = await prisma.user.create({
    data: {
      email: 'manager@cricketmaster.io',
      passwordHash: defaultPassword,
      firstName: 'Robert',
      lastName: 'Hawkins',
      role: 'TEAM_MANAGER',
      status: 'ACTIVE',
      phoneNumber: '+1-555-0105',
    },
  });

  const playerUser = await prisma.user.create({
    data: {
      email: 'player@cricketmaster.io',
      passwordHash: defaultPassword,
      firstName: 'Rohit',
      lastName: 'Sharma',
      role: 'PLAYER',
      status: 'ACTIVE',
      phoneNumber: '+1-555-0106',
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: 'viewer@cricketmaster.io',
      passwordHash: defaultPassword,
      firstName: 'Emily',
      lastName: 'Watson',
      role: 'VIEWER',
      status: 'ACTIVE',
      phoneNumber: '+1-555-0107',
    },
  });

  console.log('✅ Created 7 role-based users.');

  // 3. Create Teams
  const team1 = await prisma.team.create({
    data: {
      name: 'Mumbai Strikers',
      shortName: 'MUM',
      code: 'MUM-STR',
      city: 'Mumbai',
      country: 'India',
      homeGround: 'Wankhede Stadium',
      managerId: teamManager.id,
      status: 'ACTIVE',
    },
  });

  const team2 = await prisma.team.create({
    data: {
      name: 'Bangalore Titans',
      shortName: 'BLR',
      code: 'BLR-TIT',
      city: 'Bengaluru',
      country: 'India',
      homeGround: 'M. Chinnaswamy Stadium',
      status: 'ACTIVE',
    },
  });

  const team3 = await prisma.team.create({
    data: {
      name: 'Chennai Super Hawks',
      shortName: 'CHE',
      code: 'CHE-HWK',
      city: 'Chennai',
      country: 'India',
      homeGround: 'M. A. Chidambaram Stadium',
      status: 'ACTIVE',
    },
  });

  const team4 = await prisma.team.create({
    data: {
      name: 'Delhi Royals',
      shortName: 'DEL',
      code: 'DEL-ROY',
      city: 'Delhi',
      country: 'India',
      homeGround: 'Arun Jaitley Stadium',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created 4 professional teams.');

  // 4. Create Players (Full rosters)
  const mumPlayersData = [
    { firstName: 'Rohit', lastName: 'Sharma', jerseyNumber: 45, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_OFF_SPIN', playerRole: 'TOP_ORDER_BATTER', isWicketKeeper: false, isCaptain: true, isViceCaptain: false, nationality: 'India', userId: playerUser.id },
    { firstName: 'Ishan', lastName: 'Kishan', jerseyNumber: 32, battingStyle: 'LEFT_HAND', bowlingStyle: 'NONE', playerRole: 'WICKET_KEEPER_BATTER', isWicketKeeper: true, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Suryakumar', lastName: 'Yadav', jerseyNumber: 63, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_MEDIUM', playerRole: 'MIDDLE_ORDER_BATTER', isWicketKeeper: false, isCaptain: false, isViceCaptain: true, nationality: 'India' },
    { firstName: 'Tilak', lastName: 'Varma', jerseyNumber: 9, battingStyle: 'LEFT_HAND', bowlingStyle: 'RIGHT_ARM_OFF_SPIN', playerRole: 'MIDDLE_ORDER_BATTER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Hardik', lastName: 'Pandya', jerseyNumber: 33, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST_MEDIUM', playerRole: 'ALL_ROUNDER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Tim', lastName: 'David', jerseyNumber: 8, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_OFF_SPIN', playerRole: 'MIDDLE_ORDER_BATTER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'Australia' },
    { firstName: 'Piyush', lastName: 'Chawla', jerseyNumber: 11, battingStyle: 'LEFT_HAND', bowlingStyle: 'RIGHT_ARM_LEG_SPIN', playerRole: 'SPIN_BOWLER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Jasprit', lastName: 'Bumrah', jerseyNumber: 93, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST', playerRole: 'FAST_BOWLER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Gerald', lastName: 'Coetzee', jerseyNumber: 62, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST', playerRole: 'FAST_BOWLER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'South Africa' },
    { firstName: 'Nuwan', lastName: 'Thushara', jerseyNumber: 5, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST_MEDIUM', playerRole: 'FAST_BOWLER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'Sri Lanka' },
    { firstName: 'Kumar', lastName: 'Kartikeya', jerseyNumber: 26, battingStyle: 'RIGHT_HAND', bowlingStyle: 'LEFT_ARM_ORTHODOX', playerRole: 'SPIN_BOWLER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Nehal', lastName: 'Wadhera', jerseyNumber: 22, battingStyle: 'LEFT_HAND', bowlingStyle: 'RIGHT_ARM_LEG_SPIN', playerRole: 'MIDDLE_ORDER_BATTER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
  ];

  const blrPlayersData = [
    { firstName: 'Virat', lastName: 'Kohli', jerseyNumber: 18, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_MEDIUM', playerRole: 'TOP_ORDER_BATTER', isWicketKeeper: false, isCaptain: true, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Faf', lastName: 'du Plessis', jerseyNumber: 13, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_LEG_SPIN', playerRole: 'TOP_ORDER_BATTER', isWicketKeeper: false, isCaptain: false, isViceCaptain: true, nationality: 'South Africa' },
    { firstName: 'Rajat', lastName: 'Patidar', jerseyNumber: 97, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_OFF_SPIN', playerRole: 'TOP_ORDER_BATTER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Glenn', lastName: 'Maxwell', jerseyNumber: 32, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_OFF_SPIN', playerRole: 'ALL_ROUNDER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'Australia' },
    { firstName: 'Cameron', lastName: 'Green', jerseyNumber: 42, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST_MEDIUM', playerRole: 'ALL_ROUNDER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'Australia' },
    { firstName: 'Dinesh', lastName: 'Karthik', jerseyNumber: 21, battingStyle: 'RIGHT_HAND', bowlingStyle: 'NONE', playerRole: 'WICKET_KEEPER_BATTER', isWicketKeeper: true, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Mahipal', lastName: 'Lomror', jerseyNumber: 6, battingStyle: 'LEFT_HAND', bowlingStyle: 'LEFT_ARM_ORTHODOX', playerRole: 'ALL_ROUNDER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Mohammed', lastName: 'Siraj', jerseyNumber: 73, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST', playerRole: 'FAST_BOWLER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Yash', lastName: 'Dayal', jerseyNumber: 10, battingStyle: 'LEFT_HAND', bowlingStyle: 'LEFT_ARM_FAST_MEDIUM', playerRole: 'FAST_BOWLER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Lockie', lastName: 'Ferguson', jerseyNumber: 69, battingStyle: 'RIGHT_HAND', bowlingStyle: 'RIGHT_ARM_FAST', playerRole: 'FAST_BOWLER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'New Zealand' },
    { firstName: 'Karn', lastName: 'Sharma', jerseyNumber: 36, battingStyle: 'LEFT_HAND', bowlingStyle: 'RIGHT_ARM_LEG_SPIN', playerRole: 'SPIN_BOWLER', isWicketKeeper: false, isCaptain: false, isViceCaptain: false, nationality: 'India' },
    { firstName: 'Anuj', lastName: 'Rawat', jerseyNumber: 55, battingStyle: 'LEFT_HAND', bowlingStyle: 'NONE', playerRole: 'WICKET_KEEPER_BATTER', isWicketKeeper: true, isCaptain: false, isViceCaptain: false, nationality: 'India' },
  ];

  const mumPlayers: any[] = [];
  for (const p of mumPlayersData) {
    const created = await prisma.player.create({
      data: {
        userId: p.userId,
        firstName: p.firstName,
        lastName: p.lastName,
        jerseyNumber: p.jerseyNumber,
        battingStyle: p.battingStyle,
        bowlingStyle: p.bowlingStyle,
        playerRole: p.playerRole,
        isWicketKeeper: p.isWicketKeeper,
        nationality: p.nationality,
        isVerified: true,
      },
    });
    mumPlayers.push({ ...created, isCaptain: p.isCaptain, isViceCaptain: p.isViceCaptain });

    await prisma.teamMember.create({
      data: {
        teamId: team1.id,
        playerId: created.id,
        role: p.isCaptain ? 'CAPTAIN' : p.isViceCaptain ? 'VICE_CAPTAIN' : p.isWicketKeeper ? 'WICKET_KEEPER' : 'PLAYER',
        jerseyNumber: p.jerseyNumber,
        isCaptain: p.isCaptain,
        isViceCaptain: p.isViceCaptain,
        isWicketKeeper: p.isWicketKeeper,
      },
    });
  }

  const blrPlayers: any[] = [];
  for (const p of blrPlayersData) {
    const created = await prisma.player.create({
      data: {
        firstName: p.firstName,
        lastName: p.lastName,
        jerseyNumber: p.jerseyNumber,
        battingStyle: p.battingStyle,
        bowlingStyle: p.bowlingStyle,
        playerRole: p.playerRole,
        isWicketKeeper: p.isWicketKeeper,
        nationality: p.nationality,
        isVerified: true,
      },
    });
    blrPlayers.push({ ...created, isCaptain: p.isCaptain, isViceCaptain: p.isViceCaptain });

    await prisma.teamMember.create({
      data: {
        teamId: team2.id,
        playerId: created.id,
        role: p.isCaptain ? 'CAPTAIN' : p.isViceCaptain ? 'VICE_CAPTAIN' : p.isWicketKeeper ? 'WICKET_KEEPER' : 'PLAYER',
        jerseyNumber: p.jerseyNumber,
        isCaptain: p.isCaptain,
        isViceCaptain: p.isViceCaptain,
        isWicketKeeper: p.isWicketKeeper,
      },
    });
  }

  // Update team captains & vice captains
  await prisma.team.update({
    where: { id: team1.id },
    data: {
      captainId: mumPlayers.find((p) => p.isCaptain)?.id,
      viceCaptainId: mumPlayers.find((p) => p.isViceCaptain)?.id,
    },
  });

  await prisma.team.update({
    where: { id: team2.id },
    data: {
      captainId: blrPlayers.find((p) => p.isCaptain)?.id,
      viceCaptainId: blrPlayers.find((p) => p.isViceCaptain)?.id,
    },
  });

  console.log('✅ Created 24 professional players and full team rosters.');

  // 5. Create Competitions & Tournaments
  const competition1 = await prisma.competition.create({
    data: {
      name: 'Premier T20 Championship 2026',
      code: 'PT20-2026',
      type: 'TOURNAMENT',
      format: 'T20',
      seasonYear: 2026,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-11-15'),
      organizerId: tournamentAdmin.id,
      status: 'ONGOING',
    },
  });

  const season1 = await prisma.season.create({
    data: {
      competitionId: competition1.id,
      name: 'Season 2026',
      year: 2026,
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-11-15'),
      status: 'ACTIVE',
    },
  });

  const competition2 = await prisma.competition.create({
    data: {
      name: 'National One-Day Cup 2026',
      code: 'NODC-2026',
      type: 'LEAGUE',
      format: 'ODI',
      seasonYear: 2026,
      startDate: new Date('2026-11-20'),
      endDate: new Date('2026-12-30'),
      organizerId: leagueAdmin.id,
      status: 'UPCOMING',
    },
  });

  await prisma.season.create({
    data: {
      competitionId: competition2.id,
      name: 'Season 2026-27',
      year: 2026,
      startDate: new Date('2026-11-20'),
      endDate: new Date('2026-12-30'),
      status: 'ACTIVE',
    },
  });

  // 6. Create Matches
  // Match 1: Completed match with scored ball events
  const match1 = await prisma.match.create({
    data: {
      competitionId: competition1.id,
      seasonId: season1.id,
      matchNumber: 1,
      title: 'Mumbai Strikers vs Bangalore Titans',
      format: 'T20',
      oversLimit: 20,
      venue: 'Wankhede Stadium',
      city: 'Mumbai',
      matchDate: new Date('2026-10-02T19:30:00Z'),
      homeTeamId: team1.id,
      awayTeamId: team2.id,
      tossWinnerId: team1.id,
      tossDecision: 'BAT',
      scorerId: scorer.id,
      status: 'COMPLETED',
      winnerId: team1.id,
      winMargin: 24,
      winType: 'RUNS',
      resultSummary: 'Mumbai Strikers won by 24 runs',
    },
  });

  // Match 2: Live match ready for scoring in UI
  const match2 = await prisma.match.create({
    data: {
      competitionId: competition1.id,
      seasonId: season1.id,
      matchNumber: 2,
      title: 'Bangalore Titans vs Mumbai Strikers',
      format: 'T20',
      oversLimit: 20,
      venue: 'M. Chinnaswamy Stadium',
      city: 'Bengaluru',
      matchDate: new Date(),
      homeTeamId: team2.id,
      awayTeamId: team1.id,
      tossWinnerId: team2.id,
      tossDecision: 'BAT',
      scorerId: scorer.id,
      status: 'LIVE',
      resultSummary: 'Bangalore Titans won the toss and elected to bat first.',
    },
  });

  // Match 3: Scheduled fixture
  await prisma.match.create({
    data: {
      competitionId: competition1.id,
      seasonId: season1.id,
      matchNumber: 3,
      title: 'Chennai Super Hawks vs Delhi Royals',
      format: 'T20',
      oversLimit: 20,
      venue: 'M. A. Chidambaram Stadium',
      city: 'Chennai',
      matchDate: new Date('2026-10-10T19:30:00Z'),
      homeTeamId: team3.id,
      awayTeamId: team4.id,
      scorerId: scorer.id,
      status: 'SCHEDULED',
    },
  });

  // Assign Playing XI for Match 1 & Match 2
  for (let i = 0; i < 11; i++) {
    await prisma.matchPlayer.create({
      data: {
        matchId: match1.id,
        teamId: team1.id,
        playerId: mumPlayers[i].id,
        isPlayingXI: true,
        battingOrder: i + 1,
        isCaptain: mumPlayers[i].isCaptain,
        isViceCaptain: mumPlayers[i].isViceCaptain,
        isWicketKeeper: mumPlayers[i].isWicketKeeper,
      },
    });

    await prisma.matchPlayer.create({
      data: {
        matchId: match1.id,
        teamId: team2.id,
        playerId: blrPlayers[i].id,
        isPlayingXI: true,
        battingOrder: i + 1,
        isCaptain: blrPlayers[i].isCaptain,
        isViceCaptain: blrPlayers[i].isViceCaptain,
        isWicketKeeper: blrPlayers[i].isWicketKeeper,
      },
    });

    // Also for live Match 2
    await prisma.matchPlayer.create({
      data: {
        matchId: match2.id,
        teamId: team2.id,
        playerId: blrPlayers[i].id,
        isPlayingXI: true,
        battingOrder: i + 1,
        isCaptain: blrPlayers[i].isCaptain,
        isViceCaptain: blrPlayers[i].isViceCaptain,
        isWicketKeeper: blrPlayers[i].isWicketKeeper,
      },
    });

    await prisma.matchPlayer.create({
      data: {
        matchId: match2.id,
        teamId: team1.id,
        playerId: mumPlayers[i].id,
        isPlayingXI: true,
        battingOrder: i + 1,
        isCaptain: mumPlayers[i].isCaptain,
        isViceCaptain: mumPlayers[i].isViceCaptain,
        isWicketKeeper: mumPlayers[i].isWicketKeeper,
      },
    });
  }

  // 7. Seed Ball-by-ball for Completed Match 1
  // Innings 1: Mumbai Strikers Batting (54 runs in 4 overs sample)
  const inn1 = await prisma.innings.create({
    data: {
      matchId: match1.id,
      inningsNumber: 1,
      battingTeamId: team1.id,
      bowlingTeamId: team2.id,
      totalRuns: 54,
      wickets: 1,
      overs: 4.0,
      legalBalls: 24,
      currentStrikerId: mumPlayers[2].id, // Suryakumar
      currentNonStrikerId: mumPlayers[0].id, // Rohit
      currentBowlerId: blrPlayers[7].id, // Siraj
      isCompleted: true,
    },
  });

  // Over 1 (Bowler: Siraj, Batsmen: Rohit & Ishan)
  const siraj = blrPlayers[7];
  const ferguson = blrPlayers[9];
  const rohit = mumPlayers[0];
  const ishan = mumPlayers[1];
  const surya = mumPlayers[2];

  const match1Deliveries = [
    // Over 1 (Siraj)
    { inn: inn1.id, over: 1, ball: 1, legal: 1, striker: rohit.id, non: ishan.id, bowl: siraj.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Siraj opens with a testing back of a length delivery, defended to cover.' },
    { inn: inn1.id, over: 1, ball: 2, legal: 2, striker: rohit.id, non: ishan.id, bowl: siraj.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! Rohit stands tall and punches handsomely through the gap at extra cover!' },
    { inn: inn1.id, over: 1, ball: 3, legal: 3, striker: rohit.id, non: ishan.id, bowl: siraj.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Tucked off the hips toward deep square leg for a single.' },
    { inn: inn1.id, over: 1, ball: 4, legal: 4, striker: ishan.id, non: rohit.id, bowl: siraj.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Beaten on the outside edge with brilliant seam movement.' },
    { inn: inn1.id, over: 1, ball: 5, legal: 5, striker: ishan.id, non: rohit.id, bowl: siraj.id, runs: 6, is4: false, is6: true, isW: false, comm: 'SIX! Ishan picks the length early and deposits it way back over midwicket!' },
    { inn: inn1.id, over: 1, ball: 6, legal: 6, striker: ishan.id, non: rohit.id, bowl: siraj.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Dabbed softly toward third man to retain the strike.' },

    // Over 2 (Ferguson)
    { inn: inn1.id, over: 2, ball: 1, legal: 1, striker: rohit.id, non: ishan.id, bowl: ferguson.id, runs: 0, is4: false, is6: false, isW: false, comm: '148 km/h thunderbolt! Defended solidly.' },
    { inn: inn1.id, over: 2, ball: 2, legal: 2, striker: rohit.id, non: ishan.id, bowl: ferguson.id, runs: 6, is4: false, is6: true, isW: false, comm: 'SIX! Rohit pull shot in trademark fashion sailing into the top tier!' },
    { inn: inn1.id, over: 2, ball: 3, legal: 3, striker: rohit.id, non: ishan.id, bowl: ferguson.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single taken into the off side.' },
    { inn: inn1.id, over: 2, ball: 4, legal: 4, striker: ishan.id, non: rohit.id, bowl: ferguson.id, runs: 0, is4: false, is6: false, isW: true, wType: 'CAUGHT', dis: ishan.id, fielder: blrPlayers[0].id, comm: 'OUT! Caught by Kohli at mid-off! Ferguson gets the breakthrough.' },
    { inn: inn1.id, over: 2, ball: 5, legal: 5, striker: surya.id, non: rohit.id, bowl: ferguson.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! First ball flick over fine leg with trademark audacity from Suryakumar!' },
    { inn: inn1.id, over: 2, ball: 6, legal: 6, striker: surya.id, non: rohit.id, bowl: ferguson.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single pushed down to long on.' },

    // Over 3 (Siraj)
    { inn: inn1.id, over: 3, ball: 1, legal: 1, striker: surya.id, non: rohit.id, bowl: siraj.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! Sliced over point for a boundary.' },
    { inn: inn1.id, over: 3, ball: 2, legal: 2, striker: surya.id, non: rohit.id, bowl: siraj.id, runs: 2, is4: false, is6: false, isW: false, comm: 'Couple taken with good running between wickets.' },
    { inn: inn1.id, over: 3, ball: 3, legal: 3, striker: surya.id, non: rohit.id, bowl: siraj.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single to deep cover.' },
    { inn: inn1.id, over: 3, ball: 4, legal: 4, striker: rohit.id, non: surya.id, bowl: siraj.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! Steered through backward point.' },
    { inn: inn1.id, over: 3, ball: 5, legal: 5, striker: rohit.id, non: surya.id, bowl: siraj.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Dot ball on off stump.' },
    { inn: inn1.id, over: 3, ball: 6, legal: 6, striker: rohit.id, non: surya.id, bowl: siraj.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Quick single to retain strike.' },

    // Over 4 (Ferguson)
    { inn: inn1.id, over: 4, ball: 1, legal: 1, striker: rohit.id, non: surya.id, bowl: ferguson.id, runs: 6, is4: false, is6: true, isW: false, comm: 'SIX! Magnificent lofted drive straight over the sightscreen!' },
    { inn: inn1.id, over: 4, ball: 2, legal: 2, striker: rohit.id, non: surya.id, bowl: ferguson.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single down to third man.' },
    { inn: inn1.id, over: 4, ball: 3, legal: 3, striker: surya.id, non: rohit.id, bowl: ferguson.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! Scoop over fine leg!' },
    { inn: inn1.id, over: 4, ball: 4, legal: 4, striker: surya.id, non: rohit.id, bowl: ferguson.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single to midwicket.' },
    { inn: inn1.id, over: 4, ball: 5, legal: 5, striker: rohit.id, non: surya.id, bowl: ferguson.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Dabbed to third man.' },
    { inn: inn1.id, over: 4, ball: 6, legal: 6, striker: surya.id, non: rohit.id, bowl: ferguson.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single to close out over.' },
  ];

  for (const b of match1Deliveries) {
    await prisma.ballEvent.create({
      data: {
        inningsId: b.inn,
        overNumber: b.over,
        ballNumber: b.legal,
        legalBallNumber: b.legal,
        isLegalBall: true,
        batsmanId: b.striker,
        nonStrikerId: b.non,
        bowlerId: b.bowl,
        runsScored: b.runs,
        extraRuns: 0,
        isWicket: b.isW,
        wicketType: b.wType || null,
        dismissedPlayerId: b.dis || null,
        fielderId: b.fielder || null,
        isBoundaryFour: b.is4,
        isBoundarySix: b.is6,
        commentary: b.comm,
      },
    });
  }

  // Innings 2: Bangalore Titans (30 runs in 4 overs sample, Mumbai wins by 24 runs)
  const inn2 = await prisma.innings.create({
    data: {
      matchId: match1.id,
      inningsNumber: 2,
      battingTeamId: team2.id,
      bowlingTeamId: team1.id,
      totalRuns: 30,
      wickets: 2,
      overs: 4.0,
      legalBalls: 24,
      targetRuns: 55,
      isCompleted: true,
    },
  });

  const bumrah = mumPlayers[7];
  const coetzee = mumPlayers[8];
  const virat = blrPlayers[0];
  const faf = blrPlayers[1];
  const patidar = blrPlayers[2];

  const inn2Deliveries = [
    // Over 1 (Bumrah)
    { inn: inn2.id, over: 1, ball: 1, legal: 1, striker: virat.id, non: faf.id, bowl: bumrah.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Bumrah starts with pinpoint line on fourth stump.' },
    { inn: inn2.id, over: 1, ball: 2, legal: 2, striker: virat.id, non: faf.id, bowl: bumrah.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! Exquisite cover drive from Virat Kohli!' },
    { inn: inn2.id, over: 1, ball: 3, legal: 3, striker: virat.id, non: faf.id, bowl: bumrah.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Defended to point.' },
    { inn: inn2.id, over: 1, ball: 4, legal: 4, striker: virat.id, non: faf.id, bowl: bumrah.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single off the inner half to deep square.' },
    { inn: inn2.id, over: 1, ball: 5, legal: 5, striker: faf.id, non: virat.id, bowl: bumrah.id, runs: 0, is4: false, is6: false, isW: true, wType: 'BOWLED', dis: faf.id, comm: 'OUT! BOWLED HIM! Unplayable yorker from Bumrah crashes into middle stump!' },
    { inn: inn2.id, over: 1, ball: 6, legal: 6, striker: patidar.id, non: virat.id, bowl: bumrah.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Patidar defends first ball safely.' },

    // Over 2 (Coetzee)
    { inn: inn2.id, over: 2, ball: 1, legal: 1, striker: virat.id, non: patidar.id, bowl: coetzee.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! Cracked through backward point.' },
    { inn: inn2.id, over: 2, ball: 2, legal: 2, striker: virat.id, non: patidar.id, bowl: coetzee.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single down to third man.' },
    { inn: inn2.id, over: 2, ball: 3, legal: 3, striker: patidar.id, non: virat.id, bowl: coetzee.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Swing and a miss.' },
    { inn: inn2.id, over: 2, ball: 4, legal: 4, striker: patidar.id, non: virat.id, bowl: coetzee.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! Pulled through midwicket.' },
    { inn: inn2.id, over: 2, ball: 5, legal: 5, striker: patidar.id, non: virat.id, bowl: coetzee.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single to deep square.' },
    { inn: inn2.id, over: 2, ball: 6, legal: 6, striker: virat.id, non: patidar.id, bowl: coetzee.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single to keep strike.' },

    // Over 3 (Bumrah)
    { inn: inn2.id, over: 3, ball: 1, legal: 1, striker: virat.id, non: patidar.id, bowl: bumrah.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Dot ball, good length on off.' },
    { inn: inn2.id, over: 3, ball: 2, legal: 2, striker: virat.id, non: patidar.id, bowl: bumrah.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single pushed into mid-on.' },
    { inn: inn2.id, over: 3, ball: 3, legal: 3, striker: patidar.id, non: virat.id, bowl: bumrah.id, runs: 0, is4: false, is6: false, isW: true, wType: 'LBW', dis: patidar.id, comm: 'OUT! LBW! Trapped right in front by Bumrah! Umpire raises the finger.' },
    { inn: inn2.id, over: 3, ball: 4, legal: 4, striker: blrPlayers[3].id, non: virat.id, bowl: bumrah.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Glenn Maxwell defends.' },
    { inn: inn2.id, over: 3, ball: 5, legal: 5, striker: blrPlayers[3].id, non: virat.id, bowl: bumrah.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single to third man.' },
    { inn: inn2.id, over: 3, ball: 6, legal: 6, striker: virat.id, non: blrPlayers[3].id, bowl: bumrah.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Dot ball to end a brilliant over.' },

    // Over 4 (Coetzee)
    { inn: inn2.id, over: 4, ball: 1, legal: 1, striker: blrPlayers[3].id, non: virat.id, bowl: coetzee.id, runs: 6, is4: false, is6: true, isW: false, comm: 'SIX! Maxwell unleashes a reverse sweep over third man!' },
    { inn: inn2.id, over: 4, ball: 2, legal: 2, striker: blrPlayers[3].id, non: virat.id, bowl: coetzee.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single taken.' },
    { inn: inn2.id, over: 4, ball: 3, legal: 3, striker: virat.id, non: blrPlayers[3].id, bowl: coetzee.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! Whipped through midwicket.' },
    { inn: inn2.id, over: 4, ball: 4, legal: 4, striker: virat.id, non: blrPlayers[3].id, bowl: coetzee.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single down to deep point.' },
    { inn: inn2.id, over: 4, ball: 5, legal: 5, striker: blrPlayers[3].id, non: virat.id, bowl: coetzee.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single to long off.' },
    { inn: inn2.id, over: 4, ball: 6, legal: 6, striker: virat.id, non: blrPlayers[3].id, bowl: coetzee.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Dot ball to finish.' },
  ];

  for (const b of inn2Deliveries) {
    await prisma.ballEvent.create({
      data: {
        inningsId: b.inn,
        overNumber: b.over,
        ballNumber: b.legal,
        legalBallNumber: b.legal,
        isLegalBall: true,
        batsmanId: b.striker,
        nonStrikerId: b.non,
        bowlerId: b.bowl,
        runsScored: b.runs,
        extraRuns: 0,
        isWicket: b.isW,
        wicketType: b.wType || null,
        dismissedPlayerId: b.dis || null,
        isBoundaryFour: b.is4,
        isBoundarySix: b.is6,
        commentary: b.comm,
      },
    });
  }

  // 8. Seed Live Match 2 (Bangalore 1st Innings active)
  const innLive = await prisma.innings.create({
    data: {
      matchId: match2.id,
      inningsNumber: 1,
      battingTeamId: team2.id,
      bowlingTeamId: team1.id,
      totalRuns: 18,
      wickets: 0,
      overs: 1.4,
      legalBalls: 10,
      currentStrikerId: virat.id,
      currentNonStrikerId: faf.id,
      currentBowlerId: bumrah.id,
      isCompleted: false,
    },
  });

  const liveDeliveries = [
    { inn: innLive.id, over: 1, ball: 1, legal: 1, striker: virat.id, non: faf.id, bowl: coetzee.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Kohli clips it to fine leg for a single.' },
    { inn: innLive.id, over: 1, ball: 2, legal: 2, striker: faf.id, non: virat.id, bowl: coetzee.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! Du Plessis punches through mid-off.' },
    { inn: innLive.id, over: 1, ball: 3, legal: 3, striker: faf.id, non: virat.id, bowl: coetzee.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Defended back to the bowler.' },
    { inn: innLive.id, over: 1, ball: 4, legal: 4, striker: faf.id, non: virat.id, bowl: coetzee.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Pushed into the gap for one.' },
    { inn: innLive.id, over: 1, ball: 5, legal: 5, striker: virat.id, non: faf.id, bowl: coetzee.id, runs: 6, is4: false, is6: true, isW: false, comm: 'SIX! Magnificent pull shot into the grandstand!' },
    { inn: innLive.id, over: 1, ball: 6, legal: 6, striker: virat.id, non: faf.id, bowl: coetzee.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single taken to keep strike for over 2.' },

    { inn: innLive.id, over: 2, ball: 1, legal: 1, striker: faf.id, non: virat.id, bowl: bumrah.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Bumrah starts with an accurate yorker.' },
    { inn: innLive.id, over: 2, ball: 2, legal: 2, striker: faf.id, non: virat.id, bowl: bumrah.id, runs: 1, is4: false, is6: false, isW: false, comm: 'Single to deep third.' },
    { inn: innLive.id, over: 2, ball: 3, legal: 3, striker: virat.id, non: faf.id, bowl: bumrah.id, runs: 4, is4: true, is6: false, isW: false, comm: 'FOUR! Glanced elegantly through fine leg.' },
    { inn: innLive.id, over: 2, ball: 4, legal: 4, striker: virat.id, non: faf.id, bowl: bumrah.id, runs: 0, is4: false, is6: false, isW: false, comm: 'Beaten by sheer pace outside off.' },
  ];

  for (const b of liveDeliveries) {
    await prisma.ballEvent.create({
      data: {
        inningsId: b.inn,
        overNumber: b.over,
        ballNumber: b.legal,
        legalBallNumber: b.legal,
        isLegalBall: true,
        batsmanId: b.striker,
        nonStrikerId: b.non,
        bowlerId: b.bowl,
        runsScored: b.runs,
        extraRuns: 0,
        isWicket: b.isW,
        isBoundaryFour: b.is4,
        isBoundarySix: b.is6,
        commentary: b.comm,
      },
    });
  }

  // 9. Create System Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: superAdmin.id,
        type: 'INFO',
        title: 'Platform Online',
        message: 'Cricket Master Phase 1 Core Cricket System active with full scoring engine.',
      },
      {
        userId: scorer.id,
        type: 'MATCH_UPDATE',
        title: 'Match Live: BLR vs MUM',
        message: 'You are actively scoring Match 2: Bangalore Titans vs Mumbai Strikers.',
      },
    ],
  });

  // 10. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: superAdmin.id,
        action: 'PHASE_1_SEED',
        entity: 'system',
        ipAddress: '127.0.0.1',
        userAgent: 'Seeder/1.0',
        details: JSON.stringify({ phase: 'PHASE_1_CORE_CRICKET_SYSTEM', fixtures: 3, players: 24 }),
      },
    ],
  });

  console.log('✅ Created ball-by-ball events, complete match scorecards, and live match data.');
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Database seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

