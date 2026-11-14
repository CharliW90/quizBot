import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../services/reset-quiz.js", () => ({
  resetQuiz: vi.fn(),
}));

vi.mock("../integrations/firestore/teams.js", () => ({
  listTeams: vi.fn(),
}));

import { resetQuiz } from "../services/reset-quiz.js";
import { listTeams } from "../integrations/firestore/teams.js";
import command from "./quiz-reset.js";

const mockResetQuiz = vi.mocked(resetQuiz);
const mockListTeams = vi.mocked(listTeams);

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

describe("/quiz reset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListTeams.mockResolvedValue({
      ok: true,
      data: [
        { name: "The Foxes", captain: "", members: [], roleId: "r1", textChannelId: "c1", voiceChannelId: "v1", color: "" },
        { name: "Quiz Masters", captain: "", members: [], roleId: "r2", textChannelId: "c2", voiceChannelId: "v2", color: "" },
      ],
    });
  });

  it("shows team count in confirmation and resets on confirm", async () => {
    mockResetQuiz.mockResolvedValue({
      ok: true,
      data: { rolesDeleted: 2, channelsDeleted: 4, teamsDeleted: 2 },
    });

    const interaction = mockInteraction("confirm");
    interaction._reply.awaitMessageComponent.mockResolvedValue({ customId: "confirm" });

    await command.execute(interaction);

    const replyContent = interaction.reply.mock.calls[0][0].content;
    expect(replyContent).toContain("2 teams");

    expect(mockResetQuiz).toHaveBeenCalled();
    const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
    expect(lastEdit.embeds[0].data.description).toContain("2 roles");
  });

  it("cancels without resetting", async () => {
    const interaction = mockInteraction("cancel");
    interaction._reply.awaitMessageComponent.mockResolvedValue({ customId: "cancel" });

    await command.execute(interaction);

    expect(mockResetQuiz).not.toHaveBeenCalled();
  });

  it("handles timeout", async () => {
    const interaction = mockInteraction("timeout");
    interaction._reply.awaitMessageComponent.mockRejectedValue(
      new Error("Collector received no interactions before ending with reason: time")
    );

    await command.execute(interaction);

    expect(mockResetQuiz).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "Timed out.", components: [] })
    );
  });
});
