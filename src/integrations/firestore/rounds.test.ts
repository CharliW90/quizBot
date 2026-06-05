import { describe, it, expect, vi, beforeEach } from "vitest";
import { storeRound, getRound, listRounds, publishRound } from "./rounds.js";
import type { RoundData } from "./rounds.js";

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
    get: vi.fn(async () => {
      const prefix = collectionPath + "/";
      const docs = Object.entries(store)
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => ({
          id: key.slice(prefix.length),
          data: () => value,
        }));
      return { docs, empty: docs.length === 0 };
    }),
  });

  return { collection, doc, _store: store };
}

const sampleResponses: RoundData["responses"] = {
  "The Foxes": {
    answers: [
      { answer: "Paris", score: 1, correct: true },
      { answer: "Berlin", score: 0, correct: false },
    ],
    score: 1,
  },
  "Quiz Masters": {
    answers: [
      { answer: "Paris", score: 1, correct: true },
      { answer: "Rome", score: 0, correct: false },
    ],
    score: 1,
  },
};

describe("rounds", () => {
  let db: ReturnType<typeof mockFirestore>;

  beforeEach(() => {
    db = mockFirestore();
  });

  describe("storeRound", () => {
    it("stores round data at the correct path", async () => {
      const result = await storeRound(db as any, "guild-1", "2026-06-06", {
        roundNumber: 3,
        formId: "form-abc",
        responses: sampleResponses,
      });

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06/rounds/3"];
      expect(stored.formId).toBe("form-abc");
      expect(stored.responses).toEqual(sampleResponses);
      expect(stored.fetchedAt).toBeDefined();
      expect(stored.publishedAt).toBeNull();
    });

    it("overwrites existing round data (re-fetch)", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/rounds/3"] = {
        formId: "form-abc",
        responses: {},
        fetchedAt: "2026-06-06T18:00:00Z",
        publishedAt: null,
      };

      const result = await storeRound(db as any, "guild-1", "2026-06-06", {
        roundNumber: 3,
        formId: "form-abc",
        responses: sampleResponses,
      });

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06/rounds/3"];
      expect(stored.responses).toEqual(sampleResponses);
    });
  });

  describe("getRound", () => {
    it("returns round data when it exists", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/rounds/2"] = {
        formId: "form-xyz",
        responses: sampleResponses,
        fetchedAt: "2026-06-06T19:00:00Z",
        publishedAt: null,
      };

      const result = await getRound(db as any, "guild-1", "2026-06-06", 2);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.formId).toBe("form-xyz");
        expect(result.data.roundNumber).toBe(2);
        expect(result.data.responses["The Foxes"].score).toBe(1);
      }
    });

    it("returns an error when round does not exist", async () => {
      const result = await getRound(db as any, "guild-1", "2026-06-06", 5);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("listRounds", () => {
    it("returns all rounds for a quiz", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/rounds/1"] = {
        formId: "f1",
        responses: {},
        fetchedAt: "2026-06-06T19:00:00Z",
        publishedAt: null,
      };
      db._store["guilds/guild-1/quizzes/2026-06-06/rounds/4"] = {
        formId: "f4",
        responses: {},
        fetchedAt: "2026-06-06T19:30:00Z",
        publishedAt: "2026-06-06T19:35:00Z",
      };

      const result = await listRounds(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((r) => r.roundNumber)).toContain(1);
        expect(result.data.map((r) => r.roundNumber)).toContain(4);
      }
    });

    it("returns empty array when no rounds exist", async () => {
      const result = await listRounds(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("publishRound", () => {
    it("sets publishedAt timestamp", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/rounds/1"] = {
        formId: "f1",
        responses: sampleResponses,
        fetchedAt: "2026-06-06T19:00:00Z",
        publishedAt: null,
      };

      const result = await publishRound(db as any, "guild-1", "2026-06-06", 1);

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06/rounds/1"];
      expect(stored.publishedAt).not.toBeNull();
    });

    it("returns an error when round does not exist", async () => {
      const result = await publishRound(db as any, "guild-1", "2026-06-06", 9);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });
});
