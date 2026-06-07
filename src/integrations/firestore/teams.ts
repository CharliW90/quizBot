import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";

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

type Firestore = firestore.Firestore;

function teamDocPath(guildId: string, quizDate: string, teamName: string) {
  return `guilds/${guildId}/quizzes/${quizDate}/teams/${teamName}`;
}

export async function createTeam(
  db: Firestore,
  guildId: string,
  quizDate: string,
  team: Omit<Team, "registeredAt">
): Promise<Result<Team>> {
  const path = teamDocPath(guildId, quizDate, team.name);
  const record: Team = { ...team, registeredAt: new Date().toISOString() };

  await db.collection(`guilds/${guildId}/quizzes/${quizDate}/teams`).doc(team.name).set(record);

  return ok(record);
}

export async function getTeam(
  db: Firestore,
  guildId: string,
  quizDate: string,
  teamName: string
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
  quizDate: string
): Promise<Result<Team[]>> {
  const snapshot = await db
    .collection(`guilds/${guildId}/quizzes/${quizDate}/teams`)
    .get();

  const teams = snapshot.docs.map((doc) => doc.data() as Team);
  return ok(teams);
}

export async function deleteTeam(
  db: Firestore,
  guildId: string,
  quizDate: string,
  teamName: string
): Promise<Result<void>> {
  const docRef = db
    .collection(`guilds/${guildId}/quizzes/${quizDate}/teams`)
    .doc(teamName);

  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return err(`Team "${teamName}" not found`);
  }

  await docRef.delete();
  return ok(undefined);
}

export async function updateTeam(
  db: Firestore,
  guildId: string,
  quizDate: string,
  teamName: string,
  fields: Partial<Omit<Team, "name" | "registeredAt">>
): Promise<Result<void>> {
  const docRef = db
    .collection(`guilds/${guildId}/quizzes/${quizDate}/teams`)
    .doc(teamName);

  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return err(`Team "${teamName}" not found`);
  }

  await docRef.update(fields);
  return ok(undefined);
}
