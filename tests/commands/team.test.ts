import { describe, it, expect, vi, beforeEach } from "vitest";
import { PermissionFlagsBits, MessageFlags } from "discord.js";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../../src/integrations/firestore/teams.js", () => ({
  getTeam: vi.fn(),
}));

vi.mock("../../src/services/team-members.js", () => ({
  addMembers: vi.fn(),
  removeMembers: vi.fn(),
  promoteToCaptain: vi.fn(),
}));

vi.mock("../../src/utils/embeds.js", () => ({
  errorEmbed: vi.fn((title: string, desc: string) => ({
    data: { title, description: desc },
  })),
  successEmbed: vi.fn((title: string, desc: string) => ({
    data: { title, description: desc },
  })),
}));

vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../../src/utils/quiz-date.js", () => ({
  getQuizDate: vi.fn(() => "2026-01-01"),
}));

import { getTeam } from "../../src/integrations/firestore/teams.js";
import {
  addMembers,
  removeMembers,
  promoteToCaptain,
} from "../../src/services/team-members.js";
import command from "../../src/commands/team.js";

const mockGetTeam = vi.mocked(getTeam);
const mockAddMembers = vi.mocked(addMembers);
const mockRemoveMembers = vi.mocked(removeMembers);
const mockPromoteToCaptain = vi.mocked(promoteToCaptain);

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
    roles: {
      cache: {
        has: vi.fn().mockReturnValue(false),
      },
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    toString: () => `<@${id}>`,
  };
}

const TEAM_ROLE = { id: "team-role-1", name: "Team: Test Team", color: 0x3498db };
const CAPTAIN_ROLE = { id: "captain-role-1", name: "Team Captain" };

function mockInteraction(
  subcommand: string,
  opts: {
    members?: any[];
    noGuild?: boolean;
    isAdmin?: boolean;
    isCaptain?: boolean;
    hasTeamRole?: boolean;
    teamRoleInCache?: boolean;
    teamInFirestore?: boolean;
  } = {},
) {
  const {
    members = [mockMember("m1")],
    noGuild = false,
    isAdmin = true,
    isCaptain = false,
    hasTeamRole = false,
    teamRoleInCache = true,
    teamInFirestore = false,
  } = opts;

  const awaitMessageComponent = vi.fn().mockResolvedValue({ customId: "confirm" });
  const fetchReply = vi.fn().mockResolvedValue({ awaitMessageComponent });

  const memberRolesHas = vi.fn((roleId: string) => {
    if (roleId === CAPTAIN_ROLE.id) return isCaptain;
    if (roleId === TEAM_ROLE.id) return hasTeamRole;
    return false;
  });

  const roleCacheFind = vi.fn((predicate: (r: any) => boolean) => {
    const roles = [TEAM_ROLE, CAPTAIN_ROLE];
    return roles.find(predicate) ?? undefined;
  });

  const roleCacheGet = vi.fn((id: string) => {
    if (id === TEAM_ROLE.id) return TEAM_ROLE;
    return undefined;
  });

  if (!teamRoleInCache) {
    roleCacheFind.mockImplementation((predicate: (r: any) => boolean) => {
      if (predicate({ name: `Team: Test Team` })) return undefined;
      return [CAPTAIN_ROLE].find(predicate) ?? undefined;
    });

    if (teamInFirestore) {
      mockGetTeam.mockResolvedValue({
        ok: true,
        data: {
          name: "Test Team",
          captain: "",
          members: [],
          roleId: TEAM_ROLE.id,
          textChannelId: "c1",
          voiceChannelId: "v1",
          color: "",
        },
      });
      roleCacheGet.mockImplementation((id: string) => {
        if (id === TEAM_ROLE.id) return TEAM_ROLE;
        return undefined;
      });
    }
  }

  const roleMembersFilter = vi.fn().mockReturnValue({
    find: vi.fn((pred: (m: any) => boolean) => {
      const captain = {
        id: "captain-1",
        roles: { cache: { has: vi.fn().mockReturnValue(true) } },
        toString: () => "<@captain-1>",
      };
      if (pred(captain)) return captain;
      return undefined;
    }),
    map: vi.fn(() => []),
  });

  const optionValues: Record<string, any> = {
    member: members[0] ?? null,
    "member-2": members[1] ?? null,
    "member-3": members[2] ?? null,
  };

  const guild = noGuild
    ? null
    : {
        id: "guild-1",
        roles: {
          cache: {
            find: roleCacheFind,
            get: roleCacheGet,
            filter: vi.fn().mockReturnValue([]),
          },
        },
        members: {
          fetch: vi.fn().mockResolvedValue(undefined),
          cache: {
            filter: roleMembersFilter,
          },
        },
      };

  return {
    guild,
    guildId: noGuild ? null : "guild-1",
    user: { id: "user-1" },
    member: {
      roles: { cache: { has: memberRolesHas } },
    },
    memberPermissions: {
      has: vi.fn((flag: bigint) =>
        flag === PermissionFlagsBits.Administrator ? isAdmin : false,
      ),
    },
    options: {
      getSubcommand: vi.fn().mockReturnValue(subcommand),
      getString: vi.fn().mockReturnValue("Team: Test Team"),
      getMember: vi.fn((key: string) => optionValues[key] ?? null),
      getFocused: vi.fn().mockReturnValue(""),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    fetchReply,
    _awaitMessageComponent: awaitMessageComponent,
  } as any;
}

describe("/team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddMembers.mockResolvedValue({ ok: true, data: undefined });
    mockRemoveMembers.mockResolvedValue({ ok: true, data: undefined });
    mockPromoteToCaptain.mockResolvedValue({ ok: true, data: undefined });
  });

  describe("autocomplete", () => {
    it("returns team roles filtered by input for admin", async () => {
      const teamRoleA = { id: "r1", name: "Team: Alphas" };
      const teamRoleB = { id: "r2", name: "Team: Bravos" };
      const otherRole = { id: "r3", name: "Moderator" };

      const allRoles = [teamRoleA, teamRoleB, otherRole];

      const interaction = {
        options: { getFocused: vi.fn().mockReturnValue("alp") },
        guild: {
          roles: {
            cache: {
              filter: vi.fn((pred: any) => allRoles.filter(pred)),
            },
          },
        },
        member: { roles: { cache: { has: vi.fn().mockReturnValue(false) } } },
        memberPermissions: { has: vi.fn().mockReturnValue(true) },
        respond: vi.fn().mockResolvedValue(undefined),
      };

      await command.autocomplete!(interaction as any);

      expect(interaction.respond).toHaveBeenCalledWith([
        { name: "Alphas", value: "Team: Alphas" },
      ]);
    });

    it("only shows teams the captain belongs to when not admin", async () => {
      const teamRoleA = { id: "r1", name: "Team: Alphas" };
      const teamRoleB = { id: "r2", name: "Team: Bravos" };

      const allRoles = [teamRoleA, teamRoleB];

      const interaction = {
        options: { getFocused: vi.fn().mockReturnValue("") },
        guild: {
          roles: {
            cache: {
              filter: vi.fn((pred: any) => allRoles.filter(pred)),
            },
          },
        },
        member: {
          roles: {
            cache: {
              has: vi.fn((id: string) => id === "r1"),
            },
          },
        },
        memberPermissions: { has: vi.fn().mockReturnValue(false) },
        respond: vi.fn().mockResolvedValue(undefined),
      };

      await command.autocomplete!(interaction as any);

      expect(interaction.respond).toHaveBeenCalledWith([
        { name: "Alphas", value: "Team: Alphas" },
      ]);
    });
  });

  describe("execute", () => {
    it("replies with error when not in a guild", async () => {
      const interaction = mockInteraction("add-member", { noGuild: true });

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "This command can only be used in a server.",
          flags: MessageFlags.Ephemeral,
        }),
      );
    });

    it("replies with error when team not found by name or Firestore", async () => {
      mockGetTeam.mockResolvedValue({ ok: false, error: "not found" });
      const interaction = mockInteraction("add-member", { teamRoleInCache: false });

      await command.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [expect.objectContaining({ data: expect.objectContaining({ title: "Team Not Found" }) })],
        }),
      );
    });

    it("falls back to Firestore when role not in cache by name", async () => {
      const interaction = mockInteraction("add-member", {
        teamRoleInCache: false,
        teamInFirestore: true,
      });

      await command.execute(interaction);

      expect(mockGetTeam).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Done." }),
      );
    });

    it("denies permission when not admin and not team captain", async () => {
      const interaction = mockInteraction("add-member", {
        isAdmin: false,
        isCaptain: false,
        hasTeamRole: false,
      });

      await command.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({ title: "Permission Denied" }),
            }),
          ],
        }),
      );
    });

    it("allows team captain with matching team role", async () => {
      const interaction = mockInteraction("add-member", {
        isAdmin: false,
        isCaptain: true,
        hasTeamRole: true,
      });

      await command.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({ content: "Done." }),
      );
    });

    it("rejects bot members", async () => {
      const bot = mockMember("b1", { bot: true });
      const interaction = mockInteraction("add-member", { members: [bot] });

      await command.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({ title: "Invalid Members" }),
            }),
          ],
        }),
      );
    });

    it("rejects admin members", async () => {
      const admin = mockMember("a1", { admin: true });
      const interaction = mockInteraction("add-member", { members: [admin] });

      await command.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({ title: "Invalid Members" }),
            }),
          ],
        }),
      );
    });

    describe("add-member", () => {
      it("calls addMembers on confirm", async () => {
        const member = mockMember("m1");
        const interaction = mockInteraction("add-member", { members: [member] });

        await command.execute(interaction);

        expect(mockAddMembers).toHaveBeenCalledWith(
          expect.objectContaining({ teamName: "Test Team" }),
          [member],
        );
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({ content: "Done." }),
        );
      });

      it("shows error when addMembers fails", async () => {
        mockAddMembers.mockResolvedValue({ ok: false, error: "DB write failed" });
        const interaction = mockInteraction("add-member");

        await command.execute(interaction);

        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: [
              expect.objectContaining({
                data: expect.objectContaining({ title: "Update Failed" }),
              }),
            ],
          }),
        );
      });
    });

    describe("remove-member", () => {
      it("calls removeMembers on confirm", async () => {
        const member = mockMember("m1");
        const interaction = mockInteraction("remove-member", { members: [member] });

        await command.execute(interaction);

        expect(mockRemoveMembers).toHaveBeenCalledWith(
          expect.objectContaining({ teamName: "Test Team" }),
          [member],
        );
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({ content: "Done." }),
        );
      });
    });

    describe("promote-to-captain", () => {
      it("calls promoteToCaptain on confirm", async () => {
        const member = mockMember("m1");
        const interaction = mockInteraction("promote-to-captain", { members: [member] });

        await command.execute(interaction);

        expect(mockPromoteToCaptain).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({ content: "Done." }),
        );
      });

      it("shows error when current captain not found", async () => {
        const member = mockMember("m1");
        const interaction = mockInteraction("promote-to-captain", { members: [member] });

        const roleMembersFilter = interaction.guild.members.cache.filter;
        roleMembersFilter.mockReturnValue({
          find: vi.fn().mockReturnValue(undefined),
          map: vi.fn(() => []),
        });

        await command.execute(interaction);

        expect(mockPromoteToCaptain).not.toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: [
              expect.objectContaining({
                data: expect.objectContaining({
                  description: "Could not find current team captain",
                }),
              }),
            ],
          }),
        );
      });
    });

    it("cancels when user clicks cancel", async () => {
      const interaction = mockInteraction("add-member");
      interaction._awaitMessageComponent.mockResolvedValue({ customId: "cancel" });

      await command.execute(interaction);

      expect(mockAddMembers).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "Action cancelled.",
          embeds: [],
          components: [],
        }),
      );
    });

    it("handles timeout", async () => {
      const interaction = mockInteraction("add-member");
      interaction._awaitMessageComponent.mockRejectedValue(
        new Error("Collector received no interactions before ending with reason: time"),
      );

      await command.execute(interaction);

      expect(mockAddMembers).not.toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("Timed out"),
          embeds: [],
          components: [],
        }),
      );
    });

    it("handles unexpected errors", async () => {
      const interaction = mockInteraction("add-member");
      interaction._awaitMessageComponent.mockRejectedValue(new Error("something broke"));

      await command.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            expect.objectContaining({
              data: expect.objectContaining({ title: "Error" }),
            }),
          ],
          components: [],
        }),
      );
    });
  });
});
