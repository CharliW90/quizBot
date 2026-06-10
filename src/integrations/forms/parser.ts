import type { forms_v1 } from "googleapis";

export interface RoundDetails {
  number: number;
  questions: number;
  totalScore: number;
}

export interface TeamAnswer {
  answer: string;
  score: number;
  correct: boolean;
}

export interface TeamResult {
  answers: TeamAnswer[];
  score: number;
}

export interface ParsedRound {
  roundDetails: RoundDetails;
  results: Record<string, TeamResult>;
}

interface ScoredQuestion {
  questionId: string;
  pointValue: number;
}

export function parseFormResponses(
  form: forms_v1.Schema$Form,
  responses: forms_v1.Schema$FormResponse[],
  roundNumber: number,
): ParsedRound {
  const items = form.items ?? [];

  const teamNameQuestionId = getTeamNameQuestionId(items);
  const scoredQuestions = getScoredQuestions(items);

  const roundDetails: RoundDetails = {
    number: roundNumber,
    questions: scoredQuestions.length,
    totalScore: scoredQuestions.reduce((sum, q) => sum + q.pointValue, 0),
  };

  const results: Record<string, TeamResult> = {};

  for (const response of responses) {
    const answers = response.answers ?? {};

    const teamNameAnswer = answers[teamNameQuestionId];
    const teamName = teamNameAnswer?.textAnswers?.answers?.[0]?.value?.trim() ?? "Unknown";

    const teamAnswers: TeamAnswer[] = [];
    let totalScore = 0;

    for (const question of scoredQuestions) {
      const answer = answers[question.questionId];
      const text = answer?.textAnswers?.answers?.[0]?.value ?? "";
      const grade = answer?.grade ?? {};
      const score = (grade as { score?: number }).score ?? 0;
      const correct = (grade as { correct?: boolean }).correct ?? false;

      teamAnswers.push({ answer: text, score, correct });
      totalScore += score;
    }

    results[teamName] = { answers: teamAnswers, score: totalScore };
  }

  return { roundDetails, results };
}

function getTeamNameQuestionId(items: forms_v1.Schema$Item[]): string {
  const first = items[0];
  const questionId = first?.questionItem?.question?.questionId;
  if (!questionId) {
    throw new Error("First form item is not a question — cannot extract team name");
  }
  return questionId;
}

function getScoredQuestions(items: forms_v1.Schema$Item[]): ScoredQuestion[] {
  const scored: ScoredQuestion[] = [];

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const question = item.questionItem?.question;
    if (!question?.questionId) continue;

    if (isFeedbackQuestion(item)) continue;

    const pointValue = question.grading?.pointValue;
    if (pointValue != null && pointValue > 0) {
      scored.push({ questionId: question.questionId, pointValue });
    }
  }

  return scored;
}

function isFeedbackQuestion(item: forms_v1.Schema$Item): boolean {
  const question = item.questionItem?.question;
  const isParagraph = question?.textQuestion?.paragraph === true;
  const titleContainsFeedback = (item.title ?? "").toLowerCase().includes("feedback");
  return isParagraph && titleContainsFeedback;
}
