import type { RoundData, Answer, TeamResponse } from "../../integrations/firestore/rounds.js";

interface V3Field {
  name: string;
  value: string;
}

interface V3Embed {
  author?: { name?: string };
  color?: number;
  fields: V3Field[];
}

export interface V3Round {
  published: boolean;
  current: {
    teams: string[];
    embeds: V3Embed[];
  };
  history?: unknown[];
}

function parseRoundNumber(docName: string): number {
  const match = docName.match(/Round\s+(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
}

function parseEmbed(embed: V3Embed): TeamResponse {
  const questionFields = embed.fields.filter((f) => f.name.startsWith("Question"));
  const totalField = embed.fields.find((f) => f.name === "Total Score");

  const totalScore = totalField
    ? parseInt(totalField.value.split("/")[0].trim(), 10)
    : 0;

  const maxScore = totalField
    ? parseInt(totalField.value.split("/")[1].trim(), 10)
    : 0;

  const questionCount = questionFields.length;
  const scorePerCorrect = questionCount > 0 && maxScore > 0
    ? Math.round(maxScore / questionCount)
    : 1;

  const answers: Answer[] = questionFields.map((field) => {
    const isCorrect = field.value.includes(":white_check_mark:");
    const emojiPattern = /\s*:(white_check_mark|x):\s*$/;
    const answer = field.value.replace(emojiPattern, "");

    return {
      answer,
      correct: isCorrect,
      score: isCorrect ? scorePerCorrect : 0,
    };
  });

  return { answers, score: totalScore };
}

export function parseV3Round(docName: string, v3: V3Round): RoundData {
  const responses: Record<string, TeamResponse> = {};

  for (let i = 0; i < v3.current.teams.length; i++) {
    const teamName = v3.current.teams[i];
    const embed = v3.current.embeds[i];
    if (embed) {
      responses[teamName] = parseEmbed(embed);
    }
  }

  return {
    roundNumber: parseRoundNumber(docName),
    formId: "",
    responses,
    fetchedAt: "migrated",
    publishedAt: v3.published ? "migrated" : null,
    history: [],
  };
}
