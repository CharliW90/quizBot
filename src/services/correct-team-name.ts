import type { Firestore } from "firebase-admin/firestore";
import { ok, err, type Result } from "../utils/result.js";
import { listRounds, storeRound } from "../integrations/firestore/rounds.js";
import { setAlias } from "../integrations/firestore/aliases.js";
import { logger } from "../utils/logger.js";

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
  input: CorrectTeamNameInput,
): Promise<Result<CorrectTeamNameResult>> {
  const { db, guildId, quizDate, incorrectName, correctName } = input;
  logger.info({ incorrectName, correctName }, "[correct] Starting team name correction");

  const roundsResult = await listRounds(db, guildId, quizDate);
  if (!roundsResult.ok) return roundsResult;

  const affectedRounds = roundsResult.data.filter((r) => incorrectName in r.responses);

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

  logger.info({ incorrectName, correctName, roundsCorrected: affectedRounds.length }, "[correct] Correction complete");

  return ok({ roundsCorrected: affectedRounds.length });
}
