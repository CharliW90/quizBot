import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";
import { checkQuizNotEnded } from "./quiz.js";

export interface Answer {
  answer: string;
  score: number;
  correct: boolean;
}

export interface TeamResponse {
  answers: Answer[];
  score: number;
}

export interface HistoryEntry {
  responses: Record<string, TeamResponse>;
  fetchedAt: string;
}

export interface RoundData {
  roundNumber: number;
  formId: string;
  responses: Record<string, TeamResponse>;
  fetchedAt: string;
  publishedAt: string | null;
  history: HistoryEntry[];
}

type Firestore = firestore.Firestore;

function roundsCollection(guildId: string, quizDate: string) {
  return `guilds/${guildId}/quizzes/${quizDate}/rounds`;
}

export async function storeRound(
  db: Firestore,
  guildId: string,
  quizDate: string,
  input: { roundNumber: number; formId: string; responses: RoundData["responses"] }
): Promise<Result<RoundData>> {
  const guard = await checkQuizNotEnded(db, guildId, quizDate);
  if (!guard.ok) return guard;

  const docRef = db
    .collection(roundsCollection(guildId, quizDate))
    .doc(String(input.roundNumber));

  const existing = await docRef.get();
  const history: RoundData["history"] = [];

  if (existing.exists) {
    const prev = existing.data() as Omit<RoundData, "roundNumber">;
    if (prev.history) {
      history.push(...prev.history);
    }
    history.unshift({
      responses: prev.responses,
      fetchedAt: prev.fetchedAt,
    });
  }

  const record: Omit<RoundData, "roundNumber"> = {
    formId: input.formId,
    responses: input.responses,
    fetchedAt: new Date().toISOString(),
    publishedAt: null,
    history,
  };

  await docRef.set(record);
  return ok({ ...record, roundNumber: input.roundNumber });
}

export async function getRound(
  db: Firestore,
  guildId: string,
  quizDate: string,
  roundNumber: number
): Promise<Result<RoundData>> {
  const snapshot = await db
    .collection(roundsCollection(guildId, quizDate))
    .doc(String(roundNumber))
    .get();

  if (!snapshot.exists) {
    return err(`Round ${roundNumber} not found`);
  }

  const data = snapshot.data() as Omit<RoundData, "roundNumber">;
  return ok({ ...data, roundNumber });
}

export async function listRounds(
  db: Firestore,
  guildId: string,
  quizDate: string
): Promise<Result<RoundData[]>> {
  const snapshot = await db
    .collection(roundsCollection(guildId, quizDate))
    .get();

  const rounds = snapshot.docs.map((doc) => ({
    ...(doc.data() as Omit<RoundData, "roundNumber">),
    roundNumber: Number(doc.id),
  }));

  return ok(rounds);
}

export async function publishRound(
  db: Firestore,
  guildId: string,
  quizDate: string,
  roundNumber: number
): Promise<Result<void>> {
  const guard = await checkQuizNotEnded(db, guildId, quizDate);
  if (!guard.ok) return guard;

  const docRef = db
    .collection(roundsCollection(guildId, quizDate))
    .doc(String(roundNumber));

  const snapshot = await docRef.get();
  if (!snapshot.exists) {
    return err(`Round ${roundNumber} not found`);
  }

  await docRef.update({ publishedAt: new Date().toISOString() });
  return ok(undefined);
}
