import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";
import { checkQuizNotEnded } from "./quiz.js";

type Firestore = firestore.Firestore;

function membersDocPath(guildId: string, quizDate: string) {
  return `guilds/${guildId}/quizzes/${quizDate}/maps/teamsMembers`;
}

export async function setTeamMembers(
  db: Firestore,
  guildId: string,
  quizDate: string,
  teamName: string,
  memberIds: string[]
): Promise<Result<void>> {
  const guard = await checkQuizNotEnded(db, guildId, quizDate);
  if (!guard.ok) return guard;

  const docRef = db.doc(membersDocPath(guildId, quizDate));
  const snapshot = await docRef.get();

  const updates: Record<string, string> = {};
  for (const id of memberIds) {
    updates[id] = teamName;
  }

  if (!snapshot.exists) {
    await docRef.set(updates);
  } else {
    await docRef.update(updates);
  }

  return ok(undefined);
}

export async function getTeamMembers(
  db: Firestore,
  guildId: string,
  quizDate: string
): Promise<Result<Record<string, string>>> {
  const docRef = db.doc(membersDocPath(guildId, quizDate));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return ok({});
  }

  return ok(snapshot.data() as Record<string, string>);
}

export async function checkMembersRegistered(
  db: Firestore,
  guildId: string,
  quizDate: string,
  memberIds: string[]
): Promise<Result<{ userId: string; teamName: string }[]>> {
  const docRef = db.doc(membersDocPath(guildId, quizDate));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return ok([]);
  }

  const data = snapshot.data() as Record<string, string>;
  const conflicts = memberIds
    .filter((id) => id in data)
    .map((id) => ({ userId: id, teamName: data[id] }));

  return ok(conflicts);
}

export async function deleteTeamMembers(
  db: Firestore,
  guildId: string,
  quizDate: string,
  memberIds: string[]
): Promise<Result<void>> {
  const guard = await checkQuizNotEnded(db, guildId, quizDate);
  if (!guard.ok) return guard;

  const docRef = db.doc(membersDocPath(guildId, quizDate));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return ok(undefined);
  }

  const data = snapshot.data() as Record<string, string>;
  for (const id of memberIds) {
    delete data[id];
  }

  await docRef.set(data);
  return ok(undefined);
}
