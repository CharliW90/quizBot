import type { firestore } from "firebase-admin";
import { ok, err, type Result } from "../utils/result.js";
import { getFormIds } from "../integrations/firestore/guild-config.js";
import { storeRound } from "../integrations/firestore/rounds.js";
import type { RoundData } from "../integrations/firestore/rounds.js";
import { parseFormResponses } from "../integrations/forms/parser.js";
import { validateFormStructure } from "../integrations/forms/validator.js";

type Firestore = firestore.Firestore;

interface FormsClient {
  getForm: (formId: string) => Promise<any>;
  listResponses: (formId: string) => Promise<Result<any[]>>;
}

interface FetchRoundInput {
  db: Firestore;
  guildId: string;
  quizDate: string;
  roundNumber: number;
  formsClient: FormsClient;
}

export async function fetchRound(input: FetchRoundInput): Promise<Result<RoundData>> {
  const { db, guildId, quizDate, roundNumber, formsClient } = input;

  const configResult = await getFormIds(db, guildId);
  if (!configResult.ok) return configResult;

  const formId = configResult.data[String(roundNumber)];
  if (!formId) {
    return err(`No form configured for round ${roundNumber}. Run /quiz-setup first.`);
  }

  const responsesResult = await formsClient.listResponses(formId);
  if (!responsesResult.ok) return responsesResult;

  const form = await formsClient.getForm(formId);
  const validation = validateFormStructure(form);
  if (!validation.ok) return validation;

  const parsed = parseFormResponses(form, responsesResult.data, roundNumber);

  return storeRound(db, guildId, quizDate, {
    roundNumber,
    formId,
    responses: parsed.results,
  });
}
