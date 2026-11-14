import { describe, it, expect, vi, beforeEach } from "vitest";
import { deleteTeamByRole, type DeleteTeamContext } from "./delete-team.js";

vi.mock("../integrations/firestore/teams.js", () => ({
  deleteTeam: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../integrations/firestore/members.js", () => ({
  deleteTeamMembers: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../integrations/firestore/aliases.js", () => ({
  deleteAliasesForTeam: vi.fn().mockResolvedValue({ ok: true, data: [] }),
}));

vi.mock("../utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function mockGuild() {
  const teamsRole = { id: "teams-role-id", name: "Teams" };
  const captainRole = { id: "captain-role-id", name: "Team Captain" };

  const member1 = {
    id: "m1",
    roles: {
      cache: { has: (id: string) => id === "team-role-id" || id === "captain-role-id" },
      remove: vi.fn().mockResolvedValue(undefined),
    },
  };
  const member2 = {
    id: "m2",
    roles: {
      cache: { has: (id: string) => id === "team-role-id" },
      remove: vi.fn().mockResolvedValue(undefined),
    },
  };

  const membersCollection = new Map([
    ["m1", member1],
    ["m2", member2],
  ]);
  const filteredMembers = {
    map: vi.fn((fn: (m: any) => any) => [...membersCollection.values()].map(fn)),
    filter: vi.fn((fn: (m: any) => boolean) => [...membersCollection.values()].filter(fn)),
    size: 2,
    [Symbol.iterator]: function* () {
      yield* membersCollection.values();
    },
  };

  const textChannel = { name: "wizards", parentId: "cat-1", isVoiceBased: () => false, delete: vi.fn().mockResolvedValue(undefined) };
  const voiceChannel = { name: "Wizards", parentId: "cat-1", isVoiceBased: () => true, delete: vi.fn().mockResolvedValue(undefined) };

  return {
    guild: {
      id: "guild-1",
      roles: {
        cache: {
          find: vi.fn((fn: (r: any) => boolean) => [teamsRole, captainRole].find(fn)),
        },
      },
      members: {
        cache: {
          filter: vi.fn(() => filteredMembers),
        },
      },
      channels: {
        cache: {
          find: vi.fn((fn: (ch: any) => boolean) => [textChannel, voiceChannel].find(fn)),
        },
      },
    },
    textChannel,
    voiceChannel,
    member1,
    member2,
  };
}

describe("deleteTeamByRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the team role", async () => {
    const { guild } = mockGuild();
    const teamRole = { id: "team-role-id", name: "Team: Wizards", delete: vi.fn().mockResolvedValue(undefined) };
    const ctx: DeleteTeamContext = { guild: guild as any, db: {} as any, quizDate: "2026-08-07" };

    const result = await deleteTeamByRole(ctx, teamRole as any);

    expect(result.ok).toBe(true);
    expect(teamRole.delete).toHaveBeenCalled();
  });

  it("deletes text and voice channels", async () => {
    const { guild, textChannel, voiceChannel } = mockGuild();
    const teamRole = { id: "team-role-id", name: "Team: Wizards", delete: vi.fn().mockResolvedValue(undefined) };
    const ctx: DeleteTeamContext = { guild: guild as any, db: {} as any, quizDate: "2026-08-07" };

    await deleteTeamByRole(ctx, teamRole as any);

    expect(textChannel.delete).toHaveBeenCalled();
    expect(voiceChannel.delete).toHaveBeenCalled();
  });

  it("removes roles from all team members", async () => {
    const { guild, member1, member2 } = mockGuild();
    const teamRole = { id: "team-role-id", name: "Team: Wizards", delete: vi.fn().mockResolvedValue(undefined) };
    const ctx: DeleteTeamContext = { guild: guild as any, db: {} as any, quizDate: "2026-08-07" };

    await deleteTeamByRole(ctx, teamRole as any);

    expect(member1.roles.remove).toHaveBeenCalled();
    expect(member2.roles.remove).toHaveBeenCalled();
  });

  it("cleans up Firestore data", async () => {
    const { guild } = mockGuild();
    const teamRole = { id: "team-role-id", name: "Team: Wizards", delete: vi.fn().mockResolvedValue(undefined) };
    const ctx: DeleteTeamContext = { guild: guild as any, db: {} as any, quizDate: "2026-08-07" };
    const { deleteTeam } = await import("../integrations/firestore/teams.js");
    const { deleteTeamMembers } = await import("../integrations/firestore/members.js");
    const { deleteAliasesForTeam } = await import("../integrations/firestore/aliases.js");

    await deleteTeamByRole(ctx, teamRole as any);

    expect(deleteTeam).toHaveBeenCalledWith({}, "guild-1", "2026-08-07", "Wizards");
    expect(deleteTeamMembers).toHaveBeenCalled();
    expect(deleteAliasesForTeam).toHaveBeenCalledWith({}, "guild-1", "2026-08-07", "Wizards");
  });

  it("returns result with deletion summary", async () => {
    const { guild } = mockGuild();
    const teamRole = { id: "team-role-id", name: "Team: Wizards", delete: vi.fn().mockResolvedValue(undefined) };
    const ctx: DeleteTeamContext = { guild: guild as any, db: {} as any, quizDate: "2026-08-07" };

    const result = await deleteTeamByRole(ctx, teamRole as any);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.deletedRole).toBe("Team: Wizards");
      expect(result.data.deletedChannels).toHaveLength(2);
      expect(result.data.removedMemberCount).toBe(2);
    }
  });

  it("returns err on failure", async () => {
    const { guild } = mockGuild();
    const teamRole = { id: "team-role-id", name: "Team: Wizards", delete: vi.fn().mockRejectedValue(new Error("No perms")) };
    const ctx: DeleteTeamContext = { guild: guild as any, db: {} as any, quizDate: "2026-08-07" };

    const result = await deleteTeamByRole(ctx, teamRole as any);

    expect(result.ok).toBe(false);
  });
});
