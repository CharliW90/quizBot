import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChannelType } from "discord.js";
import { registerTeam, type RegisterTeamContext, type RegisterTeamInput } from "./register-team.js";

vi.mock("../integrations/firestore/teams.js", () => ({
  createTeam: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}));

vi.mock("../integrations/firestore/members.js", () => ({
  setTeamMembers: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../integrations/firestore/aliases.js", () => ({
  setAlias: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../integrations/firestore/users.js", () => ({
  addTeamMember: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function mockRole(name: string, id: string) {
  return { name, id, delete: vi.fn().mockResolvedValue(undefined) };
}

function mockMember(id: string, username: string) {
  return {
    id,
    user: { username },
    displayName: username,
    roles: { add: vi.fn().mockResolvedValue(undefined) },
  };
}

function mockGuild() {
  const everyoneRole = { id: "everyone-role-id" };
  const teamsRole = mockRole("Teams", "teams-role-id");
  const captainRole = mockRole("Team Captain", "captain-role-id");
  const botRole = mockRole("Quizzy", "bot-role-id");
  const category = { name: "QUIZ TEAMS", type: ChannelType.GuildCategory, id: "cat-id" };

  const createdRole = {
    id: "new-role-id",
    name: "Team: Test Team",
    delete: vi.fn().mockResolvedValue(undefined),
  };

  const createdTextChannel = {
    id: "text-ch-id",
    name: "test team",
    type: ChannelType.GuildText,
    delete: vi.fn().mockResolvedValue(undefined),
  };

  const createdVoiceChannel = {
    id: "voice-ch-id",
    name: "Test Team",
    type: ChannelType.GuildVoice,
    delete: vi.fn().mockResolvedValue(undefined),
  };

  let createCallCount = 0;

  return {
    id: "guild-123",
    name: "Test Guild",
    ownerId: "owner-1",
    roles: {
      everyone: everyoneRole,
      cache: {
        find: vi.fn((fn: (r: any) => boolean) => {
          const roles = [teamsRole, captainRole, botRole];
          return roles.find(fn);
        }),
      },
      create: vi.fn().mockResolvedValue(createdRole),
    },
    channels: {
      cache: {
        find: vi.fn((fn: (ch: any) => boolean) => {
          const channels = [category];
          return channels.find(fn);
        }),
      },
      create: vi.fn().mockImplementation(() => {
        createCallCount++;
        if (createCallCount === 1) return Promise.resolve(createdTextChannel);
        return Promise.resolve(createdVoiceChannel);
      }),
    },
    _mocks: { createdRole, createdTextChannel, createdVoiceChannel },
  };
}

function setup() {
  const guild = mockGuild();
  const captain = mockMember("captain-1", "CaptainUser");
  const member1 = mockMember("member-1", "MemberOne");

  const input: RegisterTeamInput = {
    teamName: "Test Team",
    captain: captain as any,
    members: [member1 as any],
    color: 0x3498db,
  };

  const ctx: RegisterTeamContext = {
    guild: guild as any,
    db: {} as any,
    quizDate: "2026-08-07",
    botRoleName: "Quizzy",
    categoryName: "QUIZ TEAMS",
  };

  return { guild, captain, member1, input, ctx };
}

describe("registerTeam", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a role with the team name", async () => {
    const { guild, input, ctx } = setup();
    await registerTeam(input, ctx);

    expect(guild.roles.create).toHaveBeenCalledWith({
      name: "Team: Test Team",
      color: 0x3498db,
      hoist: true,
      mentionable: true,
    });
  });

  it("assigns team role to all members", async () => {
    const { captain, member1, input, ctx, guild } = setup();
    await registerTeam(input, ctx);

    expect(captain.roles.add).toHaveBeenCalledWith(guild._mocks.createdRole);
    expect(member1.roles.add).toHaveBeenCalledWith(guild._mocks.createdRole);
  });

  it("assigns Teams role to all members", async () => {
    const { captain, member1, input, ctx } = setup();
    await registerTeam(input, ctx);

    const teamsRoleCalls = captain.roles.add.mock.calls.filter(
      (call: any[]) => call[0]?.name === "Teams"
    );
    expect(teamsRoleCalls).toHaveLength(1);
  });

  it("assigns Team Captain role only to captain", async () => {
    const { captain, member1, input, ctx } = setup();
    await registerTeam(input, ctx);

    const captainRoleCalls = captain.roles.add.mock.calls.filter(
      (call: any[]) => call[0]?.name === "Team Captain"
    );
    expect(captainRoleCalls).toHaveLength(1);

    const memberCaptainCalls = member1.roles.add.mock.calls.filter(
      (call: any[]) => call[0]?.name === "Team Captain"
    );
    expect(memberCaptainCalls).toHaveLength(0);
  });

  it("creates text and voice channels under the category", async () => {
    const { guild, input, ctx } = setup();
    await registerTeam(input, ctx);

    expect(guild.channels.create).toHaveBeenCalledTimes(2);

    const textCall = guild.channels.create.mock.calls[0][0];
    expect(textCall.name).toBe("test team");
    expect(textCall.type).toBe(ChannelType.GuildText);

    const voiceCall = guild.channels.create.mock.calls[1][0];
    expect(voiceCall.name).toBe("Test Team");
    expect(voiceCall.type).toBe(ChannelType.GuildVoice);
  });

  it("returns ok with role and channels on success", async () => {
    const { guild, input, ctx } = setup();
    const result = await registerTeam(input, ctx);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.role).toBe(guild._mocks.createdRole);
      expect(result.data.textChannel).toBe(guild._mocks.createdTextChannel);
      expect(result.data.voiceChannel).toBe(guild._mocks.createdVoiceChannel);
      expect(result.data.textifiedName).toBe("test team");
    }
  });

  it("calls Firestore createTeam with correct data", async () => {
    const { input, ctx } = setup();
    const { createTeam: mockCreateTeam } = await import("../integrations/firestore/teams.js");

    await registerTeam(input, ctx);

    expect(mockCreateTeam).toHaveBeenCalledWith({}, "guild-123", "2026-08-07", {
      name: "Test Team",
      captain: "captain-1",
      members: ["captain-1", "member-1"],
      roleId: "new-role-id",
      textChannelId: "text-ch-id",
      voiceChannelId: "voice-ch-id",
      color: String(0x3498db),
    });
  });

  it("calls setTeamMembers with all member IDs", async () => {
    const { input, ctx } = setup();
    const { setTeamMembers: mockSetMembers } = await import("../integrations/firestore/members.js");

    await registerTeam(input, ctx);

    expect(mockSetMembers).toHaveBeenCalledWith(
      {},
      "guild-123",
      "2026-08-07",
      "test team",
      ["captain-1", "member-1"]
    );
  });

  it("calls addTeamMember for each member", async () => {
    const { input, ctx } = setup();
    const { addTeamMember: mockAddUser } = await import("../integrations/firestore/users.js");

    await registerTeam(input, ctx);

    expect(mockAddUser).toHaveBeenCalledTimes(2);
  });

  describe("rollback", () => {
    it("rolls back role and channels when category is missing", async () => {
      const { guild, input, ctx } = setup();
      guild.channels.cache.find = vi.fn().mockReturnValue(undefined);

      const result = await registerTeam(input, ctx);

      expect(result.ok).toBe(false);
      expect(guild._mocks.createdRole.delete).toHaveBeenCalled();
    });

    it("rolls back all Discord resources when createTeam fails", async () => {
      const { guild, input, ctx } = setup();
      const { createTeam: mockCreateTeam } = await import("../integrations/firestore/teams.js");
      (mockCreateTeam as any).mockResolvedValueOnce({ ok: false, error: "quiz ended" });

      const result = await registerTeam(input, ctx);

      expect(result.ok).toBe(false);
      expect(guild._mocks.createdRole.delete).toHaveBeenCalled();
      expect(guild._mocks.createdTextChannel.delete).toHaveBeenCalled();
      expect(guild._mocks.createdVoiceChannel.delete).toHaveBeenCalled();
    });

    it("rolls back when role creation throws", async () => {
      const { guild, input, ctx } = setup();
      guild.roles.create = vi.fn().mockRejectedValue(new Error("Discord API error"));

      const result = await registerTeam(input, ctx);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe("Discord API error");
      }
    });
  });

  describe("alias handling", () => {
    it("sets alias when textified name differs from team name", async () => {
      const { input, ctx } = setup();
      input.teamName = "A+B Team";
      const { setAlias: mockSetAlias } = await import("../integrations/firestore/aliases.js");

      await registerTeam(input, ctx);

      expect(mockSetAlias).toHaveBeenCalledWith(
        {},
        "guild-123",
        "2026-08-07",
        "a＋b team",
        "a+b team"
      );
    });

    it("does not set alias when names match", async () => {
      const { input, ctx } = setup();
      input.teamName = "simple";
      const { setAlias: mockSetAlias } = await import("../integrations/firestore/aliases.js");

      await registerTeam(input, ctx);

      expect(mockSetAlias).not.toHaveBeenCalled();
    });
  });
});
