import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTeam, getTeam, listTeams, deleteTeam } from "./teams.js";

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
    delete: vi.fn(async () => {
      delete store[path];
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

describe("teams", () => {
  let db: ReturnType<typeof mockFirestore>;

  beforeEach(() => {
    db = mockFirestore();
  });

  describe("createTeam", () => {
    it("stores team data at the correct path", async () => {
      const team = {
        name: "The Quizzicals",
        captain: "user-123",
        members: ["user-123", "user-456"],
        roleId: "role-789",
        textChannelId: "channel-111",
        voiceChannelId: "channel-222",
        color: "#ff5733",
      };

      const result = await createTeam(db as any, "guild-1", "2026-06-06", team);

      expect(result.ok).toBe(true);
      expect(db._store["guilds/guild-1/quizzes/2026-06-06/teams/The Quizzicals"]).toMatchObject({
        captain: "user-123",
        members: ["user-123", "user-456"],
        roleId: "role-789",
        textChannelId: "channel-111",
        voiceChannelId: "channel-222",
        color: "#ff5733",
      });
    });
  });

  describe("getTeam", () => {
    it("returns the team when it exists", async () => {
      // Pre-populate the store
      db._store["guilds/guild-1/quizzes/2026-06-06/teams/The Quizzicals"] = {
        captain: "user-123",
        members: ["user-123"],
        roleId: "role-789",
        textChannelId: "channel-111",
        voiceChannelId: "channel-222",
        color: "#ff5733",
        registeredAt: "2026-06-06T19:00:00Z",
      };

      const result = await getTeam(db as any, "guild-1", "2026-06-06", "The Quizzicals");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.captain).toBe("user-123");
        expect(result.data.members).toEqual(["user-123"]);
      }
    });

    it("returns an error when team does not exist", async () => {
      const result = await getTeam(db as any, "guild-1", "2026-06-06", "Nobody");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("listTeams", () => {
    it("returns all teams for a quiz session", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/teams/Alpha"] = {
        name: "Alpha",
        captain: "user-1",
        members: ["user-1"],
        roleId: "r1",
        textChannelId: "t1",
        voiceChannelId: "v1",
        color: "#aaa",
      };
      db._store["guilds/guild-1/quizzes/2026-06-06/teams/Beta"] = {
        name: "Beta",
        captain: "user-2",
        members: ["user-2"],
        roleId: "r2",
        textChannelId: "t2",
        voiceChannelId: "v2",
        color: "#bbb",
      };

      const result = await listTeams(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((t) => t.name)).toContain("Alpha");
        expect(result.data.map((t) => t.name)).toContain("Beta");
      }
    });

    it("returns an empty array when no teams exist", async () => {
      const result = await listTeams(db as any, "guild-1", "2026-06-06");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("deleteTeam", () => {
    it("removes the team from the store", async () => {
      db._store["guilds/guild-1/quizzes/2026-06-06/teams/Doomed"] = {
        name: "Doomed",
        captain: "user-1",
        members: ["user-1"],
        roleId: "r1",
        textChannelId: "t1",
        voiceChannelId: "v1",
        color: "#000",
      };

      const result = await deleteTeam(db as any, "guild-1", "2026-06-06", "Doomed");

      expect(result.ok).toBe(true);
      expect(db._store["guilds/guild-1/quizzes/2026-06-06/teams/Doomed"]).toBeUndefined();
    });

    it("returns an error when team does not exist", async () => {
      const result = await deleteTeam(db as any, "guild-1", "2026-06-06", "Ghost");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("not found");
      }
    });
  });
});
