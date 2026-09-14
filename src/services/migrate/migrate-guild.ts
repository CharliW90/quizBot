import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";
import { parseV3Team, type V3Team } from "./parse-v3-team.js";
import { parseV3Round, type V3Round } from "./parse-v3-round.js";
import { logger } from "../../utils/logger.js";

type Firestore = firestore.Firestore;

export interface MigrateResult {
  teamsMigrated: number;
  roundsMigrated: number;
  aliasesMigrated: boolean;
  membersMigrated: boolean;
  quizStatus: string;
}

export async function migrateGuild(
  db: Firestore,
  guildId: string,
  quizDate: string
): Promise<Result<MigrateResult>> {
  const v3QuizPath = `Servers/${guildId}/Quizzes/${quizDate}`;
  const v4QuizPath = `guilds/${guildId}/quizzes/${quizDate}`;

  // 1. Check V3 quiz exists
  const v3QuizSnap = await db.doc(v3QuizPath).get();
  if (!v3QuizSnap.exists) {
    return err(`V3 quiz not found at ${v3QuizPath}`);
  }

  const v3Quiz = v3QuizSnap.data() as { ended?: boolean; date?: string };
  const status = v3Quiz.ended ? "ended" : "active";

  // 2. Write V4 quiz session
  await db.doc(v4QuizPath).set({
    status,
    createdAt: "migrated",
  });

  // 3. Migrate teams
  const v3TeamsSnap = await db.collection(`${v3QuizPath}/Teams`).get();
  let teamsMigrated = 0;

  for (const doc of v3TeamsSnap.docs) {
    const v3Team = doc.data() as V3Team;
    const v4Team = parseV3Team(v3Team);
    await db.doc(`${v4QuizPath}/teams/${doc.id}`).set(v4Team);
    teamsMigrated++;
  }

  // 4. Migrate rounds
  const v3RoundsSnap = await db.collection(`${v3QuizPath}/Rounds`).get();
  let roundsMigrated = 0;

  for (const doc of v3RoundsSnap.docs) {
    const v3Round = doc.data() as V3Round;
    const v4Round = parseV3Round(doc.id, v3Round);
    await db.doc(`${v4QuizPath}/rounds/${v4Round.roundNumber}`).set(v4Round);
    roundsMigrated++;
  }

  // 5. Migrate maps
  let aliasesMigrated = false;
  const v3AliasSnap = await db.doc(`${v3QuizPath}/Maps/Teams Aliases`).get();
  if (v3AliasSnap.exists) {
    await db.doc(`${v4QuizPath}/maps/teamsAliases`).set(v3AliasSnap.data()!);
    aliasesMigrated = true;
  }

  let membersMigrated = false;
  const v3MembersSnap = await db.doc(`${v3QuizPath}/Maps/Teams Members`).get();
  if (v3MembersSnap.exists) {
    await db.doc(`${v4QuizPath}/maps/teamsMembers`).set(v3MembersSnap.data()!);
    membersMigrated = true;
  }

  return ok({
    teamsMigrated,
    roundsMigrated,
    aliasesMigrated,
    membersMigrated,
    quizStatus: status,
  });
}
