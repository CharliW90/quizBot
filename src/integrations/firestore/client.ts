import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { loadConfig } from "../../utils/config.js";

let db: Firestore | null = null;

export function getDb(): Firestore {
  if (!db) {
    const config = loadConfig();
    const serviceAccount = JSON.parse(
      readFileSync(config.GOOGLE_APPLICATION_CREDENTIALS, "utf-8")
    );

    initializeApp({
      credential: cert(serviceAccount),
      projectId: config.FIREBASE_PROJECT_ID,
    });

    db = getFirestore();
  }

  return db;
}
