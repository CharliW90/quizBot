import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../integrations/firestore/quiz.js", () => ({
  endQuiz: vi.fn(),
}));

import { endQuiz } from "../integrations/firestore/quiz.js";
import command from "./quiz-end.js";

const mockEndQuiz = vi.mocked(endQuiz);

function mockInteraction(customId: string) {
  const reply = {
    awaitMessageComponent: vi.fn(),
  };

  return {
    guild: { id: "guild-1" },
    guildId: "guild-1",
    user: { id: "user-1" },
    reply: vi.fn(async () => reply),
    editReply: vi.fn(),
    _reply: reply,
    _customId: customId,
  } as any;
}

describe("/quiz end", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("cancels without ending", async () => {
    const interaction = mockInteraction("cancel");
    interaction._reply.awaitMessageComponent.mockResolvedValue({
      customId: "cancel",
    });

    await command.execute(interaction);

    expect(mockEndQuiz).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Cancelled.", components: [] })
    );
  });

  it("handles timeout", async () => {
    const interaction = mockInteraction("timeout");
    interaction._reply.awaitMessageComponent.mockRejectedValue(
      new Error("Collector received no interactions before ending with reason: time")
    );

    await command.execute(interaction);

    expect(mockEndQuiz).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Timed out.", components: [] })
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
});
