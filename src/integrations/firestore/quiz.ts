import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";

export interface Quiz {
  date: string;
  status: "active" | "ended";
  createdAt: string;
}

type Firestore = firestore.Firestore;

export async function createQuiz(
  db: Firestore,
  guildId: string,
  quizDate: string
): Promise<Result<Quiz>> {
  const docRef = db.collection(`guilds/${guildId}/quizzes`).doc(quizDate);
  const snapshot = await docRef.get();

  if (snapshot.exists) {
    return err(`Quiz for ${quizDate} already exists`);
  }

  const quiz: Quiz = {
    date: quizDate,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  await docRef.set(quiz);
  return ok(quiz);
}

export async function getQuiz(
  db: Firestore,
  guildId: string,
  quizDate: string
): Promise<Result<Quiz>> {
  const snapshot = await db
    .collection(`guilds/${guildId}/quizzes`)
    .doc(quizDate)
    .get();

  if (!snapshot.exists) {
    return err(`Quiz for ${quizDate} not found`);
  }

  const data = snapshot.data() as Omit<Quiz, "date">;
  return ok({ ...data, date: quizDate });
}

export async function listQuizzes(
  db: Firestore,
  guildId: string
): Promise<Result<Quiz[]>> {
  const snapshot = await db.collection(`guilds/${guildId}/quizzes`).get();

  const quizzes = snapshot.docs.map((doc) => ({
    ...(doc.data() as Omit<Quiz, "date">),
    date: doc.id,
  }));

  return ok(quizzes);
}

export async function endQuiz(
  db: Firestore,
  guildId: string,
  quizDate: string
): Promise<Result<void>> {
  const docRef = db.collection(`guilds/${guildId}/quizzes`).doc(quizDate);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    return err(`Quiz for ${quizDate} not found`);
  }

  const data = snapshot.data() as Quiz;
  if (data.status === "ended") {
    return err(`Quiz for ${quizDate} is already ended`);
  }

  await docRef.update({ status: "ended" });
  return ok(undefined);
}
