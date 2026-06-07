import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTeam, getTeam } from "./teams.js";

// We'll mock Firestore by creating a fake that mimics its interface.
// Think of this like a stub implementation of a trait in Scala.

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
  });

  const collection = (collectionPath: string) => ({
    doc: (id: string) => doc(`${collectionPath}/${id}`),
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
});
