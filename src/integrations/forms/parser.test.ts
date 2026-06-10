import { describe, it, expect } from "vitest";
import { parseFormResponses } from "./parser.js";
import type { forms_v1 } from "googleapis";

function buildForm(items: forms_v1.Schema$Item[]): forms_v1.Schema$Form {
  return {
    formId: "form1",
    info: { title: "Round 1" },
    items,
  };
}

function textItem(questionId: string, title: string, points?: number): forms_v1.Schema$Item {
  return {
    itemId: questionId,
    title,
    questionItem: {
      question: {
        questionId,
        grading: points != null ? { pointValue: points } : undefined,
        textQuestion: {},
      },
    },
  };
}

function multipleChoiceItem(questionId: string, title: string, points: number): forms_v1.Schema$Item {
  return {
    itemId: questionId,
    title,
    questionItem: {
      question: {
        questionId,
        grading: { pointValue: points },
        choiceQuestion: { type: "RADIO" },
      },
    },
  };
}

function paragraphItem(questionId: string, title: string): forms_v1.Schema$Item {
  return {
    itemId: questionId,
    title,
    questionItem: {
      question: {
        questionId,
        textQuestion: { paragraph: true },
      },
    },
  };
}

function buildResponse(
  responseId: string,
  answers: Record<string, { value: string; score?: number; correct?: boolean }>,
  totalScore: number,
): forms_v1.Schema$FormResponse {
  const formattedAnswers: Record<string, forms_v1.Schema$Answer> = {};
  for (const [qId, ans] of Object.entries(answers)) {
    formattedAnswers[qId] = {
      questionId: qId,
      grade: ans.correct ? { score: ans.score, correct: true } : {},
      textAnswers: { answers: [{ value: ans.value }] },
    };
  }
  return { responseId, answers: formattedAnswers, totalScore: String(totalScore) };
}

describe("parseFormResponses", () => {
  it("extracts team name from first question and scores from the rest", () => {
    const form = buildForm([
      textItem("q1", "Team Name"),
      textItem("q2", "What is the capital of France?", 2),
      textItem("q3", "What year did WW2 end?", 2),
    ]);

    const responses = [
      buildResponse("r1", {
        q1: { value: "Quiz Khalifa" },
        q2: { value: "Paris", score: 2, correct: true },
        q3: { value: "1945", score: 2, correct: true },
      }, 4),
    ];

    const result = parseFormResponses(form, responses, 1);

    expect(result.roundDetails).toEqual({ number: 1, questions: 2, totalScore: 4 });
    expect(result.results["Quiz Khalifa"]).toEqual({
      answers: [
        { answer: "Paris", score: 2, correct: true },
        { answer: "1945", score: 2, correct: true },
      ],
      score: 4,
    });
  });

  it("handles incorrect answers with empty grade objects", () => {
    const form = buildForm([
      textItem("q1", "Team Name"),
      textItem("q2", "Capital of France?", 2),
    ]);

    const responses = [
      buildResponse("r1", {
        q1: { value: "The Losers" },
        q2: { value: "Berlin" },
      }, 0),
    ];

    const result = parseFormResponses(form, responses, 1);

    expect(result.results["The Losers"]).toEqual({
      answers: [{ answer: "Berlin", score: 0, correct: false }],
      score: 0,
    });
  });

  it("skips feedback paragraph questions", () => {
    const form = buildForm([
      textItem("q1", "Team Name"),
      textItem("q2", "Question 1", 2),
      paragraphItem("q3", "Any feedback on tonight's quiz?"),
    ]);

    const responses = [
      buildResponse("r1", {
        q1: { value: "Team A" },
        q2: { value: "Answer", score: 2, correct: true },
        q3: { value: "Great quiz!" },
      }, 2),
    ];

    const result = parseFormResponses(form, responses, 6);

    expect(result.roundDetails).toEqual({ number: 6, questions: 1, totalScore: 2 });
    expect(result.results["Team A"].answers).toHaveLength(1);
  });

  it("handles multiple choice questions the same as text", () => {
    const form = buildForm([
      textItem("q1", "Team Name"),
      multipleChoiceItem("q2", "Pick the right answer", 2),
    ]);

    const responses = [
      buildResponse("r1", {
        q1: { value: "MCQ Team" },
        q2: { value: "Option B", score: 2, correct: true },
      }, 2),
    ];

    const result = parseFormResponses(form, responses, 1);

    expect(result.results["MCQ Team"]).toEqual({
      answers: [{ answer: "Option B", score: 2, correct: true }],
      score: 2,
    });
  });

  it("handles partial scores (half marks)", () => {
    const form = buildForm([
      textItem("q1", "Team Name"),
      textItem("q2", "Name the film", 2),
    ]);

    const responses = [
      buildResponse("r1", {
        q1: { value: "Half Marks Club" },
        q2: { value: "Close enough", score: 1, correct: true },
      }, 1),
    ];

    const result = parseFormResponses(form, responses, 1);

    expect(result.results["Half Marks Club"]).toEqual({
      answers: [{ answer: "Close enough", score: 1, correct: true }],
      score: 1,
    });
  });

  it("trims whitespace from team names", () => {
    const form = buildForm([
      textItem("q1", "Team Name"),
      textItem("q2", "Q1", 2),
    ]);

    const responses = [
      buildResponse("r1", {
        q1: { value: "  Spacey Team  " },
        q2: { value: "Answer", score: 2, correct: true },
      }, 2),
    ];

    const result = parseFormResponses(form, responses, 1);

    expect(result.results["Spacey Team"]).toBeDefined();
  });

  it("handles multiple teams", () => {
    const form = buildForm([
      textItem("q1", "Team Name"),
      textItem("q2", "Q1", 2),
    ]);

    const responses = [
      buildResponse("r1", {
        q1: { value: "Team A" },
        q2: { value: "Right", score: 2, correct: true },
      }, 2),
      buildResponse("r2", {
        q1: { value: "Team B" },
        q2: { value: "Wrong" },
      }, 0),
    ];

    const result = parseFormResponses(form, responses, 1);

    expect(Object.keys(result.results)).toHaveLength(2);
    expect(result.results["Team A"].score).toBe(2);
    expect(result.results["Team B"].score).toBe(0);
  });
});
