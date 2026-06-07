import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";

export interface Answer {
  answer: string;
  score: number;
  correct: boolean;
}

export interface TeamResponse {
  answers: Answer[];
  score: number;
}

export interface RoundData {
  roundNumber: number;
  formId: string;
  responses: Record<string, TeamResponse>;
  fetchedAt: string;
  publishedAt: string | null;
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
  const docRef = db
    .collection(roundsCollection(guildId, quizDate))
    .doc(String(input.roundNumber));

  const record: Omit<RoundData, "roundNumber"> = {
    formId: input.formId,
    responses: input.responses,
    fetchedAt: new Date().toISOString(),
    publishedAt: null,
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
