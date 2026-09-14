import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../services/migrate/migrate-guild.js", () => ({
  migrateGuild: vi.fn(),
}));

import { migrateGuild } from "../services/migrate/migrate-guild.js";
import command from "./migrate.js";

const mockMigrateGuild = vi.mocked(migrateGuild);

function mockInteraction(quizDate: string) {
  return {
    guild: { id: "guild-1" },
    options: {
      getString: vi.fn((name: string) => {
        if (name === "quiz_date") return quizDate;
        return null;
      }),
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
      data: { teamsMigrated: 0, roundsMigrated: 0, aliasesMigrated: false, membersMigrated: false, quizStatus: "active" },
    });
    const interaction = mockInteraction("2026-09-01");

    await command.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
  });

  it("calls migrateGuild with the provided date", async () => {
    mockMigrateGuild.mockResolvedValue({
      ok: true,
      data: { teamsMigrated: 2, roundsMigrated: 3, aliasesMigrated: true, membersMigrated: true, quizStatus: "ended" },
    });
    const interaction = mockInteraction("2026-09-01");

    await command.execute(interaction);

    expect(mockMigrateGuild).toHaveBeenCalledWith("mock-db", "guild-1", "2026-09-01");
  });

  it("shows migration summary on success", async () => {
    mockMigrateGuild.mockResolvedValue({
      ok: true,
      data: { teamsMigrated: 2, roundsMigrated: 3, aliasesMigrated: true, membersMigrated: true, quizStatus: "ended" },
    });
    const interaction = mockInteraction("2026-09-01");

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    expect(embed.data.title).toContain("Migration");
    expect(embed.data.description).toContain("2");
    expect(embed.data.description).toContain("3");
  });

  it("shows error when migration fails", async () => {
    mockMigrateGuild.mockResolvedValue({
      ok: false,
      error: "V3 quiz not found at Servers/guild-1/Quizzes/2026-09-01",
    });
    const interaction = mockInteraction("2026-09-01");

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    expect(embed.data.title).toContain("Error");
  });
});
