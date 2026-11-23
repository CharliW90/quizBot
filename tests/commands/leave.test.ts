import { describe, it, expect, vi, beforeEach } from "vitest";
import { Collection, PermissionFlagsBits } from "discord.js";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../../src/services/team-members.js", () => ({
  removeMembers: vi.fn(),
}));

vi.mock("../../src/utils/embeds.js", () => ({
  errorEmbed: vi.fn((title: string, desc: string) => ({
    data: { title, description: desc },
  })),
}));

vi.mock("../../src/utils/quiz-date.js", () => ({
  getQuizDate: vi.fn(() => "2026-01-01"),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { removeMembers } from "../../src/services/team-members.js";
import command from "../../src/commands/leave.js";

const mockRemoveMembers = vi.mocked(removeMembers);

function mockTeamRole() {
  return { id: "team-role-1", name: "Team: The Foxes", color: 0x3498db };
}

function mockCaptainRole() {
  return { id: "captain-role-1", name: "Team Captain" };
}

function mockGuildMember(
  id: string,
  opts: { admin?: boolean; teamRole?: boolean; captainRole?: boolean } = {},
) {
  const roles = new Collection<string, any>();
  if (opts.teamRole !== false) {
    roles.set("team-role-1", mockTeamRole());
  }
  if (opts.captainRole) {
    roles.set("captain-role-1", mockCaptainRole());
  }

  return {
    id,
    user: { id, username: `user-${id}` },
    displayName: `User ${id}`,
    permissions: {
      has: vi.fn((flag: bigint) =>
        flag === PermissionFlagsBits.Administrator ? (opts.admin ?? false) : false,
      ),
    },
    roles: {
      cache: {
        find: vi.fn((fn: (r: any) => boolean) => {
          for (const r of roles.values()) {
            if (fn(r)) return r;
          }
          return undefined;
        }),
        has: vi.fn((roleId: string) => roles.has(roleId)),
      },
      remove: vi.fn().mockResolvedValue(undefined),
    },
  };
}

function mockInteraction(opts: {
  noGuild?: boolean;
  admin?: boolean;
  noTeamRole?: boolean;
  isCaptain?: boolean;
  singleMember?: boolean;
} = {}) {
  const member = mockGuildMember("user-1", {
    admin: opts.admin,
    teamRole: !opts.noTeamRole,
    captainRole: opts.isCaptain,
  });

  const captain = mockGuildMember("captain-1", { teamRole: true, captainRole: true });
  const otherMember = mockGuildMember("other-1", { teamRole: true });

  const roleMembers = new Collection<string, any>();
  roleMembers.set("user-1", member);
  if (!opts.singleMember) {
    roleMembers.set("captain-1", captain);
    roleMembers.set("other-1", otherMember);
  }

  const teamChannel = {
    id: "team-channel-1",
    name: "the-foxes",
    send: vi.fn().mockResolvedValue(undefined),
  };

  const guildRolesCache = {
    find: vi.fn((fn: (r: any) => boolean) => {
      const roles = [mockCaptainRole()];
      return roles.find(fn);
    }),
  };

  const guildChannelsCache = {
    find: vi.fn((fn: (ch: any) => boolean) => {
      const channels = [teamChannel];
      return channels.find(fn);
    }),
  };

  const awaitMessageComponent = vi.fn();
  const fetchReply = vi.fn().mockResolvedValue({ awaitMessageComponent });

  const guild = opts.noGuild
    ? null
    : {
        id: "guild-1",
        members: {
          fetch: vi.fn().mockResolvedValue(undefined),
          cache: {
            filter: vi.fn(() => roleMembers),
          },
        },
        roles: { cache: guildRolesCache },
        channels: { cache: guildChannelsCache },
      };

  return {
    guild,
    guildId: guild ? "guild-1" : null,
    member,
    user: { id: "user-1" },
    channelId: "other-channel",
    deferReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    fetchReply,
    _awaitMessageComponent: awaitMessageComponent,
    _teamChannel: teamChannel,
  } as any;
}

describe("/leave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("replies with error when not in a guild", async () => {
    const interaction = mockInteraction({ noGuild: true });

    await command.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "This command can only be used in a server." }),
    );
    expect(interaction.deferReply).not.toHaveBeenCalled();
  });

  it("tells admins to use /delete-team", async () => {
    const interaction = mockInteraction({ admin: true });

    await command.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalled();
    const editCall = interaction.editReply.mock.calls[0][0];
    expect(editCall.embeds[0].data.title).toBe("Wrong Command");
  });

  it("shows error when user has no team role", async () => {
    const interaction = mockInteraction({ noTeamRole: true });

    await command.execute(interaction);

    const editCall = interaction.editReply.mock.calls[0][0];
    expect(editCall.embeds[0].data.title).toBe("Not In a Team");
  });

  it("shows error when user is the only team member", async () => {
    const interaction = mockInteraction({ singleMember: true });

    await command.execute(interaction);

    const editCall = interaction.editReply.mock.calls[0][0];
    expect(editCall.embeds[0].data.title).toBe("Would Leave Empty Team");
  });

  it("shows error when user is the captain", async () => {
    const interaction = mockInteraction({ isCaptain: true });

    await command.execute(interaction);

    const editCall = interaction.editReply.mock.calls[0][0];
    expect(editCall.embeds[0].data.title).toBe("Cannot Leave as Captain");
  });

  it("shows confirmation embed and leaves on confirm", async () => {
    mockRemoveMembers.mockResolvedValue({ ok: true, data: undefined });
    const interaction = mockInteraction();
    interaction._awaitMessageComponent.mockResolvedValue({ customId: "confirm" });

    await command.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Are you sure you want to leave your team?" }),
    );
    expect(mockRemoveMembers).toHaveBeenCalled();
    const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
    expect(lastEdit.content).toContain("You have left");
  });

  it("notifies the team channel after leaving", async () => {
    mockRemoveMembers.mockResolvedValue({ ok: true, data: undefined });
    const interaction = mockInteraction();
    interaction._awaitMessageComponent.mockResolvedValue({ customId: "confirm" });

    await command.execute(interaction);

    expect(interaction._teamChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining("has left the team") }),
    );
  });

  it("does not notify team channel when already in team channel", async () => {
    mockRemoveMembers.mockResolvedValue({ ok: true, data: undefined });
    const interaction = mockInteraction();
    interaction.channelId = "team-channel-1";
    interaction._awaitMessageComponent.mockResolvedValue({ customId: "confirm" });

    await command.execute(interaction);

    expect(interaction._teamChannel.send).not.toHaveBeenCalled();
  });

  it("shows error when removeMembers fails", async () => {
    mockRemoveMembers.mockResolvedValue({ ok: false, error: "Firestore error" });
    const interaction = mockInteraction();
    interaction._awaitMessageComponent.mockResolvedValue({ customId: "confirm" });

    await command.execute(interaction);

    const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
    expect(lastEdit.embeds[0].data.title).toBe("Failed");
  });

  it("cancels without leaving", async () => {
    const interaction = mockInteraction();
    interaction._awaitMessageComponent.mockResolvedValue({ customId: "cancel" });

    await command.execute(interaction);

    expect(mockRemoveMembers).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Cancelled.", embeds: [], components: [] }),
    );
  });

  it("handles timeout", async () => {
    const interaction = mockInteraction();
    interaction._awaitMessageComponent.mockRejectedValue(
      new Error("Collector received no interactions before ending with reason: time"),
    );

    await command.execute(interaction);

    expect(mockRemoveMembers).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Timed out.", embeds: [], components: [] }),
    );
  });

  it("logs and shows error on unexpected exceptions", async () => {
    const interaction = mockInteraction();
    interaction._awaitMessageComponent.mockRejectedValue(new Error("Something broke"));

    await command.execute(interaction);

    const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
    expect(lastEdit.embeds[0].data.title).toBe("Error");
  });
});
