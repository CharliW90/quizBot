import type { Firestore } from "firebase-admin/firestore";
import type { forms_v1 } from "googleapis";
import { err, type Result } from "../utils/result.js";
import { getFormIds } from "../integrations/firestore/guild-config.js";
import { storeRound } from "../integrations/firestore/rounds.js";
import type { RoundData } from "../integrations/firestore/rounds.js";
import { getAliases } from "../integrations/firestore/aliases.js";
import { parseFormResponses } from "../integrations/forms/parser.js";
import { validateFormStructure } from "../integrations/forms/validator.js";
import { logger } from "../utils/logger.js";

interface FormsClient {
  getForm: (formId: string) => Promise<forms_v1.Schema$Form>;
  listResponses: (formId: string) => Promise<Result<forms_v1.Schema$FormResponse[]>>;
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

  logger.info({ roundNumber, guildId }, `[fetch-round] Fetching round ${roundNumber}`);

  const configResult = await getFormIds(db, guildId);
  if (!configResult.ok) return configResult;

  const formId = configResult.data[String(roundNumber)];
  if (!formId) {
    logger.error({ roundNumber }, `[fetch-round] No form ID configured for round ${roundNumber}`);
    return err(`No form configured for round ${roundNumber}. Run /setup first.`);
  }

  logger.info({ roundNumber, formId }, `[fetch-round] Fetching form ${formId}`);

  const responsesResult = await formsClient.listResponses(formId);
  if (!responsesResult.ok) return responsesResult;

  const form = await formsClient.getForm(formId);
  const validation = validateFormStructure(form);
  if (!validation.ok) return validation;

  const parsed = parseFormResponses(form, responsesResult.data, roundNumber);
  logger.info({ roundNumber, formId, teamCount: Object.keys(parsed.results).length }, "[fetch-round] Parsed form responses");

  const aliasResult = await getAliases(db, guildId, quizDate);
  const aliases = aliasResult.ok ? aliasResult.data : {};

  const resolvedResponses: typeof parsed.results = {};
  for (const [formName, response] of Object.entries(parsed.results)) {
    const resolvedName = aliases[formName] ?? formName;
    resolvedResponses[resolvedName] = response;
    if (resolvedName !== formName) {
      logger.info({ formName, resolvedName, roundNumber }, "[fetch-round] Auto-corrected team name via alias");
    }
  }

  return storeRound(db, guildId, quizDate, {
    roundNumber,
    formId,
    responses: resolvedResponses,
  });
}
