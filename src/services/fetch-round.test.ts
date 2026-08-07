import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchRound } from "./fetch-round.js";

const mockGetFormIds = vi.fn();
const mockListResponses = vi.fn();
const mockGetForm = vi.fn();
const mockStoreRound = vi.fn();

vi.mock("../integrations/firestore/guild-config.js", () => ({
  getFormIds: (...args: unknown[]) => mockGetFormIds(...args),
}));

vi.mock("../integrations/firestore/rounds.js", () => ({
  storeRound: (...args: unknown[]) => mockStoreRound(...args),
}));

const mockForm = {
  items: [
    { questionItem: { question: { questionId: "q-team" } } },
    {
      title: "Q1",
      questionItem: {
        question: {
          questionId: "q1",
          grading: { pointValue: 2 },
        },
      },
    },
    {
      title: "Q2",
      questionItem: {
        question: {
          questionId: "q2",
          grading: { pointValue: 3 },
        },
      },
    },
  ],
};

const mockResponses = [
  {
    answers: {
      "q-team": { textAnswers: { answers: [{ value: "The Foxes" }] } },
      q1: {
        textAnswers: { answers: [{ value: "Paris" }] },
        grade: { score: 2, correct: true },
      },
      q2: {
        textAnswers: { answers: [{ value: "Berlin" }] },
        grade: { score: 0, correct: false },
      },
    },
  },
];

function makeMockFormsClient() {
  return {
    getForm: mockGetForm,
    listResponses: mockListResponses,
    isFormClosed: vi.fn(),
  };
}

describe("fetchRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches, parses, and stores round data", async () => {
    mockGetFormIds.mockResolvedValue({ ok: true, data: { "1": "form-abc" } });
    mockListResponses.mockResolvedValue({ ok: true, data: mockResponses });
    mockGetForm.mockResolvedValue(mockForm);
    mockStoreRound.mockResolvedValue({
      ok: true,
      data: { roundNumber: 1, formId: "form-abc", responses: {}, fetchedAt: "", publishedAt: null, history: [] },
    });

    const result = await fetchRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 1,
      formsClient: makeMockFormsClient() as any,
    });

    expect(result.ok).toBe(true);
    expect(mockListResponses).toHaveBeenCalledWith("form-abc");
    expect(mockGetForm).toHaveBeenCalledWith("form-abc");
    expect(mockStoreRound).toHaveBeenCalledWith(
      "mock-db",
      "guild-1",
      "2026-06-06",
      expect.objectContaining({
        roundNumber: 1,
        formId: "form-abc",
      })
    );
  });

  it("returns error when round has no configured form ID", async () => {
    mockGetFormIds.mockResolvedValue({ ok: true, data: { "1": "form-abc" } });

    const result = await fetchRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 3,
      formsClient: makeMockFormsClient() as any,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("No form configured for round 3");
    }
  });

  it("returns error when getFormIds fails", async () => {
    mockGetFormIds.mockResolvedValue({ ok: false, error: "db error" });

    const result = await fetchRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 1,
      formsClient: makeMockFormsClient() as any,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("db error");
    }
  });

  it("returns error when form is still open", async () => {
    mockGetFormIds.mockResolvedValue({ ok: true, data: { "1": "form-abc" } });
    mockListResponses.mockResolvedValue({
      ok: false,
      error: "Form is still accepting responses - close it before fetching",
    });

    const result = await fetchRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 1,
      formsClient: makeMockFormsClient() as any,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("still accepting responses");
    }
  });

  it("returns error when form structure is invalid", async () => {
    mockGetFormIds.mockResolvedValue({ ok: true, data: { "1": "form-abc" } });
    mockListResponses.mockResolvedValue({ ok: true, data: mockResponses });
    mockGetForm.mockResolvedValue({ items: [] });

    const result = await fetchRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 1,
      formsClient: makeMockFormsClient() as any,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("no items");
    }
  });

  it("passes parsed responses to storeRound correctly", async () => {
    mockGetFormIds.mockResolvedValue({ ok: true, data: { "2": "form-xyz" } });
    mockListResponses.mockResolvedValue({ ok: true, data: mockResponses });
    mockGetForm.mockResolvedValue(mockForm);
    mockStoreRound.mockResolvedValue({
      ok: true,
      data: { roundNumber: 2, formId: "form-xyz", responses: {}, fetchedAt: "", publishedAt: null, history: [] },
    });

    await fetchRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 2,
      formsClient: makeMockFormsClient() as any,
    });

    const storeCall = mockStoreRound.mock.calls[0][3];
    expect(storeCall.roundNumber).toBe(2);
    expect(storeCall.formId).toBe("form-xyz");
    expect(storeCall.responses["The Foxes"]).toBeDefined();
    expect(storeCall.responses["The Foxes"].score).toBe(2);
    expect(storeCall.responses["The Foxes"].answers).toHaveLength(2);
  });
});
