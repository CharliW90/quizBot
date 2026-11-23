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

function mockInteraction() {
  return {
    guild: { id: "guild-1" },
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

  it("calls migrateGuild with db and guildId only", async () => {
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

    expect(mockMigrateGuild).toHaveBeenCalledWith("mock-db", "guild-1");
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
