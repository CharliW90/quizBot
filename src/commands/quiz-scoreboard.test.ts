import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../services/generate-scoreboard.js", () => ({
  generateScoreboard: vi.fn(),
}));

import { generateScoreboard } from "../services/generate-scoreboard.js";
import command from "./quiz-scoreboard.js";

const mockGenerateScoreboard = vi.mocked(generateScoreboard);

function mockInteraction() {
  return {
    guild: { id: "guild-1" },
    guildId: "guild-1",
    channel: { send: vi.fn() },
    deferReply: vi.fn(),
    editReply: vi.fn(),
    deleteReply: vi.fn(),
    reply: vi.fn(),
  } as any;
}

describe("/quiz scoreboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates scoreboard and posts leaderboard to channel", async () => {
    mockGenerateScoreboard.mockResolvedValue({
      ok: true,
      data: {
        "The Foxes": { rounds: [8, 5], total: 13 },
        "Quiz Masters": { rounds: [6, 9], total: 15 },
        "Underdogs": { rounds: [6, 9], total: 15 },
      },
    });

    const interaction = mockInteraction();
    await command.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(interaction.channel.send).toHaveBeenCalled();
    const sentEmbed = interaction.channel.send.mock.calls[0][0].embeds[0].data;
    expect(sentEmbed.title).toContain("Scoreboard");
    expect(sentEmbed.fields.length).toBeGreaterThan(0);
    expect(interaction.deleteReply).toHaveBeenCalled();
  });

  it("shows teams with same score as joint position", async () => {
    mockGenerateScoreboard.mockResolvedValue({
      ok: true,
      data: {
        "The Foxes": { rounds: [10], total: 10 },
        "Quiz Masters": { rounds: [10], total: 10 },
        "Underdogs": { rounds: [5], total: 5 },
      },
    });

    const interaction = mockInteraction();
    await command.execute(interaction);

    const sentEmbed = interaction.channel.send.mock.calls[0][0].embeds[0].data;
    const firstField = sentEmbed.fields[0].name;
    expect(firstField).toContain("joint");
    expect(firstField).toContain("1st");
  });

  it("replies with error when generation fails", async () => {
    mockGenerateScoreboard.mockResolvedValue({
      ok: false,
      error: "No rounds fetched yet - use /quiz-fetch first",
    });

    const interaction = mockInteraction();
    await command.execute(interaction);

    const editCall = interaction.editReply.mock.calls[0][0];
    expect(editCall.embeds[0].data.title).toContain("Error");
    expect(interaction.channel.send).not.toHaveBeenCalled();
  });
});
