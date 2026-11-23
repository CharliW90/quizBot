import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageFlags, PermissionFlagsBits } from "discord.js";
import type { Command } from "../../src/bot/types.js";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => ({})),
}));

vi.mock("../../src/integrations/firestore/users.js", () => ({
  getUserTeamNames: vi.fn().mockResolvedValue({ ok: true, data: ["Old Team", "Older Team"] }),
  addTeamMember: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../../src/integrations/firestore/members.js", () => ({
  checkMembersRegistered: vi.fn().mockResolvedValue({ ok: true, data: [] }),
  setTeamMembers: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../../src/integrations/firestore/aliases.js", () => ({
  lookupAlias: vi.fn().mockResolvedValue({ ok: true, data: null }),
  setAlias: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}));

vi.mock("../../src/integrations/firestore/teams.js", () => ({
  createTeam: vi.fn().mockResolvedValue({ ok: true, data: {} }),
}));

vi.mock("../../src/services/register-team.js", () => ({
  registerTeam: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { registerTeam } from "../../src/services/register-team.js";
import { checkMembersRegistered } from "../../src/integrations/firestore/members.js";

const mockRegisterTeam = vi.mocked(registerTeam);
const mockCheckMembersRegistered = vi.mocked(checkMembersRegistered);

function mockMember(id: string, opts: { bot?: boolean; admin?: boolean } = {}) {
  return {
    id,
    user: { id, username: `user-${id}`, bot: opts.bot ?? false },
    displayName: `User ${id}`,
    permissions: {
      has: vi.fn((flag: bigint) =>
        flag === PermissionFlagsBits.Administrator ? (opts.admin ?? false) : false,
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
    mockRegisterTeam.mockResolvedValue({
      ok: true,
      data: {
        role: { id: "role-1" },
        textChannel: { id: "text-1" },
        voiceChannel: { id: "voice-1" },
        textifiedName: "test team",
      },
    } as any);
  });

  describe("autocomplete", () => {
    it("responds with user's former team names filtered by input", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
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

    it("returns empty list when getUserTeamNames fails", async () => {
      const { getUserTeamNames } = await import("../../src/integrations/firestore/users.js");
      vi.mocked(getUserTeamNames).mockResolvedValueOnce({ ok: false, error: "Firestore down" });

      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const interaction = {
        options: { getFocused: vi.fn().mockReturnValue("") },
        user: { id: "user-1" },
        guildId: "guild-1",
        respond: vi.fn().mockResolvedValue(undefined),
      };

      await command.autocomplete!(interaction as any);

      expect(interaction.respond).toHaveBeenCalledWith([]);
    });

    it("filters by prefix case-insensitively", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
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
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const interaction = mockInteraction();
      interaction.options.getMember = vi.fn().mockReturnValue(null);
      interaction.options.getString = vi.fn().mockReturnValue("Test Team");

      await command.execute(interaction as any);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ flags: MessageFlags.Ephemeral }),
      );
    });

    it("replies with validation errors when team fails validation", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const bot = mockMember("bot-1", { bot: true });
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain, members: [bot] });

      await command.execute(interaction as any);

      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.flags).toBe(MessageFlags.Ephemeral);
      expect(replyCall.embeds[0].data.title).toBe("Registration Not Valid");
    });

    it("cancels when user clicks cancel button", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction._awaitMessageComponent.mockResolvedValue({ customId: "cancel" });

      await command.execute(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Registration cancelled." }),
      );
    });

    it("handles timeout gracefully", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction._awaitMessageComponent.mockRejectedValue(
        new Error("Collector received no interactions before ending with reason: time"),
      );

      await command.execute(interaction as any);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("timed out"),
        }),
      );
    });

    it("calls registerTeam on confirmation and posts success", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });

      await command.execute(interaction as any);

      expect(mockRegisterTeam).toHaveBeenCalled();
      expect(interaction.channel.send).toHaveBeenCalled();
      expect(interaction.deleteReply).toHaveBeenCalled();
    });

    it("replies ephemeral when used outside a guild", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const interaction = mockInteraction();
      interaction.guild = null as any;
      interaction.guildId = null as any;

      await command.execute(interaction as any);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "This command can only be used in a server.",
          flags: MessageFlags.Ephemeral,
        }),
      );
    });

    it("shows error when registerTeam returns failure", async () => {
      mockRegisterTeam.mockResolvedValue({ ok: false, error: "Role creation failed" });
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });

      await command.execute(interaction as any);

      const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
      expect(lastEdit.embeds[0].data.title).toBe("Registration Failed");
    });

    it("handles unexpected error in catch block", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction._awaitMessageComponent.mockRejectedValue(new Error("Network failure"));

      await command.execute(interaction as any);

      const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
      expect(lastEdit.embeds[0].data.title).toBe("Unexpected Error");
    });

    it("shows textified name in parentheses when different from team name", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction.options.getString = vi.fn((key: string) => {
        if (key === "team-name") return "Team & Co";
        return null;
      });

      await command.execute(interaction as any);

      const sendCall = interaction.channel.send.mock.calls[0][0];
      const embed = sendCall.embeds[0];
      const teamNameField = embed.data.fields.find((f: any) => f.name === "Team Name");
      expect(teamNameField.value).toContain("(");
      expect(teamNameField.value).toContain("team and co");
    });

    it("includes team members in success embed when members exist", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const member1 = mockMember("member-1");
      const interaction = mockInteraction({ captain, members: [member1] });

      await command.execute(interaction as any);

      const sendCall = interaction.channel.send.mock.calls[0][0];
      const embed = sendCall.embeds[0];
      const membersField = embed.data.fields.find((f: any) => f.name === "Team Members");
      expect(membersField).toBeDefined();
    });

    it("does not post to channel when interaction.channel has no send method", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction.channel = null;

      await command.execute(interaction as any);

      expect(interaction.deleteReply).toHaveBeenCalled();
    });

    it("passes named colour to registerTeam", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction.options.getString = vi.fn((key: string) => {
        if (key === "team-name") return "Test Team";
        if (key === "colour") return "Green";
        return null;
      });

      await command.execute(interaction as any);

      expect(mockRegisterTeam).toHaveBeenCalledWith(
        expect.objectContaining({ color: 0x57f287 }),
        expect.anything(),
      );
    });

    it("falls back to random colour for unrecognized colour choice", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction.options.getString = vi.fn((key: string) => {
        if (key === "team-name") return "Test Team";
        if (key === "colour") return "Teal";
        return null;
      });

      await command.execute(interaction as any);

      const call = mockRegisterTeam.mock.calls[0][0];
      expect(call.color).toBeGreaterThanOrEqual(0);
      expect(call.color).toBeLessThanOrEqual(0xffffff);
    });

    it("sends DMs to captain and members who are not the requester", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-2");
      const member1 = mockMember("member-1");
      const requester = mockMember("requester-1");
      const interaction = mockInteraction({ captain, members: [member1, requester] });
      interaction.user = { id: "requester-1" };

      await command.execute(interaction as any);

      expect(captain.send).toHaveBeenCalledWith(
        expect.stringContaining("team captain"),
      );
      expect(member1.send).toHaveBeenCalledWith(
        expect.stringContaining("member of Team"),
      );
    });

    it("does not DM captain or members who are the requester", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });

      await command.execute(interaction as any);

      expect(captain.send).not.toHaveBeenCalled();
    });

    it("swallows DM failures silently", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-2");
      captain.send.mockRejectedValue(new Error("Cannot send messages to this user"));
      const requester = mockMember("requester-1");
      const interaction = mockInteraction({ captain, members: [requester] });
      interaction.user = { id: "requester-1" };

      await command.execute(interaction as any);

      expect(interaction.deleteReply).toHaveBeenCalled();
    });

    it("proceeds when lookupAlias fails", async () => {
      const { lookupAlias } = await import("../../src/integrations/firestore/aliases.js");
      vi.mocked(lookupAlias).mockResolvedValueOnce({ ok: false, error: "Firestore error" });
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });

      await command.execute(interaction as any);

      expect(mockRegisterTeam).toHaveBeenCalled();
    });

    it("proceeds when checkMembersRegistered fails", async () => {
      mockCheckMembersRegistered.mockResolvedValueOnce({ ok: false, error: "DB error" });
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });

      await command.execute(interaction as any);

      expect(mockRegisterTeam).toHaveBeenCalled();
    });

    it("formats not_self_registering validation error", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction.user = { id: "someone-else" };

      await command.execute(interaction as any);

      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.title).toBe("Registration Not Valid");
      expect(replyCall.embeds[0].data.description).toContain("include yourself");
    });

    it("formats members_already_registered validation error", async () => {
      mockCheckMembersRegistered.mockResolvedValue({
        ok: true,
        data: [{ userId: "captain-1", teamName: "Other Team" }],
      });
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });

      await command.execute(interaction as any);

      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.title).toBe("Registration Not Valid");
      expect(replyCall.embeds[0].data.description).toContain("Other Team");
    });

    it("formats duplicate_role validation error", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction.guild.roles.cache.map = vi.fn(() => ["@everyone", "Test Team"]);

      await command.execute(interaction as any);

      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.title).toBe("Registration Not Valid");
      expect(replyCall.embeds[0].data.description).toContain("role already exists");
    });

    it("formats duplicate_channel validation error", async () => {
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });
      interaction.guild.channels.cache.map = vi.fn(() => ["general", "test-team"]);

      await command.execute(interaction as any);

      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.title).toBe("Registration Not Valid");
      expect(replyCall.embeds[0].data.description).toContain("channel already exists");
    });

    it("formats alias_collision validation error", async () => {
      const { lookupAlias } = await import("../../src/integrations/firestore/aliases.js");
      vi.mocked(lookupAlias).mockResolvedValue({ ok: true, data: "Existing Team" });
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain });

      await command.execute(interaction as any);

      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.title).toBe("Registration Not Valid");
      expect(replyCall.embeds[0].data.description).toContain("already taken by");
    });

    it("formats admin_members validation error", async () => {
      mockCheckMembersRegistered.mockResolvedValue({ ok: true, data: [] });
      const command = (await import("../../src/commands/register.js"))
        .default as unknown as Command;
      const admin = mockMember("admin-1", { admin: true });
      const captain = mockMember("captain-1");
      const interaction = mockInteraction({ captain, members: [admin] });
      interaction.guild.members.cache.filter = vi.fn().mockReturnValue({
        map: vi.fn(() => ["admin-1"]),
      });

      await command.execute(interaction as any);

      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.title).toBe("Registration Not Valid");
      expect(replyCall.embeds[0].data.description).toContain("Server admins");
    });
  });
});
