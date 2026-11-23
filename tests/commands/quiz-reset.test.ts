import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../../src/services/reset-quiz.js", () => ({
  resetQuiz: vi.fn(),
}));

vi.mock("../../src/integrations/firestore/teams.js", () => ({
  listTeams: vi.fn(),
}));

import { resetQuiz } from "../../src/services/reset-quiz.js";
import { listTeams } from "../../src/integrations/firestore/teams.js";
import command from "../../src/commands/quiz-reset.js";

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
        {
          name: "The Foxes",
          captain: "",
          members: [],
          roleId: "r1",
          textChannelId: "c1",
          voiceChannelId: "v1",
          color: "",
        },
        {
          name: "Quiz Masters",
          captain: "",
          members: [],
          roleId: "r2",
          textChannelId: "c2",
          voiceChannelId: "v2",
          color: "",
        },
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
      new Error("Collector received no interactions before ending with reason: time"),
    );

    await command.execute(interaction);

    expect(mockResetQuiz).not.toHaveBeenCalled();
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
    expect(mockResetQuiz).not.toHaveBeenCalled();
  });

  it("replies with nothing to reset when no teams exist", async () => {
    mockListTeams.mockResolvedValue({ ok: true, data: [] });

    const interaction = mockInteraction("confirm");
    await command.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ data: expect.objectContaining({ title: "Nothing to Reset" }) })],
      }),
    );
    expect(mockResetQuiz).not.toHaveBeenCalled();
  });

  it("reports error when resetQuiz fails", async () => {
    mockResetQuiz.mockResolvedValue({ ok: false, error: "Firestore unavailable" });

    const interaction = mockInteraction("confirm");
    interaction._reply.awaitMessageComponent.mockResolvedValue({ customId: "confirm" });

    await command.execute(interaction);

    const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
    expect(lastEdit.embeds[0].data.title).toContain("Error");
  });

  it("treats listTeams error as zero teams", async () => {
    mockListTeams.mockResolvedValue({ ok: false, error: "Firestore error" });

    const interaction = mockInteraction("confirm");
    await command.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ data: expect.objectContaining({ title: "Nothing to Reset" }) })],
      }),
    );
  });

  it("uses singular grammar for 1 team, 1 role, 1 channel", async () => {
    mockResetQuiz.mockResolvedValue({
      ok: true,
      data: { rolesDeleted: 1, channelsDeleted: 1, teamsDeleted: 1 },
    });

    const interaction = mockInteraction("confirm");
    interaction._reply.awaitMessageComponent.mockResolvedValue({ customId: "confirm" });

    await command.execute(interaction);

    const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
    const desc = lastEdit.embeds[0].data.description;
    expect(desc).toContain("1 team removed");
    expect(desc).toContain("1 role deleted");
    expect(desc).toContain("1 channel deleted");
    expect(desc).not.toContain("teams");
    expect(desc).not.toContain("roles");
    expect(desc).not.toContain("channels");
  });

  it("handles unexpected errors in catch block", async () => {
    const interaction = mockInteraction("error");
    interaction._reply.awaitMessageComponent.mockRejectedValue(new Error("Something unexpected"));

    await command.execute(interaction);

    const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
    expect(lastEdit.embeds[0].data.title).toContain("Error");
  });
});
