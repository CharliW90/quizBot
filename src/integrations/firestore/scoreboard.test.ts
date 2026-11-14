import { describe, it, expect, vi, beforeEach } from "vitest";
import { addScoreboard, getScoreboard } from "./scoreboard.js";

function mockFirestore() {
  const store: Record<string, Record<string, unknown>> = {};

  const doc = (path: string) => ({
    set: vi.fn(async (data: unknown) => {
      store[path] = data as Record<string, unknown>;
    }),
    get: vi.fn(async () => ({
      exists: path in store,
      data: () => store[path] ?? undefined,
    })),
    update: vi.fn(async (data: Record<string, unknown>) => {
      if (!(path in store)) throw new Error("NOT_FOUND");
      store[path] = { ...store[path], ...data };
    }),
  });

  const collection = (collectionPath: string) => ({
    doc: (id: string) => doc(`${collectionPath}/${id}`),
  });

  return { collection, doc, _store: store };
}

describe("scoreboard", () => {
  let db: ReturnType<typeof mockFirestore>;

  beforeEach(() => {
    db = mockFirestore();
  });

  describe("addScoreboard", () => {
    it("stores scoreboard on the quiz document", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = {
        status: "active",
        createdAt: "2026-06-06T18:00:00Z",
      };

      const scores = {
        "Team A": { rounds: [10, 8], total: 18 },
        "Team B": { rounds: [7, 9], total: 16 },
      };

      const result = await addScoreboard(db as any, "guild-1", "2026-06-06", scores);

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06"];
      expect((stored.scoreboard as any).current).toEqual(scores);
      expect((stored.scoreboard as any).history).toEqual([]);
    });

    it("pushes previous scoreboard to history", async () => {
      const oldScores = {
        "Team A": { rounds: [10], total: 10 },
      };
      db._store["guilds/guild-1/quizzes/2026-06-06"] = {
        status: "active",
        createdAt: "2026-06-06T18:00:00Z",
        scoreboard: { current: oldScores, history: [] },
      };

      const newScores = {
        "Team A": { rounds: [10, 8], total: 18 },
        "Team B": { rounds: [7, 9], total: 16 },
      };

      const result = await addScoreboard(db as any, "guild-1", "2026-06-06", newScores);

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06"];
      expect((stored.scoreboard as any).current).toEqual(newScores);
      expect((stored.scoreboard as any).history).toEqual([oldScores]);
    });

    it("returns error when quiz does not exist", async () => {
      const result = await addScoreboard(db as any, "guild-1", "2026-06-06", {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });

    it("rejects when quiz is ended", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = {
        status: "ended",
        createdAt: "2026-06-06T18:00:00Z",
      };

      const result = await addScoreboard(db as any, "guild-1", "2026-06-06", {});

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("ended");
      }
    });
  });

  describe("getScoreboard", () => {
    it("returns null when no scoreboard has been generated", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = {
        status: "active",
        createdAt: "2026-06-06T18:00:00Z",
      };

      const result = await getScoreboard(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeNull();
      }
    });

    it("returns current scoreboard", async () => {
      const scores = {
        "Team A": { rounds: [10, 8], total: 18 },
      };
      db._store["guilds/guild-1/quizzes/2026-06-06"] = {
        status: "active",
        createdAt: "2026-06-06T18:00:00Z",
        scoreboard: { current: scores, history: [] },
      };

      const result = await getScoreboard(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(scores);
      }
    });

    it("returns error when quiz does not exist", async () => {
      const result = await getScoreboard(db as any, "guild-1", "2026-01-01");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });
});
