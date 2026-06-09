import { describe, it, expect, vi, beforeEach } from "vitest";
import { setAlias, getAliases, lookupAlias, deleteAliasesForTeam } from "./aliases.js";

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

describe("aliases", () => {
  let db: ReturnType<typeof mockFirestore>;

  beforeEach(() => {
    db = mockFirestore();
  });

  describe("setAlias", () => {
    it("creates the aliases doc if it does not exist", async () => {
      const result = await setAlias(db as any, "guild-1", "2026-06-06", "quizzly-bears", "Quizzly Bears!");

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsAliases"];
      expect(stored["quizzly-bears"]).toBe("Quizzly Bears!");
    });

    it("adds to existing aliases doc", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsAliases"] = {
        "team-one": "Team One!",
      };

      const result = await setAlias(db as any, "guild-1", "2026-06-06", "team-two", "Team Two!");

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsAliases"];
      expect(stored["team-one"]).toBe("Team One!");
      expect(stored["team-two"]).toBe("Team Two!");
    });

    it("rejects writes when quiz is ended", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = { status: "ended" };

      const result = await setAlias(db as any, "guild-1", "2026-06-06", "alias", "Team");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("ended");
      }
    });
  });

  describe("getAliases", () => {
    it("returns empty object when no aliases exist", async () => {
      const result = await getAliases(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({});
      }
    });

    it("returns all aliases", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsAliases"] = {
        "team-alpha": "Team Alpha",
        "team-beta": "Team Beta",
      };

      const result = await getAliases(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({
          "team-alpha": "Team Alpha",
          "team-beta": "Team Beta",
        });
      }
    });
  });

  describe("lookupAlias", () => {
    it("returns null when alias not found", async () => {
      const result = await lookupAlias(db as any, "guild-1", "2026-06-06", "unknown");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBeNull();
      }
    });

    it("returns the team name for a known alias", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsAliases"] = {
        "quizzly-bears": "Quizzly Bears!",
      };

      const result = await lookupAlias(db as any, "guild-1", "2026-06-06", "quizzly-bears");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toBe("Quizzly Bears!");
      }
    });
  });

  describe("deleteAliasesForTeam", () => {
    it("removes all aliases pointing to the given team", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsAliases"] = {
        "quizzly-bears": "Quizzly Bears!",
        "the-bears": "Quizzly Bears!",
        "team-other": "Other Team",
      };

      const result = await deleteAliasesForTeam(db as any, "guild-1", "2026-06-06", "Quizzly Bears!");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toContain("quizzly-bears");
        expect(result.data).toContain("the-bears");
        expect(result.data).toHaveLength(2);
      }
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsAliases"];
      expect(stored["team-other"]).toBe("Other Team");
      expect(stored["quizzly-bears"]).toBeUndefined();
    });

    it("returns empty array when no aliases doc exists", async () => {
      const result = await deleteAliasesForTeam(db as any, "guild-1", "2026-06-06", "Nobody");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });

    it("rejects when quiz is ended", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = { status: "ended" };

      const result = await deleteAliasesForTeam(db as any, "guild-1", "2026-06-06", "Team");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("ended");
      }
    });
  });
});
