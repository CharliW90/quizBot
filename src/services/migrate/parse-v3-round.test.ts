import { describe, it, expect } from "vitest";
import { parseV3Round } from "./parse-v3-round.js";

const V3_ROUND = {
  published: true,
  current: {
    teams: ["squam fam", "cool cats"],
    embeds: [
      {
        author: { name: "Virtual Quizzes - Round Number 1" },
        color: 15012295,
        fields: [
          { name: "Total Score", value: "18 / 20" },
          { name: "Question 1", value: "Paris :white_check_mark:" },
          { name: "Question 2", value: "Tony Montana :x:" },
          { name: "Question 3", value: "Ronnie O'Sullivan :white_check_mark:" },
        ],
      },
      {
        author: { name: "Virtual Quizzes - Round Number 1" },
        color: 1234567,
        fields: [
          { name: "Total Score", value: "12 / 20" },
          { name: "Question 1", value: "London :x:" },
          { name: "Question 2", value: "Scarface :white_check_mark:" },
          { name: "Question 3", value: "Judd Trump :x:" },
        ],
      },
    ],
  },
  history: [],
};

describe("parseV3Round", () => {
  it("extracts round number from doc name", () => {
    const result = parseV3Round("Round 1", V3_ROUND);
    expect(result.roundNumber).toBe(1);
  });

  it("maps teams to their responses by name", () => {
    const result = parseV3Round("Round 1", V3_ROUND);
    expect(Object.keys(result.responses)).toEqual(["squam fam", "cool cats"]);
  });

  it("extracts total score from the Total Score field", () => {
    const result = parseV3Round("Round 1", V3_ROUND);
    expect(result.responses["squam fam"].score).toBe(18);
    expect(result.responses["cool cats"].score).toBe(12);
  });

  it("parses correct answers with checkmark", () => {
    const result = parseV3Round("Round 1", V3_ROUND);
    const answer = result.responses["squam fam"].answers[0];

    expect(answer.answer).toBe("Paris");
    expect(answer.correct).toBe(true);
  });

  it("parses incorrect answers with x", () => {
    const result = parseV3Round("Round 1", V3_ROUND);
    const answer = result.responses["squam fam"].answers[1];

    expect(answer.answer).toBe("Tony Montana");
    expect(answer.correct).toBe(false);
  });

  it("assigns per-question score based on correct/incorrect", () => {
    const result = parseV3Round("Round 1", V3_ROUND);
    const answers = result.responses["squam fam"].answers;

    expect(answers[0].score).toBeGreaterThan(0);
    expect(answers[1].score).toBe(0);
  });

  it("sets publishedAt when published is true", () => {
    const result = parseV3Round("Round 1", V3_ROUND);
    expect(result.publishedAt).toBe("migrated");
  });

  it("sets publishedAt to null when published is false", () => {
    const unpublished = { ...V3_ROUND, published: false };
    const result = parseV3Round("Round 1", unpublished);
    expect(result.publishedAt).toBeNull();
  });

  it("sets formId to empty string", () => {
    const result = parseV3Round("Round 1", V3_ROUND);
    expect(result.formId).toBe("");
  });

  it("handles multi-digit round numbers", () => {
    const result = parseV3Round("Round 12", V3_ROUND);
    expect(result.roundNumber).toBe(12);
  });

  it("handles answers containing colons or special characters", () => {
    const round = {
      ...V3_ROUND,
      current: {
        teams: ["test team"],
        embeds: [{
          author: { name: "Round 1" },
          color: 0,
          fields: [
            { name: "Total Score", value: "2 / 2" },
            { name: "Question 1", value: "Keanu Reeves: The Matrix :white_check_mark:" },
          ],
        }],
      },
    };

    const result = parseV3Round("Round 1", round);
    expect(result.responses["test team"].answers[0].answer).toBe("Keanu Reeves: The Matrix");
  });

  it("preserves history from V3 as-is", () => {
    const withHistory = {
      ...V3_ROUND,
      history: [{ teams: ["old"], embeds: [{}] }],
    };
    const result = parseV3Round("Round 1", withHistory);
    expect(result.history).toEqual([]);
  });
});
