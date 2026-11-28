import type { Firestore } from "firebase-admin/firestore";
import { ok, err, type Result } from "../../utils/result.js";
import { parseV3Team, validateV3Team, type V3Team } from "./parse-v3-team.js";
import { parseV3Round, validateV3Round, type V3Round } from "./parse-v3-round.js";
import { logger } from "../../utils/logger.js";

export type QuizMigrateStatus = "ok" | "warning" | "skip";

export interface QuizDetail {
  date: string;
  status: QuizMigrateStatus;
  warnings: string[];
  teamCount: number;
  roundCount: number;
  wouldOverwrite: boolean;
}

export interface MigrateResult {
  quizzesMigrated: number;
  totalTeams: number;
  totalRounds: number;
  usersMigrated: number;
  quizDetails?: QuizDetail[];
}

async function analyseQuiz(
  db: Firestore,
  guildId: string,
  quizDate: string,
): Promise<QuizDetail> {
  const v3QuizPath = `Servers/${guildId}/Quizzes/${quizDate}`;
  const v4QuizPath = `guilds/${guildId}/quizzes/${quizDate}`;
  const warnings: string[] = [];

  const v3TeamsSnap = await db.collection(`${v3QuizPath}/Teams`).get();
  const v3RoundsSnap = await db.collection(`${v3QuizPath}/Rounds`).get();

  if (v3TeamsSnap.empty && v3RoundsSnap.empty) {
    return { date: quizDate, status: "skip", warnings: ["empty - no teams or rounds"], teamCount: 0, roundCount: 0, wouldOverwrite: false };
  }

  for (const teamDoc of v3TeamsSnap.docs) {
    const v3Team = teamDoc.data() as V3Team;
    const teamWarnings = validateV3Team(v3Team);
    if (teamWarnings.length > 0) {
      const name = v3Team.teamName ?? teamDoc.id;
      warnings.push(`team "${name}": ${teamWarnings.join(", ")}`);
    }
  }

  for (const roundDoc of v3RoundsSnap.docs) {
    const v3Round = roundDoc.data() as V3Round;
    const roundWarnings = validateV3Round(v3Round);
    if (roundWarnings.length > 0) {
      warnings.push(`${roundDoc.id}: ${roundWarnings.join(", ")}`);
    }
  }

  const v4Exists = await db.doc(v4QuizPath).get();
  const wouldOverwrite = v4Exists.exists;
  if (wouldOverwrite) {
    warnings.push("V4 data already exists - would overwrite");
  }

  const status: QuizMigrateStatus = warnings.length > 0 ? "warning" : "ok";

  return {
    date: quizDate,
    status,
    warnings,
    teamCount: v3TeamsSnap.docs.length,
    roundCount: v3RoundsSnap.docs.length,
    wouldOverwrite,
  };
}

async function dryRunMigration(
  db: Firestore,
  guildId: string,
): Promise<Result<MigrateResult>> {
  const v3QuizzesSnap = await db.collection(`Servers/${guildId}/Quizzes`).get();

  if (v3QuizzesSnap.empty) {
    return err(`No V3 quiz data found for guild ${guildId}`);
  }

  const quizDetails: QuizDetail[] = [];
  let totalTeams = 0;
  let totalRounds = 0;

  for (const quizDoc of v3QuizzesSnap.docs) {
    const detail = await analyseQuiz(db, guildId, quizDoc.id);
    quizDetails.push(detail);

    if (detail.status !== "skip") {
      totalTeams += detail.teamCount;
      totalRounds += detail.roundCount;
    }
  }

  const v3UsersSnap = await db.collection("Users").get();

  const quizzesMigrated = quizDetails.filter((q) => q.status !== "skip").length;

  logger.info(
    { quizzesMigrated, skipped: quizDetails.length - quizzesMigrated, totalTeams, totalRounds, users: v3UsersSnap.docs.length },
    "[migrate] Dry run complete",
  );

  return ok({
    quizzesMigrated,
    totalTeams,
    totalRounds,
    usersMigrated: v3UsersSnap.docs.length,
    quizDetails,
  });
}

export async function migrateGuild(
  db: Firestore,
  guildId: string,
  dryRun = false,
): Promise<Result<MigrateResult>> {
  logger.info({ guildId, dryRun }, "[migrate] Starting full V3 to V4 migration");

  if (dryRun) {
    return dryRunMigration(db, guildId);
  }

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

    const v3TeamsSnap = await db.collection(`${v3QuizPath}/Teams`).get();
    const v3RoundsSnap = await db.collection(`${v3QuizPath}/Rounds`).get();

    if (v3TeamsSnap.empty && v3RoundsSnap.empty) {
      logger.info({ quizDate }, "[migrate] Skipping empty quiz date");
      continue;
    }

    // Write V4 quiz session doc
    await db.doc(v4QuizPath).set({
      status,
      createdAt: "migrated",
    });

    // Migrate teams
    for (const teamDoc of v3TeamsSnap.docs) {
      const v3Team = teamDoc.data() as V3Team;
      const v4Team = parseV3Team(v3Team);
      await db.doc(`${v4QuizPath}/teams/${teamDoc.id}`).set(v4Team);
      totalTeams++;
    }

    // Migrate rounds
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
