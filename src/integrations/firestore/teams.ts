import type { Firestore } from "firebase-admin/firestore";
import { ok, err, type Result } from "../../utils/result.js";
import { checkQuizNotEnded } from "./quiz.js";
import { logger } from "../../utils/logger.js";

export interface Team {
  name: string;
  captain: string;
  members: string[];
  roleId: string;
  textChannelId: string;
  voiceChannelId: string;
  color: string;
  registeredAt?: string;
}


export async function createTeam(
  db: Firestore,
  guildId: string,
  quizDate: string,
  team: Omit<Team, "registeredAt">,
): Promise<Result<Team>> {
  const guard = await checkQuizNotEnded(db, guildId, quizDate);
  if (!guard.ok) return guard;

  const record: Team = { ...team, registeredAt: new Date().toISOString() };

  await db.collection(`guilds/${guildId}/quizzes/${quizDate}/teams`).doc(team.name).set(record);
  logger.info({ path: `guilds/${guildId}/quizzes/${quizDate}/teams/${team.name}` }, "Firestore: created team");

  return ok(record);
}

export async function getTeam(
  db: Firestore,
  guildId: string,
  quizDate: string,
  teamName: string,
): Promise<Result<Team>> {
  const snapshot = await db
    .collection(`guilds/${guildId}/quizzes/${quizDate}/teams`)
    .doc(teamName)
    .get();

  if (!snapshot.exists) {
    return err(`Team "${teamName}" not found`);
  }

  return ok(snapshot.data() as Team);
}

export async function listTeams(
  db: Firestore,
  guildId: string,
  quizDate: string,
): Promise<Result<Team[]>> {
  const snapshot = await db.collection(`guilds/${guildId}/quizzes/${quizDate}/teams`).get();

  const teams = snapshot.docs.map((doc) => doc.data() as Team);
  return ok(teams);
}

export async function deleteTeam(
  db: Firestore,
  guildId: string,
  quizDate: string,
  teamName: string,
): Promise<Result<void>> {
  const guard = await checkQuizNotEnded(db, guildId, quizDate);
  if (!guard.ok) return guard;

  const docRef = db.collection(`guilds/${guildId}/quizzes/${quizDate}/teams`).doc(teamName);

  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return err(`Team "${teamName}" not found`);
  }

  await docRef.delete();
  logger.info({ path: `guilds/${guildId}/quizzes/${quizDate}/teams/${teamName}` }, "Firestore: deleted team");
  return ok(undefined);
}

export async function updateTeam(
  db: Firestore,
  guildId: string,
  quizDate: string,
  teamName: string,
  fields: Partial<Omit<Team, "name" | "registeredAt">>,
): Promise<Result<void>> {
  const guard = await checkQuizNotEnded(db, guildId, quizDate);
  if (!guard.ok) return guard;

  const docRef = db.collection(`guilds/${guildId}/quizzes/${quizDate}/teams`).doc(teamName);

  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return err(`Team "${teamName}" not found`);
  }

  await docRef.update(fields);
  logger.info({ path: `guilds/${guildId}/quizzes/${quizDate}/teams/${teamName}`, fields: Object.keys(fields) }, "Firestore: updated team");
  return ok(undefined);
}
