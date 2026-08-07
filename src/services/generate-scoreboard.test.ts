import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateScoreboard } from "./generate-scoreboard.js";

const mockListRounds = vi.fn();
const mockGetAliases = vi.fn();
const mockAddScoreboard = vi.fn();

vi.mock("../integrations/firestore/rounds.js", () => ({
  listRounds: (...args: unknown[]) => mockListRounds(...args),
}));

vi.mock("../integrations/firestore/aliases.js", () => ({
  getAliases: (...args: unknown[]) => mockGetAliases(...args),
}));

vi.mock("../integrations/firestore/scoreboard.js", () => ({
  addScoreboard: (...args: unknown[]) => mockAddScoreboard(...args),
}));

describe("generateScoreboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates scores from multiple rounds", async () => {
    mockListRounds.mockResolvedValue({
      ok: true,
      data: [
        {
          roundNumber: 1,
          responses: {
            "The Foxes": { answers: [], score: 8 },
            "Quiz Masters": { answers: [], score: 6 },
          },
        },
        {
          roundNumber: 2,
          responses: {
            "The Foxes": { answers: [], score: 5 },
            "Quiz Masters": { answers: [], score: 9 },
          },
        },
      ],
    });
    mockGetAliases.mockResolvedValue({ ok: true, data: {} });
    mockAddScoreboard.mockResolvedValue({ ok: true, data: undefined });

    const result = await generateScoreboard({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data["Quiz Masters"].total).toBe(15);
      expect(result.data["Quiz Masters"].rounds).toEqual([6, 9]);
      expect(result.data["The Foxes"].total).toBe(13);
      expect(result.data["The Foxes"].rounds).toEqual([8, 5]);
    }
  });

  it("resolves aliases so aliased teams are merged", async () => {
    mockListRounds.mockResolvedValue({
      ok: true,
      data: [
        {
          roundNumber: 1,
          responses: {
            "teh foxes": { answers: [], score: 8 },
          },
        },
        {
          roundNumber: 2,
          responses: {
            "The Foxes": { answers: [], score: 5 },
          },
        },
      ],
    });
    mockGetAliases.mockResolvedValue({ ok: true, data: { "teh foxes": "The Foxes" } });
    mockAddScoreboard.mockResolvedValue({ ok: true, data: undefined });

    const result = await generateScoreboard({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data["The Foxes"].total).toBe(13);
      expect(result.data["The Foxes"].rounds).toEqual([8, 5]);
      expect(result.data["teh foxes"]).toBeUndefined();
    }
  });

  it("stores the scoreboard in Firestore", async () => {
    mockListRounds.mockResolvedValue({
      ok: true,
      data: [
        {
          roundNumber: 1,
          responses: {
            "The Foxes": { answers: [], score: 10 },
          },
        },
      ],
    });
    mockGetAliases.mockResolvedValue({ ok: true, data: {} });
    mockAddScoreboard.mockResolvedValue({ ok: true, data: undefined });

    await generateScoreboard({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
    });

    expect(mockAddScoreboard).toHaveBeenCalledWith(
      "mock-db",
      "guild-1",
      "2026-06-06",
      expect.objectContaining({
        "The Foxes": { rounds: [10], total: 10 },
      })
    );
  });

  it("returns error when no rounds exist", async () => {
    mockListRounds.mockResolvedValue({ ok: true, data: [] });
    mockGetAliases.mockResolvedValue({ ok: true, data: {} });

    const result = await generateScoreboard({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("No rounds");
    }
  });

  it("returns error when listRounds fails", async () => {
    mockListRounds.mockResolvedValue({ ok: false, error: "db error" });

    const result = await generateScoreboard({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
    });

    expect(result.ok).toBe(false);
  });

  it("fills 0 for rounds a team missed", async () => {
    mockListRounds.mockResolvedValue({
      ok: true,
      data: [
        {
          roundNumber: 1,
          responses: {
            "The Foxes": { answers: [], score: 8 },
            "Quiz Masters": { answers: [], score: 6 },
          },
        },
        {
          roundNumber: 2,
          responses: {
            "The Foxes": { answers: [], score: 5 },
          },
        },
      ],
    });
    mockGetAliases.mockResolvedValue({ ok: true, data: {} });
    mockAddScoreboard.mockResolvedValue({ ok: true, data: undefined });

    const result = await generateScoreboard({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data["Quiz Masters"].rounds).toEqual([6, 0]);
      expect(result.data["Quiz Masters"].total).toBe(6);
    }
  });
});
