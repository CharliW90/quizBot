import type { Firestore } from "firebase-admin/firestore";
import { ok, err, type Result } from "../utils/result.js";
import { listRounds } from "../integrations/firestore/rounds.js";
import { getAliases } from "../integrations/firestore/aliases.js";
import { addScoreboard } from "../integrations/firestore/scoreboard.js";
import { getQuiz } from "../integrations/firestore/quiz.js";
import type { ScoreboardEntry } from "../integrations/firestore/scoreboard.js";
import { logger } from "../utils/logger.js";

interface GenerateScoreboardInput {
  db: Firestore;
  guildId: string;
  quizDate: string;
}

export interface ScoreboardResult {
  scoreboard: Record<string, ScoreboardEntry>;
  roundNumbers: number[];
  savedToFirestore: boolean;
}

export async function generateScoreboard(
  input: GenerateScoreboardInput,
): Promise<Result<ScoreboardResult>> {
  const { db, guildId, quizDate } = input;

  const roundsResult = await listRounds(db, guildId, quizDate);
  if (!roundsResult.ok) return roundsResult;

  const rounds = roundsResult.data.sort((a, b) => a.roundNumber - b.roundNumber);
  if (rounds.length === 0) {
    return err("No rounds fetched yet - use /quiz-fetch first");
  }

  const aliasResult = await getAliases(db, guildId, quizDate);
  const aliases = aliasResult.ok ? aliasResult.data : {};

  const allTeams = new Set<string>();
  for (const round of rounds) {
    for (const formName of Object.keys(round.responses)) {
      const resolved = aliases[formName] ?? formName;
      allTeams.add(resolved);
    }
  }

  const scoreboard: Record<string, ScoreboardEntry> = {};
  const roundNumbers = rounds.map((r) => r.roundNumber);

  for (const teamName of allTeams) {
    const roundScores: number[] = [];

    for (const round of rounds) {
      let score = 0;
      for (const [formName, response] of Object.entries(round.responses)) {
        const resolved = aliases[formName] ?? formName;
        if (resolved === teamName) {
          score = response.score;
          break;
        }
      }
      roundScores.push(score);
    }

    scoreboard[teamName] = {
      rounds: roundScores,
      total: roundScores.reduce((sum, s) => sum + s, 0),
    };
  }

  logger.info({ teamCount: allTeams.size, roundCount: rounds.length }, "[scoreboard] Generated scoreboard");

  let savedToFirestore = false;
  const quizResult = await getQuiz(db, guildId, quizDate);
  if (quizResult.ok && quizResult.data.status !== "ended") {
    await addScoreboard(db, guildId, quizDate, scoreboard);
    savedToFirestore = true;
  } else {
    logger.info({ quizDate }, "[scoreboard] Quiz is ended or not found - skipping Firestore save");
  }

  return ok({ scoreboard, roundNumbers, savedToFirestore });
}
