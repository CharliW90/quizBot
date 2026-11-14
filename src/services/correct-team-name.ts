import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../utils/result.js";
import { listRounds, storeRound } from "../integrations/firestore/rounds.js";
import { setAlias } from "../integrations/firestore/aliases.js";

type Firestore = firestore.Firestore;

interface CorrectTeamNameInput {
  db: Firestore;
  guildId: string;
  quizDate: string;
  incorrectName: string;
  correctName: string;
}

interface CorrectTeamNameResult {
  roundsCorrected: number;
}

export async function correctTeamName(
  input: CorrectTeamNameInput
): Promise<Result<CorrectTeamNameResult>> {
  const { db, guildId, quizDate, incorrectName, correctName } = input;

  const roundsResult = await listRounds(db, guildId, quizDate);
  if (!roundsResult.ok) return roundsResult;

  const affectedRounds = roundsResult.data.filter(
    (r) => incorrectName in r.responses
  );

  if (affectedRounds.length === 0) {
    return err(`"${incorrectName}" not found in any round`);
  }

  for (const round of affectedRounds) {
    const newResponses = { ...round.responses };
    newResponses[correctName] = newResponses[incorrectName];
    delete newResponses[incorrectName];

    const result = await storeRound(db, guildId, quizDate, {
      roundNumber: round.roundNumber,
      formId: round.formId,
      responses: newResponses,
    });

    if (!result.ok) return result;
  }

  await setAlias(db, guildId, quizDate, incorrectName, correctName);

  return ok({ roundsCorrected: affectedRounds.length });
}
