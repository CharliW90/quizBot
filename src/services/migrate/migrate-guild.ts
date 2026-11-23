import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";
import { parseV3Team, type V3Team } from "./parse-v3-team.js";
import { parseV3Round, type V3Round } from "./parse-v3-round.js";
import { logger } from "../../utils/logger.js";

type Firestore = firestore.Firestore;

export interface MigrateResult {
  quizzesMigrated: number;
  totalTeams: number;
  totalRounds: number;
  usersMigrated: number;
}

export async function migrateGuild(
  db: Firestore,
  guildId: string,
): Promise<Result<MigrateResult>> {
  logger.info({ guildId }, "[migrate] Starting full V3 to V4 migration");

  // Step A - Migrate all quizzes
  const v3QuizzesSnap = await db.collection(`Servers/${guildId}/Quizzes`).get();

  if (v3QuizzesSnap.empty) {
    return err(`No V3 quiz data found for guild ${guildId}`);
  }

  let quizzesMigrated = 0;
  let totalTeams = 0;
  let totalRounds = 0;

  for (const quizDoc of v3QuizzesSnap.docs) {
    const quizDate = quizDoc.id;
    const v3Quiz = quizDoc.data() as { ended?: boolean; date?: string };
    const status = v3Quiz.ended ? "ended" : "active";
    const v3QuizPath = `Servers/${guildId}/Quizzes/${quizDate}`;
    const v4QuizPath = `guilds/${guildId}/quizzes/${quizDate}`;

    // Write V4 quiz session doc
    await db.doc(v4QuizPath).set({
      status,
      createdAt: "migrated",
    });

    // Migrate teams
    const v3TeamsSnap = await db.collection(`${v3QuizPath}/Teams`).get();
    for (const teamDoc of v3TeamsSnap.docs) {
      const v3Team = teamDoc.data() as V3Team;
      const v4Team = parseV3Team(v3Team);
      await db.doc(`${v4QuizPath}/teams/${teamDoc.id}`).set(v4Team);
      totalTeams++;
    }

    // Migrate rounds
    const v3RoundsSnap = await db.collection(`${v3QuizPath}/Rounds`).get();
    for (const roundDoc of v3RoundsSnap.docs) {
      const v3Round = roundDoc.data() as V3Round;
      const v4Round = parseV3Round(roundDoc.id, v3Round);
      await db.doc(`${v4QuizPath}/rounds/${v4Round.roundNumber}`).set(v4Round);
      totalRounds++;
    }

    // Migrate maps
    const v3AliasSnap = await db.doc(`${v3QuizPath}/Maps/Teams Aliases`).get();
    if (v3AliasSnap.exists) {
      await db.doc(`${v4QuizPath}/maps/teamsAliases`).set(v3AliasSnap.data()!);
    }

    const v3MembersSnap = await db.doc(`${v3QuizPath}/Maps/Teams Members`).get();
    if (v3MembersSnap.exists) {
      await db.doc(`${v4QuizPath}/maps/teamsMembers`).set(v3MembersSnap.data()!);
    }

    logger.info({ quizDate, teams: v3TeamsSnap.docs.length, rounds: v3RoundsSnap.docs.length }, `[migrate] Migrated quiz ${quizDate}`);
    quizzesMigrated++;
  }

  // Step B - Migrate all users
  const v3UsersSnap = await db.collection("Users").get();
  let usersMigrated = 0;

  for (const userDoc of v3UsersSnap.docs) {
    const userId = userDoc.id;
    const v3User = userDoc.data() as {
      currentName?: string;
      initialName?: string;
      username?: string;
    };

    // Write V4 user doc
    await db.doc(`users/${userId}`).set({
      currentName: v3User.currentName ?? "",
      initialName: v3User.initialName ?? "",
      username: v3User.username ?? "",
    });

    // Check for guild-specific records
    const v3ServersSnap = await db.collection(`Users/${userId}/Servers`).get();
    for (const serverDoc of v3ServersSnap.docs) {
      // Only migrate records for the current guild
      if (serverDoc.id !== guildId) continue;

      const v3GuildData = serverDoc.data() as {
        usersTeams?: string[];
        serverName?: string;
      };

      await db.doc(`users/${userId}/servers/${serverDoc.id}`).set({
        usersTeams: v3GuildData.usersTeams ?? [],
        server: {
          name: v3GuildData.serverName ?? "",
          owner: "",
          initialName: v3GuildData.serverName ?? "",
          initialOwner: "",
        },
      });
    }

    usersMigrated++;
  }

  logger.info({ quizzesMigrated, totalTeams, totalRounds, usersMigrated }, "[migrate] Migration complete");

  return ok({
    quizzesMigrated,
    totalTeams,
    totalRounds,
    usersMigrated,
  });
}
