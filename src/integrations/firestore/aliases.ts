import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";
import { checkQuizNotEnded } from "./quiz.js";

type Firestore = firestore.Firestore;

function aliasesDocPath(guildId: string, quizDate: string) {
  return `guilds/${guildId}/quizzes/${quizDate}/maps/teamsAliases`;
}

export async function setAlias(
  db: Firestore,
  guildId: string,
  quizDate: string,
  alias: string,
  teamName: string
): Promise<Result<void>> {
  const guard = await checkQuizNotEnded(db, guildId, quizDate);
  if (!guard.ok) return guard;

  const docRef = db.doc(aliasesDocPath(guildId, quizDate));

  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    await docRef.set({ [alias]: teamName });
  } else {
    await docRef.update({ [alias]: teamName });
  }

  return ok(undefined);
}

export async function getAliases(
  db: Firestore,
  guildId: string,
  quizDate: string
): Promise<Result<Record<string, string>>> {
  const docRef = db.doc(aliasesDocPath(guildId, quizDate));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return ok({});
  }

  return ok(snapshot.data() as Record<string, string>);
}

export async function lookupAlias(
  db: Firestore,
  guildId: string,
  quizDate: string,
  alias: string
): Promise<Result<string | null>> {
  const docRef = db.doc(aliasesDocPath(guildId, quizDate));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return ok(null);
  }

  const data = snapshot.data() as Record<string, string>;
  return ok(data[alias] ?? null);
}

export async function deleteAliasesForTeam(
  db: Firestore,
  guildId: string,
  quizDate: string,
  teamName: string
): Promise<Result<string[]>> {
  const guard = await checkQuizNotEnded(db, guildId, quizDate);
  if (!guard.ok) return guard;

  const docRef = db.doc(aliasesDocPath(guildId, quizDate));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return ok([]);
  }

  const data = snapshot.data() as Record<string, string>;
  const deletedAliases: string[] = [];
  const updated: Record<string, string> = {};

  for (const [alias, team] of Object.entries(data)) {
    if (team === teamName) {
      deletedAliases.push(alias);
    } else {
      updated[alias] = team;
    }
  }

  await docRef.set(updated);
  return ok(deletedAliases);
}
