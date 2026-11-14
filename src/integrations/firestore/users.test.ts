import { describe, it, expect, vi, beforeEach } from "vitest";
import { addTeamMember, getUserTeamNames } from "./users.js";

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

describe("users", () => {
  let db: ReturnType<typeof mockFirestore>;

  beforeEach(() => {
    db = mockFirestore();
  });

  describe("addTeamMember", () => {
    it("creates user and guild records for a new user", async () => {
      const result = await addTeamMember(
        db as any,
        "user-1", "cooluser", "Cool User",
        "guild-1", "Quiz Server", "owner-1",
        "The Quizzicals"
      );

      expect(result.ok).toBe(true);
      expect(db._store["users/user-1"]).toMatchObject({
        currentName: "Cool User",
        initialName: "Cool User",
        username: "cooluser",
      });
      expect(db._store["users/user-1/servers/guild-1"]).toMatchObject({
        usersTeams: ["The Quizzicals"],
        server: {
          name: "Quiz Server",
          owner: "owner-1",
          initialName: "Quiz Server",
          initialOwner: "owner-1",
        },
      });
    });

    it("adds team name to existing user guild record", async () => {
      db._store["users/user-1"] = {
        currentName: "Cool User",
        initialName: "Cool User",
        username: "cooluser",
      };
      db._store["users/user-1/servers/guild-1"] = {
        usersTeams: ["Old Team"],
        server: { name: "Quiz Server", owner: "owner-1", initialName: "Quiz Server", initialOwner: "owner-1" },
      };

      const result = await addTeamMember(
        db as any,
        "user-1", "cooluser", "Cool User",
        "guild-1", "Quiz Server", "owner-1",
        "New Team"
      );

      expect(result.ok).toBe(true);
      const guildData = db._store["users/user-1/servers/guild-1"];
      expect(guildData.usersTeams).toEqual(["New Team", "Old Team"]);
    });

    it("does not duplicate an existing team name", async () => {
      db._store["users/user-1"] = {
        currentName: "Cool User",
        initialName: "Cool User",
        username: "cooluser",
      };
      db._store["users/user-1/servers/guild-1"] = {
        usersTeams: ["The Quizzicals"],
        server: { name: "Quiz Server", owner: "owner-1", initialName: "Quiz Server", initialOwner: "owner-1" },
      };

      const result = await addTeamMember(
        db as any,
        "user-1", "cooluser", "Cool User",
        "guild-1", "Quiz Server", "owner-1",
        "The Quizzicals"
      );

      expect(result.ok).toBe(true);
      const guildData = db._store["users/user-1/servers/guild-1"];
      expect(guildData.usersTeams).toEqual(["The Quizzicals"]);
    });

    it("updates display name when it has changed", async () => {
      db._store["users/user-1"] = {
        currentName: "Old Name",
        initialName: "Old Name",
        username: "cooluser",
      };
      db._store["users/user-1/servers/guild-1"] = {
        usersTeams: [],
        server: { name: "Quiz Server", owner: "owner-1", initialName: "Quiz Server", initialOwner: "owner-1" },
      };

      await addTeamMember(
        db as any,
        "user-1", "cooluser", "New Name",
        "guild-1", "Quiz Server", "owner-1",
        "Team X"
      );

      expect(db._store["users/user-1"].currentName).toBe("New Name");
    });
  });

  describe("getUserTeamNames", () => {
    it("returns empty array for unknown user", async () => {
      const result = await getUserTeamNames(db as any, "unknown", "guild-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns empty array for user with no guild record", async () => {
      db._store["users/user-1"] = {
        currentName: "User",
        initialName: "User",
        username: "user",
      };

      const result = await getUserTeamNames(db as any, "user-1", "guild-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([]);
      }
    });

    it("returns team names for a known user/guild", async () => {
      db._store["users/user-1"] = {
        currentName: "User",
        initialName: "User",
        username: "user",
      };
      db._store["users/user-1/servers/guild-1"] = {
        usersTeams: ["Team A", "Team B"],
        server: { name: "Server", owner: "o", initialName: "Server", initialOwner: "o" },
      };

      const result = await getUserTeamNames(db as any, "user-1", "guild-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(["Team A", "Team B"]);
      }
    });
  });
});
