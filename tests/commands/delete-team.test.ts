import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageFlags } from "discord.js";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../../src/integrations/firestore/teams.js", () => ({
  getTeam: vi.fn(),
}));

vi.mock("../../src/services/delete-team.js", () => ({
  deleteTeamByRole: vi.fn(),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../../src/utils/embeds.js", () => ({
  errorEmbed: vi.fn((title: string, desc: string) => ({
    data: { title, description: desc },
  })),
  successEmbed: vi.fn((title: string, desc: string) => ({
    data: { title, description: desc },
  })),
}));

vi.mock("../../src/utils/quiz-date.js", () => ({
  getQuizDate: vi.fn(() => "2026-01-01"),
}));

import { getTeam } from "../../src/integrations/firestore/teams.js";
import { deleteTeamByRole } from "../../src/services/delete-team.js";
import command from "../../src/commands/delete-team.js";

const mockGetTeam = vi.mocked(getTeam);
const mockDeleteTeamByRole = vi.mocked(deleteTeamByRole);

const TEAM_DATA = {
  name: "The Foxes",
  captain: "captain-1",
  members: ["captain-1", "member-1"],
  roleId: "role-1",
  textChannelId: "text-1",
  voiceChannelId: "voice-1",
  color: "#ff0000",
};

const TEAM_ROLE = { id: "role-1", name: "Team: The Foxes" };

function mockInteraction() {
  const confirmation = { awaitMessageComponent: vi.fn() };

  const guild = {
    id: "guild-1",
    roles: {
      cache: {
        find: vi.fn().mockReturnValue(TEAM_ROLE),
        get: vi.fn().mockReturnValue(TEAM_ROLE),
        filter: vi.fn().mockReturnValue({
          filter: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue([TEAM_ROLE]),
          }),
        }),
      },
    },
  };

  return {
    guild,
    guildId: "guild-1",
    user: { id: "user-1" },
    options: {
      getString: vi.fn().mockReturnValue("Team: The Foxes"),
      getFocused: vi.fn().mockReturnValue(""),
    },
    reply: vi.fn().mockResolvedValue(confirmation),
    editReply: vi.fn().mockResolvedValue(undefined),
    deleteReply: vi.fn().mockResolvedValue(undefined),
    channel: { send: vi.fn().mockResolvedValue(undefined) },
    _confirmation: confirmation,
  } as any;
}

describe("/delete-team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTeam.mockResolvedValue({ ok: true, data: TEAM_DATA });
  });

  describe("autocomplete", () => {
    it("responds with team names filtered by input", async () => {
      const role1 = { name: "Team: The Foxes" };
      const role2 = { name: "Team: Quiz Masters" };
      const allTeamRoles = [role1, role2];

      const interaction = {
        options: { getFocused: vi.fn().mockReturnValue("fox") },
        guild: {
          roles: {
            cache: {
              filter: vi.fn((fn: (r: any) => boolean) => {
                const filtered = allTeamRoles.filter(fn);
                return {
                  filter: vi.fn((fn2: (r: any) => boolean) => {
                    const result = filtered.filter(fn2);
                    return { values: vi.fn().mockReturnValue(result) };
                  }),
                };
              }),
            },
          },
        },
        respond: vi.fn().mockResolvedValue(undefined),
      };

      await command.autocomplete!(interaction as any);

      expect(interaction.respond).toHaveBeenCalledWith([
        { name: "The Foxes", value: "Team: The Foxes" },
      ]);
    });
  });

  describe("execute", () => {
    it("replies ephemeral when used outside a guild", async () => {
      const interaction = mockInteraction();
      interaction.guild = null;

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ flags: MessageFlags.Ephemeral }),
      );
    });

    it("replies with error when team role cannot be found", async () => {
      const interaction = mockInteraction();
      interaction.guild.roles.cache.find = vi.fn().mockReturnValue(undefined);
      mockGetTeam.mockResolvedValue({ ok: false, error: "not found" });

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          flags: MessageFlags.Ephemeral,
          embeds: [expect.objectContaining({ data: expect.objectContaining({ title: "Not Found" }) })],
        }),
      );
    });

    it("falls back to Firestore + cache.get when role name lookup fails", async () => {
      const interaction = mockInteraction();
      interaction.guild.roles.cache.find = vi.fn().mockReturnValue(undefined);
      interaction.guild.roles.cache.get = vi.fn().mockReturnValue(TEAM_ROLE);
      mockGetTeam.mockResolvedValue({ ok: true, data: TEAM_DATA });
      mockDeleteTeamByRole.mockResolvedValue({
        ok: true,
        data: { deletedRole: "Team: The Foxes", deletedChannels: ["foxes-text"], removedMemberCount: 2 },
      });

      interaction._confirmation.awaitMessageComponent.mockResolvedValue({ customId: "delete" });

      await command.execute(interaction);

      expect(interaction.guild.roles.cache.get).toHaveBeenCalledWith("role-1");
      expect(mockDeleteTeamByRole).toHaveBeenCalled();
    });

    it("replies with error when team not in database", async () => {
      const interaction = mockInteraction();
      mockGetTeam.mockResolvedValue({ ok: false, error: "not found" });
      interaction.guild.roles.cache.find = vi.fn().mockReturnValue(TEAM_ROLE);

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({ title: "Not Found" }),
            }),
          ],
        }),
      );
    });

    it("cancels without deleting", async () => {
      const interaction = mockInteraction();
      interaction._confirmation.awaitMessageComponent.mockResolvedValue({ customId: "cancel" });

      await command.execute(interaction);

      expect(mockDeleteTeamByRole).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Cancelled.", components: [] }),
      );
    });

    it("handles timeout", async () => {
      const interaction = mockInteraction();
      interaction._confirmation.awaitMessageComponent.mockRejectedValue(
        new Error("Collector received no interactions before ending with reason: time"),
      );

      await command.execute(interaction);

      expect(mockDeleteTeamByRole).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Timed out.", components: [] }),
      );
    });

    it("deletes team on confirm and posts summary to channel", async () => {
      const interaction = mockInteraction();
      interaction._confirmation.awaitMessageComponent.mockResolvedValue({ customId: "delete" });
      mockDeleteTeamByRole.mockResolvedValue({
        ok: true,
        data: {
          deletedRole: "Team: The Foxes",
          deletedChannels: ["foxes-text", "foxes-voice"],
          removedMemberCount: 2,
        },
      });

      await command.execute(interaction);

      expect(mockDeleteTeamByRole).toHaveBeenCalled();
      expect(interaction.channel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({ title: "Deleted Team: The Foxes" }),
            }),
          ],
        }),
      );
      expect(interaction.deleteReply).toHaveBeenCalled();
    });

    it("shows error when deleteTeamByRole fails", async () => {
      const interaction = mockInteraction();
      interaction._confirmation.awaitMessageComponent.mockResolvedValue({ customId: "delete" });
      mockDeleteTeamByRole.mockResolvedValue({ ok: false, error: "Something exploded" });

      await command.execute(interaction);

      const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
      expect(lastEdit.embeds[0].data.title).toBe("Deletion Failed");
    });

    it("handles unexpected errors in the catch block", async () => {
      const interaction = mockInteraction();
      interaction._confirmation.awaitMessageComponent.mockRejectedValue(
        new Error("Network failure"),
      );

      await command.execute(interaction);

      const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
      expect(lastEdit.embeds[0].data.title).toBe("Error");
    });
  });
});
