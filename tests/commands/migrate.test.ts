import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageFlags } from "discord.js";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../../src/services/migrate/migrate-guild.js", () => ({
  migrateGuild: vi.fn(),
}));

import { migrateGuild } from "../../src/services/migrate/migrate-guild.js";
import command from "../../src/commands/migrate.js";

const mockMigrateGuild = vi.mocked(migrateGuild);

function mockInteraction(dryRun = false) {
  return {
    guild: { id: "guild-1" },
    options: {
      getBoolean: vi.fn(() => dryRun),
    },
    deferReply: vi.fn(),
    editReply: vi.fn(),
  } as any;
}

describe("/migrate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has correct metadata", () => {
    expect(command.data.name).toBe("migrate");
  });

  it("defers reply as ephemeral", async () => {
    mockMigrateGuild.mockResolvedValue({
      ok: true,
      data: {
        quizzesMigrated: 0,
        totalTeams: 0,
        totalRounds: 0,
        usersMigrated: 0,
      },
    });
    const interaction = mockInteraction();

    await command.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
  });

  it("calls migrateGuild with db, guildId, and dryRun false by default", async () => {
    mockMigrateGuild.mockResolvedValue({
      ok: true,
      data: {
        quizzesMigrated: 2,
        totalTeams: 4,
        totalRounds: 6,
        usersMigrated: 10,
      },
    });
    const interaction = mockInteraction();

    await command.execute(interaction);

    expect(mockMigrateGuild).toHaveBeenCalledWith("mock-db", "guild-1", false);
  });

  it("passes dryRun true when option is set", async () => {
    mockMigrateGuild.mockResolvedValue({
      ok: true,
      data: {
        quizzesMigrated: 1,
        totalTeams: 2,
        totalRounds: 1,
        usersMigrated: 5,
        quizDetails: [
          { date: "2026-09-01", status: "ok" as const, warnings: [], teamCount: 2, roundCount: 1, wouldOverwrite: false },
        ],
      },
    });
    const interaction = mockInteraction(true);

    await command.execute(interaction);

    expect(mockMigrateGuild).toHaveBeenCalledWith("mock-db", "guild-1", true);
  });

  it("shows dry-run embed with status icons", async () => {
    mockMigrateGuild.mockResolvedValue({
      ok: true,
      data: {
        quizzesMigrated: 1,
        totalTeams: 3,
        totalRounds: 2,
        usersMigrated: 5,
        quizDetails: [
          { date: "2026-09-01", status: "ok" as const, warnings: [], teamCount: 3, roundCount: 2, wouldOverwrite: false },
          { date: "2026-09-08", status: "warning" as const, warnings: ['team "foo": roleId missing'], teamCount: 1, roundCount: 1, wouldOverwrite: false },
          { date: "2026-10-01", status: "skip" as const, warnings: ["empty - no teams or rounds"], teamCount: 0, roundCount: 0, wouldOverwrite: false },
        ],
      },
    });
    const interaction = mockInteraction(true);

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    const desc = embed.data.description;
    expect(desc).toContain("✅");
    expect(desc).toContain("⚠️");
    expect(desc).toContain("❌");
    expect(desc).toContain("2026-09-01");
    expect(desc).toContain("roleId missing");
    expect(desc).toContain("would skip");
    expect(embed.data.title).toContain("Dry Run");
  });

  it("shows migration summary on success", async () => {
    mockMigrateGuild.mockResolvedValue({
      ok: true,
      data: {
        quizzesMigrated: 3,
        totalTeams: 5,
        totalRounds: 9,
        usersMigrated: 12,
      },
    });
    const interaction = mockInteraction();

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    expect(embed.data.title).toContain("Migration");
    expect(embed.data.description).toContain("3");
    expect(embed.data.description).toContain("5");
    expect(embed.data.description).toContain("9");
    expect(embed.data.description).toContain("12");
  });

  it("shows error when migration fails", async () => {
    mockMigrateGuild.mockResolvedValue({
      ok: false,
      error: "No V3 quiz data found for guild guild-1",
    });
    const interaction = mockInteraction();

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    expect(embed.data.title).toContain("Error");
  });
});
