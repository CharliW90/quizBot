import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../../utils/result.js";

type Firestore = firestore.Firestore;

export type FormIds = Record<string, string>;

export interface SetFormIdResult {
  overwritten: boolean;
  previousFormId: string | null;
}

function configDoc(db: Firestore, guildId: string) {
  return db.collection(`guilds/${guildId}/config`).doc("forms");
}

function extractFormId(input: string): Result<string> {
  if (input.startsWith("https://")) {
    const match = input.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) {
      return err("Could not extract a form ID from that URL");
    }
    return ok(match[1]);
  }
  return ok(input);
}

export async function getFormIds(
  db: Firestore,
  guildId: string
): Promise<Result<FormIds>> {
  const snapshot = await configDoc(db, guildId).get();
  if (!snapshot.exists) {
    return ok({});
  }
  return ok(snapshot.data() as FormIds);
}

export async function setFormId(
  db: Firestore,
  guildId: string,
  roundNumber: number,
  rawFormId: string
): Promise<Result<SetFormIdResult>> {
  if (roundNumber < 1) {
    return err("Round number must be 1 or greater");
  }

  const extracted = extractFormId(rawFormId);
  if (!extracted.ok) return extracted;
  const formId = extracted.data;

  const snapshot = await configDoc(db, guildId).get();
  const existing: FormIds = snapshot.exists ? (snapshot.data() as FormIds) : {};

  const existingKeys = Object.keys(existing).map(Number);
  const maxRound = existingKeys.length > 0 ? Math.max(...existingKeys) : 0;

  const isOverwrite = String(roundNumber) in existing;
  if (!isOverwrite && roundNumber > maxRound + 1) {
    return err(
      `Cannot skip rounds - next available round is ${maxRound + 1}`
    );
  }

  const previousFormId = isOverwrite ? existing[String(roundNumber)] : null;

  await configDoc(db, guildId).set(
    { [String(roundNumber)]: formId },
    { merge: true }
  );

  return ok({ overwritten: isOverwrite, previousFormId });
}
