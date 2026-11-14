import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { loadConfig } from "../../utils/config.js";

let db: Firestore | null = null;

export function getDb(): Firestore {
  if (!db) {
    const config = loadConfig();

    initializeApp({
      credential: applicationDefault(),
      projectId: config.FIREBASE_PROJECT_ID,
    });

    db = getFirestore();
  }

  return db;
}
