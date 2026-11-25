import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addMembers,
  removeMembers,
  promoteToCaptain,
  type TeamMemberContext,
} from "../../src/services/team-members.js";

vi.mock("../../src/integrations/firestore/members.js", () => ({
  setTeamMembers: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  deleteTeamMembers: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../../src/integrations/firestore/teams.js", () => ({
  updateTeam: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function mockMember(id: string) {
  return {
    id,
    user: { id, username: `user-${id}` },
    roles: {
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      cache: { has: vi.fn().mockReturnValue(true) },
    },
  };
}

function mockContext(): TeamMemberContext {
  const teamRole = { id: "team-role-id", name: "Team: Wizards" };
  const teamsRole = { id: "teams-role-id", name: "Teams" };
  const captainRole = { id: "captain-role-id", name: "Team Captain" };

  return {
    guild: {
      id: "guild-1",
      roles: {
        cache: {
          find: vi.fn((fn: (r: any) => boolean) => {
            return [teamsRole, captainRole].find(fn);
          }),
        },
      },
      members: {
        cache: {
          filter: vi.fn().mockReturnValue({ map: vi.fn(() => ["m1", "m2"]) }),
        },
      },
    } as any,
    db: {} as any,
    quizDate: "2026-08-07",
    teamName: "Wizards",
    teamRole: teamRole as any,
  };
}

describe("addMembers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("assigns team role to each new member", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");

    const result = await addMembers(ctx, [member as any]);

    expect(result.ok).toBe(true);
    expect(member.roles.add).toHaveBeenCalledWith(ctx.teamRole);
  });

  it("assigns Teams role to each new member", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");

    await addMembers(ctx, [member as any]);

    const teamsRoleCalls = member.roles.add.mock.calls.filter(
      (call: any[]) => call[0]?.name === "Teams",
    );
    expect(teamsRoleCalls).toHaveLength(1);
  });

  it("writes to Firestore members map", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");
    const { setTeamMembers } = await import("../../src/integrations/firestore/members.js");

    await addMembers(ctx, [member as any]);

    expect(setTeamMembers).toHaveBeenCalledWith({}, "guild-1", "2026-08-07", "wizards", ["m1"]);
  });

  it("returns err when updateTeam fails", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");
    const { updateTeam } = await import("../../src/integrations/firestore/teams.js");
    (updateTeam as any).mockResolvedValueOnce({ ok: false, error: "quiz ended" });

    const result = await addMembers(ctx, [member as any]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("quiz ended");
  });

  it("returns err on role assignment failure", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");
    member.roles.add = vi.fn().mockRejectedValue(new Error("Missing permissions"));

    const result = await addMembers(ctx, [member as any]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Missing permissions");
  });

  it("returns generic message when non-Error is thrown", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");
    member.roles.add = vi.fn().mockRejectedValue("string error");

    const result = await addMembers(ctx, [member as any]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Failed to add members");
  });

  it("skips Teams role assignment when Teams role does not exist", async () => {
    const ctx = mockContext();
    (ctx.guild.roles.cache.find as any) = vi.fn().mockReturnValue(undefined);
    const member = mockMember("m1");

    const result = await addMembers(ctx, [member as any]);

    expect(result.ok).toBe(true);
    expect(member.roles.add).toHaveBeenCalledTimes(1);
    expect(member.roles.add).toHaveBeenCalledWith(ctx.teamRole);
  });
});

describe("removeMembers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes team role from each member", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");

    const result = await removeMembers(ctx, [member as any]);

    expect(result.ok).toBe(true);
    expect(member.roles.remove).toHaveBeenCalledWith(ctx.teamRole);
  });

  it("removes Teams role from each member", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");

    await removeMembers(ctx, [member as any]);

    const teamsRoleCalls = member.roles.remove.mock.calls.filter(
      (call: any[]) => call[0]?.name === "Teams",
    );
    expect(teamsRoleCalls).toHaveLength(1);
  });

  it("deletes from Firestore members map", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");
    const { deleteTeamMembers } = await import("../../src/integrations/firestore/members.js");

    await removeMembers(ctx, [member as any]);

    expect(deleteTeamMembers).toHaveBeenCalledWith({}, "guild-1", "2026-08-07", ["m1"]);
  });

  it("returns err on role removal failure", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");
    member.roles.remove = vi.fn().mockRejectedValue(new Error("Missing permissions"));

    const result = await removeMembers(ctx, [member as any]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Missing permissions");
  });

  it("returns generic message when non-Error is thrown", async () => {
    const ctx = mockContext();
    const member = mockMember("m1");
    member.roles.remove = vi.fn().mockRejectedValue("string error");

    const result = await removeMembers(ctx, [member as any]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Failed to remove members");
  });
});

describe("promoteToCaptain", () => {
  beforeEach(() => vi.clearAllMocks());

  it("assigns captain role to new captain and removes from old", async () => {
    const ctx = mockContext();
    const oldCaptain = mockMember("old");
    const newCaptain = mockMember("new");

    const result = await promoteToCaptain(ctx, oldCaptain as any, newCaptain as any);

    expect(result.ok).toBe(true);
    expect(newCaptain.roles.add).toHaveBeenCalled();
    expect(oldCaptain.roles.remove).toHaveBeenCalled();
  });

  it("updates team captain in Firestore", async () => {
    const ctx = mockContext();
    const oldCaptain = mockMember("old");
    const newCaptain = mockMember("new");
    const { updateTeam } = await import("../../src/integrations/firestore/teams.js");

    await promoteToCaptain(ctx, oldCaptain as any, newCaptain as any);

    expect(updateTeam).toHaveBeenCalledWith({}, "guild-1", "2026-08-07", "Wizards", {
      captain: "new",
      members: ["m1", "m2"],
    });
  });

  it("returns err on role assignment failure", async () => {
    const ctx = mockContext();
    const oldCaptain = mockMember("old");
    const newCaptain = mockMember("new");
    newCaptain.roles.add = vi.fn().mockRejectedValue(new Error("Discord API error"));

    const result = await promoteToCaptain(ctx, oldCaptain as any, newCaptain as any);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Discord API error");
  });

  it("returns generic message when non-Error is thrown", async () => {
    const ctx = mockContext();
    const oldCaptain = mockMember("old");
    const newCaptain = mockMember("new");
    newCaptain.roles.add = vi.fn().mockRejectedValue("string error");

    const result = await promoteToCaptain(ctx, oldCaptain as any, newCaptain as any);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Failed to promote captain");
  });

  it("returns err if captain role not found", async () => {
    const ctx = mockContext();
    (ctx.guild.roles.cache.find as any) = vi.fn().mockReturnValue(undefined);

    const result = await promoteToCaptain(ctx, mockMember("old") as any, mockMember("new") as any);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Team Captain role not found");
  });
});
