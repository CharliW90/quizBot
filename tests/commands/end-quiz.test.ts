import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../../src/integrations/firestore/quiz.js", () => ({
  endQuiz: vi.fn(),
  listQuizzes: vi.fn(),
}));

vi.mock("../../src/integrations/firestore/scoreboard.js", () => ({
  getScoreboard: vi.fn(),
}));

import { endQuiz, listQuizzes } from "../../src/integrations/firestore/quiz.js";
import { getScoreboard } from "../../src/integrations/firestore/scoreboard.js";
import command from "../../src/commands/end-quiz.js";

const mockEndQuiz = vi.mocked(endQuiz);
const mockGetScoreboard = vi.mocked(getScoreboard);
const mockListQuizzes = vi.mocked(listQuizzes);

function mockInteraction(customId: string, date: string | null = null) {
  const reply = {
    awaitMessageComponent: vi.fn(),
  };

  return {
    guild: { id: "guild-1" },
    guildId: "guild-1",
    user: { id: "user-1" },
    options: { getString: vi.fn(() => date) },
    reply: vi.fn(async () => reply),
    editReply: vi.fn(),
    _reply: reply,
    _customId: customId,
  } as any;
}

describe("/end-quiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetScoreboard.mockResolvedValue({ ok: true, data: { "Team A": { rounds: [5], total: 5 } } });
  });

  it("ends quiz after confirmation", async () => {
    mockEndQuiz.mockResolvedValue({ ok: true, data: undefined });

    const interaction = mockInteraction("confirm");
    interaction._reply.awaitMessageComponent.mockResolvedValue({
      customId: "confirm",
    });

    await command.execute(interaction);

    expect(interaction.reply).toHaveBeenCalled();
    expect(mockEndQuiz).toHaveBeenCalledWith("mock-db", "guild-1", expect.any(String));
    const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
    expect(lastEdit.embeds[0].data.description).toContain("ended");
  });

  it("uses provided date instead of today", async () => {
    mockEndQuiz.mockResolvedValue({ ok: true, data: undefined });

    const interaction = mockInteraction("confirm", "2026-05-01");
    interaction._reply.awaitMessageComponent.mockResolvedValue({
      customId: "confirm",
    });

    await command.execute(interaction);

    expect(mockEndQuiz).toHaveBeenCalledWith("mock-db", "guild-1", "2026-05-01");
  });

  it("warns when no scoreboard exists", async () => {
    mockGetScoreboard.mockResolvedValue({ ok: true, data: null });
    mockEndQuiz.mockResolvedValue({ ok: true, data: undefined });

    const interaction = mockInteraction("confirm");
    interaction._reply.awaitMessageComponent.mockResolvedValue({
      customId: "confirm",
    });

    await command.execute(interaction);

    const replyContent = interaction.reply.mock.calls[0][0].content;
    expect(replyContent).toContain("no scoreboard");
    expect(mockEndQuiz).toHaveBeenCalled();
  });

  it("cancels without ending", async () => {
    const interaction = mockInteraction("cancel");
    interaction._reply.awaitMessageComponent.mockResolvedValue({
      customId: "cancel",
    });

    await command.execute(interaction);

    expect(mockEndQuiz).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Cancelled.", components: [] }),
    );
  });

  it("handles timeout", async () => {
    const interaction = mockInteraction("timeout");
    interaction._reply.awaitMessageComponent.mockRejectedValue(
      new Error("Collector received no interactions before ending with reason: time"),
    );

    await command.execute(interaction);

    expect(mockEndQuiz).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Timed out.", components: [] }),
    );
  });

  it("reports error from endQuiz", async () => {
    mockEndQuiz.mockResolvedValue({ ok: false, error: "Quiz for 2026-06-06 is already ended" });

    const interaction = mockInteraction("confirm");
    interaction._reply.awaitMessageComponent.mockResolvedValue({
      customId: "confirm",
    });

    await command.execute(interaction);

    const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
    expect(lastEdit.embeds[0].data.title).toContain("Error");
  });

  it("cancels from no-scoreboard warning without ending", async () => {
    mockGetScoreboard.mockResolvedValue({ ok: true, data: null });

    const interaction = mockInteraction("cancel");
    interaction._reply.awaitMessageComponent.mockResolvedValue({
      customId: "cancel",
    });

    await command.execute(interaction);

    expect(mockEndQuiz).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Cancelled.", components: [] }),
    );
  });

  it("handles timeout on no-scoreboard warning", async () => {
    mockGetScoreboard.mockResolvedValue({ ok: true, data: null });

    const interaction = mockInteraction("timeout");
    interaction._reply.awaitMessageComponent.mockRejectedValue(
      new Error("Collector received no interactions before ending with reason: time"),
    );

    await command.execute(interaction);

    expect(mockEndQuiz).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Timed out.", components: [] }),
    );
  });

  it("replies with server-only message when guild is null", async () => {
    const interaction = mockInteraction("confirm");
    interaction.guild = null;

    await command.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "This command can only be used in a server." }),
    );
    expect(mockEndQuiz).not.toHaveBeenCalled();
  });

  describe("autocomplete", () => {
    it("lists active quizzes", async () => {
      mockListQuizzes.mockResolvedValue({
        ok: true,
        data: [
          { date: "2026-06-01", status: "active", createdAt: "2026-06-01T00:00:00Z" },
          { date: "2026-06-08", status: "ended", createdAt: "2026-06-08T00:00:00Z" },
        ],
      });

      const interaction = {
        guildId: "guild-1",
        options: { getFocused: vi.fn(() => "") },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      const choices = interaction.respond.mock.calls[0][0];
      expect(choices).toHaveLength(1);
      expect(choices[0].value).toBe("2026-06-01");
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
        options: { getFocused: vi.fn(() => "06") },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      const choices = interaction.respond.mock.calls[0][0];
      expect(choices).toHaveLength(1);
      expect(choices[0].value).toBe("2026-06-01");
    });
  });
});
