import { describe, it, expect } from "vitest";
import { validateFormStructure } from "./validator.js";
import type { forms_v1 } from "googleapis";

function textItem(questionId: string, title: string, opts?: { points?: number; paragraph?: boolean; required?: boolean }): forms_v1.Schema$Item {
  return {
    itemId: questionId,
    title,
    questionItem: {
      question: {
        questionId,
        required: opts?.required,
        grading: opts?.points != null ? { pointValue: opts.points } : undefined,
        textQuestion: opts?.paragraph ? { paragraph: true } : {},
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

describe("validateFormStructure", () => {
  it("returns ok for a valid form", () => {
    const form: forms_v1.Schema$Form = {
      formId: "f1",
      info: { title: "Round 1" },
      items: [
        textItem("q1", "Team Name"),
        textItem("q2", "Question 1", { points: 2 }),
        textItem("q3", "Question 2", { points: 2 }),
      ],
    };

    const result = validateFormStructure(form);

    expect(result.ok).toBe(true);
  });

  it("returns ok when feedback question is present", () => {
    const form: forms_v1.Schema$Form = {
      formId: "f1",
      info: { title: "Round 6" },
      items: [
        textItem("q1", "Team Name"),
        textItem("q2", "Question 1", { points: 2 }),
        textItem("q3", "Any feedback on the quiz?", { paragraph: true }),
      ],
    };

    const result = validateFormStructure(form);

    expect(result.ok).toBe(true);
  });

  it("returns ok for multiple choice questions", () => {
    const form: forms_v1.Schema$Form = {
      formId: "f1",
      info: { title: "Round 3" },
      items: [
        textItem("q1", "Team Name"),
        multipleChoiceItem("q2", "Pick one", 2),
      ],
    };

    const result = validateFormStructure(form);

    expect(result.ok).toBe(true);
  });

  it("fails if form has no items", () => {
    const form: forms_v1.Schema$Form = {
      formId: "f1",
      info: { title: "Empty" },
      items: [],
    };

    const result = validateFormStructure(form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("no items");
  });

  it("fails if first item is not a question", () => {
    const form: forms_v1.Schema$Form = {
      formId: "f1",
      info: { title: "Bad" },
      items: [{ itemId: "x", title: "Section Header" }],
    };

    const result = validateFormStructure(form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("first item");
  });

  it("fails if there are no scored questions", () => {
    const form: forms_v1.Schema$Form = {
      formId: "f1",
      info: { title: "No scores" },
      items: [
        textItem("q1", "Team Name"),
        textItem("q2", "Unscored question"),
      ],
    };

    const result = validateFormStructure(form);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("no scored questions");
  });
});
