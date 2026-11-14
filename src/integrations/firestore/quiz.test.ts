import { describe, it, expect, vi, beforeEach } from "vitest";
import { createQuiz, getQuiz, listQuizzes, endQuiz } from "./quiz.js";

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

describe("quiz", () => {
  let db: ReturnType<typeof mockFirestore>;

  beforeEach(() => {
    db = mockFirestore();
  });

  describe("createQuiz", () => {
    it("creates a quiz with active status", async () => {
      const result = await createQuiz(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06"];
      expect(stored.status).toBe("active");
      expect(stored.createdAt).toBeDefined();
    });

    it("returns an error if quiz already exists for that date", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = {
        status: "active",
        createdAt: "2026-06-06T18:00:00Z",
      };

      const result = await createQuiz(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("already exists");
      }
    });
  });

  describe("getQuiz", () => {
    it("returns the quiz when it exists", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = {
        status: "active",
        createdAt: "2026-06-06T18:00:00Z",
      };

      const result = await getQuiz(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.status).toBe("active");
        expect(result.data.date).toBe("2026-06-06");
      }
    });

    it("returns an error when quiz does not exist", async () => {
      const result = await getQuiz(db as any, "guild-1", "2026-01-01");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("listQuizzes", () => {
    it("returns all quizzes for a guild", async () => {
      db._store["guilds/guild-1/quizzes/2026-05-02"] = {
        status: "ended",
        createdAt: "2026-05-02T18:00:00Z",
      };
      db._store["guilds/guild-1/quizzes/2026-06-06"] = {
        status: "active",
        createdAt: "2026-06-06T18:00:00Z",
      };

      const result = await listQuizzes(db as any, "guild-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((q) => q.date)).toContain("2026-05-02");
        expect(result.data.map((q) => q.date)).toContain("2026-06-06");
      }
    });

    it("returns empty array when no quizzes exist", async () => {
      const result = await listQuizzes(db as any, "guild-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("endQuiz", () => {
    it("sets status to ended", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = {
        status: "active",
        createdAt: "2026-06-06T18:00:00Z",
      };

      const result = await endQuiz(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      expect(db._store["guilds/guild-1/quizzes/2026-06-06"].status).toBe("ended");
    });

    it("returns an error if quiz does not exist", async () => {
      const result = await endQuiz(db as any, "guild-1", "2026-01-01");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });

    it("returns an error if quiz is already ended", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = {
        status: "ended",
        createdAt: "2026-06-06T18:00:00Z",
      };

      const result = await endQuiz(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("already ended");
      }
    });
  });
});
