import { initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const PROJECT_ID = "demo-quizbot";
let db: Firestore | null = null;

export function getTestDb(): Firestore {
  if (!db) {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    const app = initializeApp({ projectId: PROJECT_ID }, `test-${Date.now()}`);
    db = getFirestore(app);
  }
  return db;
}

export async function clearFirestore(): Promise<void> {
  const res = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    throw new Error(`Failed to clear Firestore emulator: ${res.status}`);
  }
}
