import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChannelType, PermissionFlagsBits } from "discord.js";

vi.mock("../integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("../integrations/firestore/users.js", () => ({
  getUserTeamNames: vi.fn().mockResolvedValue({ ok: true, data: ["Old Team", "Older Team"] }),
  addTeamMember: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../integrations/firestore/members.js", () => ({
  checkMembersRegistered: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  setTeamMembers: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../integrations/firestore/aliases.js", () => ({
  lookupAlias: vi.fn().mockResolvedValue({ ok: true, data: null }),
  setAlias: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../integrations/firestore/teams.js", () => ({
  createTeam: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}));

vi.mock("../services/register-team.js", () => ({
  registerTeam: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      role: { id: "role-1" },
      textChannel: { id: "text-1" },
      voiceChannel: { id: "voice-1" },
      textifiedName: "test team",
    },
  }),
}));

vi.mock("../utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

function mockMember(id: string, opts: { bot?: boolean; admin?: boolean } = {}) {
  return {
    id,
    user: { id, username: `user-${id}`, bot: opts.bot ?? false },
    displayName: `User ${id}`,
    permissions: {
      has: vi.fn((flag: bigint) =>
        flag === PermissionFlagsBits.Administrator ? (opts.admin ?? false) : false
      ),
    },
    roles: { add: vi.fn().mockResolvedValue(undefined) },
    send: vi.fn().mockResolvedValue(undefined),
  };
}

function mockInteraction(overrides: { members?: any[]; captain?: any } = {}) {
  const captain = overrides.captain ?? mockMember("captain-1");
  const members = overrides.members ?? [];

  const optionValues: Record<string, any> = {
    "team-name": "Test Team",
    "team-captain": captain,
    "team-member-1": members[0] ?? null,
    "team-member-2": members[1] ?? null,
    "team-member-3": members[2] ?? null,
    colour: null,
  };

  const awaitMessageComponent = vi.fn().mockResolvedValue({ customId: "register" });

  const guild = {
    id: "guild-1",
    name: "Test Guild",
    ownerId: "owner-1",
    roles: {
      everyone: { id: "everyone-id" },
      cache: {
        find: vi.fn().mockReturnValue(undefined),
        map: vi.fn(() => ["@everyone", "Mod"]),
      },
      create: vi.fn().mockResolvedValue({ id: "new-role", delete: vi.fn() }),
    },
    channels: {
      cache: {
        find: vi.fn().mockReturnValue(undefined),
        map: vi.fn(() => ["general", "random"]),
      },
      create: vi.fn().mockResolvedValue({ id: "new-ch", delete: vi.fn() }),
    },
    members: {
      cache: {
        filter: vi.fn().mockReturnValue({ map: vi.fn(() => []) }),
      },
    },
  };

  return {
    guild,
    guildId: "guild-1",
    user: { id: captain.id },
    channel: { send: vi.fn().mockResolvedValue(undefined) },
    options: {
      getString: vi.fn((key: string) => optionValues[key] ?? null),
      getMember: vi.fn((key: string) => optionValues[key] ?? null),
    },
    reply: vi.fn().mockResolvedValue({ awaitMessageComponent }),
    editReply: vi.fn().mockResolvedValue(undefined),
    deleteReply: vi.fn().mockResolvedValue(undefined),
    deferred: false,
    replied: false,
    _awaitMessageComponent: awaitMessageComponent,
  };
}

describe("register command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("autocomplete", () => {
    it("responds with user's former team names filtered by input", async () => {
      const { default: command } = await import("./register.js");
      const interaction = {
        options: { getFocused: vi.fn().mockReturnValue("Old") },
        user: { id: "user-1" },
        guildId: "guild-1",
        respond: vi.fn().mockResolvedValue(undefined),
      };

      await command.autocomplete!(interaction as any);

      expect(interaction.respond).toHaveBeenCalledWith([
        { name: "Old Team", value: "Old Team" },
        { name: "Older Team", value: "Older Team" },
      ]);
    });

    it("filters by prefix case-insensitively", async () => {
      const { default: command } = await import("./register.js");
      const interaction = {
        options: { getFocused: vi.fn().mockReturnValue("old") },
        user: { id: "user-1" },
        guildId: "guild-1",
        respond: vi.fn().mockResolvedValue(undefined),
      };

      await command.autocomplete!(interaction as any);

      expect(interaction.respond).toHaveBeenCalledWith([
        { name: "Old Team", value: "Old Team" },
        { name: "Older Team", value: "Older Team" },
      ]);
    });
  });

  describe("execute", () => {
    it("replies with error when captain cannot be resolved", async () => {
      const { default: command } = await import("./register.js");
      const interaction = mockInteraction();
      interaction.options.getMember = vi.fn().mockReturnValue(null);
      interaction.options.getString = vi.fn().mockReturnValue("Test Team");

      await command.execute(interaction as any);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true })
      );
    });

    it("replies with validation errors when team fails validation", async () => {
      const { default: command } = await import("./register.js");
      const bot = mockMember("bot-1", { bot: true });
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain, members: [bot] });

      await command.execute(interaction as any);

      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.ephemeral).toBe(true);
      expect(replyCall.embeds[0].data.title).toBe("Registration Not Valid");
    });

    it("cancels when user clicks cancel button", async () => {
      const { default: command } = await import("./register.js");
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction._awaitMessageComponent.mockResolvedValue({ customId: "cancel" });

      await command.execute(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Registration cancelled." })
      );
    });

    it("handles timeout gracefully", async () => {
      const { default: command } = await import("./register.js");
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction._awaitMessageComponent.mockRejectedValue(
        new Error("Collector received no interactions before ending with reason: time")
      );

      await command.execute(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("timed out"),
        })
      );
    });

    it("calls registerTeam on confirmation and posts success", async () => {
      const { registerTeam: mockRegister } = await import("../services/register-team.js");
      const { default: command } = await import("./register.js");
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });

      await command.execute(interaction as any);

      expect(mockRegister).toHaveBeenCalled();
      expect(interaction.channel.send).toHaveBeenCalled();
      expect(interaction.deleteReply).toHaveBeenCalled();
    });
  });
});
