import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";
import { checkQuizNotEnded } from "./quiz.js";

type Firestore = firestore.Firestore;

export interface ScoreboardEntry {
  rounds: number[];
  total: number;
}

export interface Scoreboard {
  current: Record<string, ScoreboardEntry>;
  history: Record<string, ScoreboardEntry>[];
}

function quizDocPath(guildId: string, quizDate: string) {
  return `guilds/${guildId}/quizzes/${quizDate}`;
}

export async function addScoreboard(
  db: Firestore,
  guildId: string,
  quizDate: string,
  scoreboard: Record<string, ScoreboardEntry>
): Promise<Result<void>> {
  const guard = await checkQuizNotEnded(db, guildId, quizDate);
  if (!guard.ok) return guard;

  const docRef = db.doc(quizDocPath(guildId, quizDate));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return err(`Quiz for ${quizDate} not found`);
  }

  const data = snapshot.data() as Record<string, unknown>;
  const existing = data.scoreboard as Scoreboard | undefined;

  if (existing?.current) {
    const history = existing.history ?? [];
    history.unshift(existing.current);
    await docRef.update({ scoreboard: { current: scoreboard, history } });
  } else {
    await docRef.update({ scoreboard: { current: scoreboard, history: [] } });
  }

  return ok(undefined);
}

export async function getScoreboard(
  db: Firestore,
  guildId: string,
  quizDate: string
): Promise<Result<Record<string, ScoreboardEntry> | null>> {
  const docRef = db.doc(quizDocPath(guildId, quizDate));
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return err(`Quiz for ${quizDate} not found`);
  }

  const data = snapshot.data() as Record<string, unknown>;
  const scoreboard = data.scoreboard as Scoreboard | undefined;

  if (!scoreboard?.current) {
    return ok(null);
  }

  return ok(scoreboard.current);
}
