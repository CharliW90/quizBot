import { describe, it, expect, vi, beforeEach } from "vitest";
import { correctTeamName } from "./correct-team-name.js";

const mockListRounds = vi.fn();
const mockStoreRound = vi.fn();
const mockSetAlias = vi.fn();

vi.mock("../integrations/firestore/rounds.js", () => ({
  listRounds: (...args: unknown[]) => mockListRounds(...args),
  storeRound: (...args: unknown[]) => mockStoreRound(...args),
}));

vi.mock("../integrations/firestore/aliases.js", () => ({
  setAlias: (...args: unknown[]) => mockSetAlias(...args),
}));

describe("correctTeamName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renames team key in all rounds and adds alias", async () => {
    mockListRounds.mockResolvedValue({
      ok: true,
      data: [
        {
          roundNumber: 1,
          formId: "f1",
          responses: {
            "PIston Broke": { answers: [{ answer: "Paris", score: 2, correct: true }], score: 2 },
            "Squam Fam": { answers: [{ answer: "Nope", score: 0, correct: false }], score: 0 },
          },
          fetchedAt: "2026-06-06T19:00:00Z",
          publishedAt: null,
          history: [],
        },
        {
          roundNumber: 2,
          formId: "f2",
          responses: {
            "PIston Broke": { answers: [], score: 5 },
          },
          fetchedAt: "2026-06-06T19:30:00Z",
          publishedAt: null,
          history: [],
        },
      ],
    });
    mockStoreRound.mockResolvedValue({ ok: true, data: {} });
    mockSetAlias.mockResolvedValue({ ok: true, data: undefined });

    const result = await correctTeamName({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      incorrectName: "PIston Broke",
      correctName: "Piston Broke",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.roundsCorrected).toBe(2);
    }

    expect(mockStoreRound).toHaveBeenCalledTimes(2);

    const round1Call = mockStoreRound.mock.calls[0][3];
    expect(round1Call.responses["Piston Broke"]).toBeDefined();
    expect(round1Call.responses["PIston Broke"]).toBeUndefined();

    expect(mockSetAlias).toHaveBeenCalledWith(
      "mock-db", "guild-1", "2026-06-06", "PIston Broke", "Piston Broke"
    );
  });

  it("returns error when incorrect name not found in any round", async () => {
    mockListRounds.mockResolvedValue({
      ok: true,
      data: [
        {
          roundNumber: 1,
          formId: "f1",
          responses: {
            "The Foxes": { answers: [], score: 5 },
          },
          fetchedAt: "2026-06-06T19:00:00Z",
          publishedAt: null,
          history: [],
        },
      ],
    });

    const result = await correctTeamName({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      incorrectName: "NonExistent",
      correctName: "Whatever",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not found in any round");
    }
  });

  it("only updates rounds that contain the incorrect name", async () => {
    mockListRounds.mockResolvedValue({
      ok: true,
      data: [
        {
          roundNumber: 1,
          formId: "f1",
          responses: { "Typo Team": { answers: [], score: 3 } },
          fetchedAt: "2026-06-06T19:00:00Z",
          publishedAt: null,
          history: [],
        },
        {
          roundNumber: 2,
          formId: "f2",
          responses: { "Other Team": { answers: [], score: 7 } },
          fetchedAt: "2026-06-06T19:30:00Z",
          publishedAt: null,
          history: [],
        },
      ],
    });
    mockStoreRound.mockResolvedValue({ ok: true, data: {} });
    mockSetAlias.mockResolvedValue({ ok: true, data: undefined });

    const result = await correctTeamName({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      incorrectName: "Typo Team",
      correctName: "Fixed Team",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.roundsCorrected).toBe(1);
    }
    expect(mockStoreRound).toHaveBeenCalledTimes(1);
  });

  it("returns error when listRounds fails", async () => {
    mockListRounds.mockResolvedValue({ ok: false, error: "db error" });

    const result = await correctTeamName({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      incorrectName: "A",
      correctName: "B",
    });

    expect(result.ok).toBe(false);
  });
});
