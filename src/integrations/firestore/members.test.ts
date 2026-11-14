import { describe, it, expect, vi, beforeEach } from "vitest";
import { setTeamMembers, getTeamMembers, checkMembersRegistered, deleteTeamMembers } from "./members.js";

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

describe("members", () => {
  let db: ReturnType<typeof mockFirestore>;

  beforeEach(() => {
    db = mockFirestore();
  });

  describe("setTeamMembers", () => {
    it("creates the members doc if it does not exist", async () => {
      const result = await setTeamMembers(db as any, "guild-1", "2026-06-06", "Alpha", ["user-1", "user-2"]);

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsMembers"];
      expect(stored["user-1"]).toBe("Alpha");
      expect(stored["user-2"]).toBe("Alpha");
    });

    it("adds to existing members doc", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsMembers"] = {
        "user-1": "Alpha",
      };

      const result = await setTeamMembers(db as any, "guild-1", "2026-06-06", "Beta", ["user-2"]);

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsMembers"];
      expect(stored["user-1"]).toBe("Alpha");
      expect(stored["user-2"]).toBe("Beta");
    });

    it("rejects writes when quiz is ended", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = { status: "ended" };

      const result = await setTeamMembers(db as any, "guild-1", "2026-06-06", "Alpha", ["user-1"]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("ended");
      }
    });
  });

  describe("getTeamMembers", () => {
    it("returns empty object when no members doc exists", async () => {
      const result = await getTeamMembers(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({});
      }
    });

    it("returns full member-to-team mapping", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsMembers"] = {
        "user-1": "Alpha",
        "user-2": "Alpha",
        "user-3": "Beta",
      };

      const result = await getTeamMembers(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data["user-1"]).toBe("Alpha");
        expect(result.data["user-3"]).toBe("Beta");
      }
    });
  });

  describe("checkMembersRegistered", () => {
    it("returns empty array when no conflicts", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsMembers"] = {
        "user-1": "Alpha",
      };

      const result = await checkMembersRegistered(db as any, "guild-1", "2026-06-06", ["user-2", "user-3"]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns conflicts for already-registered members", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsMembers"] = {
        "user-1": "Alpha",
        "user-2": "Beta",
      };

      const result = await checkMembersRegistered(db as any, "guild-1", "2026-06-06", ["user-1", "user-3"]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([{ userId: "user-1", teamName: "Alpha" }]);
      }
    });

    it("returns empty array when no members doc exists", async () => {
      const result = await checkMembersRegistered(db as any, "guild-1", "2026-06-06", ["user-1"]);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("deleteTeamMembers", () => {
    it("removes specified members from the map", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsMembers"] = {
        "user-1": "Alpha",
        "user-2": "Alpha",
        "user-3": "Beta",
      };

      const result = await deleteTeamMembers(db as any, "guild-1", "2026-06-06", ["user-1", "user-2"]);

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/quizzes/2026-06-06/maps/teamsMembers"];
      expect(stored["user-1"]).toBeUndefined();
      expect(stored["user-2"]).toBeUndefined();
      expect(stored["user-3"]).toBe("Beta");
    });

    it("succeeds when no members doc exists", async () => {
      const result = await deleteTeamMembers(db as any, "guild-1", "2026-06-06", ["user-1"]);

      expect(result.ok).toBe(true);
    });

    it("rejects when quiz is ended", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06"] = { status: "ended" };

      const result = await deleteTeamMembers(db as any, "guild-1", "2026-06-06", ["user-1"]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("ended");
      }
    });
  });
});
