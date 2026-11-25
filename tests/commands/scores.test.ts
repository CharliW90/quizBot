import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageFlags } from "discord.js";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../../src/services/generate-scoreboard.js", () => ({
  generateScoreboard: vi.fn(),
}));

vi.mock("../../src/integrations/firestore/quiz.js", () => ({
  listQuizzes: vi.fn(),
}));

import { generateScoreboard } from "../../src/services/generate-scoreboard.js";
import { listQuizzes } from "../../src/integrations/firestore/quiz.js";
import command from "../../src/commands/scores.js";

const mockGenerateScoreboard = vi.mocked(generateScoreboard);
const mockListQuizzes = vi.mocked(listQuizzes);

function mockInteraction() {
  return {
    guild: { id: "guild-1" },
    guildId: "guild-1",
    options: { getString: vi.fn(() => null) },
    channel: { send: vi.fn() },
    deferReply: vi.fn(),
    editReply: vi.fn(),
    deleteReply: vi.fn(),
    reply: vi.fn(),
  } as any;
}

function scoreboardResult(scoreboard: Record<string, { rounds: number[]; total: number }>, roundNumbers: number[]) {
  return {
    ok: true as const,
    data: { scoreboard, roundNumbers, savedToFirestore: true },
  };
}

describe("/scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates scoreboard and posts leaderboard to channel", async () => {
    mockGenerateScoreboard.mockResolvedValue(scoreboardResult(
      {
        "The Foxes": { rounds: [8, 5], total: 13 },
        "Quiz Masters": { rounds: [6, 9], total: 15 },
        Underdogs: { rounds: [6, 9], total: 15 },
      },
      [1, 2],
    ));

    const interaction = mockInteraction();
    await command.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
    expect(interaction.channel.send).toHaveBeenCalled();
    const sentEmbed = interaction.channel.send.mock.calls[0][0].embeds[0].data;
    expect(sentEmbed.title).toContain("Scoreboard");
    expect(sentEmbed.fields.length).toBeGreaterThan(0);
    expect(interaction.deleteReply).toHaveBeenCalled();
  });

  it("shows teams with same score as joint position", async () => {
    mockGenerateScoreboard.mockResolvedValue(scoreboardResult(
      {
        "The Foxes": { rounds: [10], total: 10 },
        "Quiz Masters": { rounds: [10], total: 10 },
        Underdogs: { rounds: [5], total: 5 },
      },
      [1],
    ));

    const interaction = mockInteraction();
    await command.execute(interaction);

    const sentEmbed = interaction.channel.send.mock.calls[0][0].embeds[0].data;
    const firstField = sentEmbed.fields[0].name;
    expect(firstField).toContain("joint");
    expect(firstField).toContain("1st");
  });

  it("shows round labels in score breakdown", async () => {
    mockGenerateScoreboard.mockResolvedValue(scoreboardResult(
      { "The Foxes": { rounds: [8, 5], total: 13 } },
      [1, 2],
    ));

    const interaction = mockInteraction();
    await command.execute(interaction);

    const sentEmbed = interaction.channel.send.mock.calls[0][0].embeds[0].data;
    const value = sentEmbed.fields[0].value;
    expect(value).toContain("R1: 8");
    expect(value).toContain("R2: 5");
  });

  it("shows historic footer when not saved to Firestore", async () => {
    mockGenerateScoreboard.mockResolvedValue({
      ok: true,
      data: {
        scoreboard: { "The Foxes": { rounds: [10], total: 10 } },
        roundNumbers: [1],
        savedToFirestore: false,
      },
    });

    const interaction = mockInteraction();
    await command.execute(interaction);

    const sentEmbed = interaction.channel.send.mock.calls[0][0].embeds[0].data;
    expect(sentEmbed.footer.text).toContain("Historic");
  });

  it("replies with error when generation fails", async () => {
    mockGenerateScoreboard.mockResolvedValue({
      ok: false,
      error: "No rounds fetched yet - use /fetch-responses first",
    });

    const interaction = mockInteraction();
    await command.execute(interaction);

    const editCall = interaction.editReply.mock.calls[0][0];
    expect(editCall.embeds[0].data.title).toContain("Error");
    expect(interaction.channel.send).not.toHaveBeenCalled();
  });

  it("replies with server-only message when guild is null", async () => {
    const interaction = mockInteraction();
    interaction.guild = null;

    await command.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "This command can only be used in a server." }),
    );
    expect(mockGenerateScoreboard).not.toHaveBeenCalled();
  });

  it("skips channel.send when channel lacks send method", async () => {
    mockGenerateScoreboard.mockResolvedValue(scoreboardResult(
      { "The Foxes": { rounds: [10], total: 10 } },
      [1],
    ));

    const interaction = mockInteraction();
    interaction.channel = {};

    await command.execute(interaction);

    expect(interaction.deleteReply).toHaveBeenCalled();
  });

  describe("autocomplete", () => {
    it("lists all quizzes with status labels", async () => {
      mockListQuizzes.mockResolvedValue({
        ok: true,
        data: [
          { date: "2026-06-01", status: "active", createdAt: "2026-06-01T00:00:00Z" },
          { date: "2026-05-01", status: "ended", createdAt: "2026-05-01T00:00:00Z" },
        ],
      });

      const interaction = {
        guildId: "guild-1",
        options: { getFocused: vi.fn(() => "") },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      const choices = interaction.respond.mock.calls[0][0];
      expect(choices).toHaveLength(2);
      expect(choices[1].name).toContain("ended");
    });

    it("responds with empty list when listQuizzes fails", async () => {
      mockListQuizzes.mockResolvedValue({ ok: false, error: "Firestore error" });

      const interaction = {
        guildId: "guild-1",
        options: { getFocused: vi.fn(() => "") },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      expect(interaction.respond).toHaveBeenCalledWith([]);
    });

    it("filters by typed text", async () => {
      mockListQuizzes.mockResolvedValue({
        ok: true,
        data: [
          { date: "2026-06-01", status: "active", createdAt: "2026-06-01T00:00:00Z" },
          { date: "2026-07-01", status: "active", createdAt: "2026-07-01T00:00:00Z" },
        ],
      });

      const interaction = {
        guildId: "guild-1",
        options: { getFocused: vi.fn(() => "07") },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      const choices = interaction.respond.mock.calls[0][0];
      expect(choices).toHaveLength(1);
      expect(choices[0].value).toBe("2026-07-01");
    });
  });
});
