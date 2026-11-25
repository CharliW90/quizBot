import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../../src/services/reset-quiz.js", () => ({
  resetQuiz: vi.fn(),
  discoverQuizTeamCategory: vi.fn(),
  discoverTeamRoles: vi.fn(),
}));

import { resetQuiz, discoverQuizTeamCategory, discoverTeamRoles } from "../../src/services/reset-quiz.js";
import command from "../../src/commands/reset-quiz.js";

const mockResetQuiz = vi.mocked(resetQuiz);
const mockDiscoverCategory = vi.mocked(discoverQuizTeamCategory);
const mockDiscoverRoles = vi.mocked(discoverTeamRoles);

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

describe("/reset-quiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscoverCategory.mockReturnValue({
      children: { cache: new Map([["c1", { name: "the-foxes" }], ["c2", { name: "quiz-masters" }]]) },
    } as any);
    mockDiscoverRoles.mockReturnValue([
      { id: "r1", name: "Team: The Foxes" },
      { id: "r2", name: "Team: Quiz Masters" },
    ] as any);
  });

  it("shows channel and role counts in confirmation and resets on confirm", async () => {
    mockResetQuiz.mockResolvedValue({
      ok: true,
      data: {
        channelsDeleted: 4,
        rolesDeleted: 2,
        captainRolesCleared: 2,
        teamsRolesCleared: 4,
        firestoreTeamsDeleted: 2,
        firestoreAliasesDeleted: true,
        firestoreMembersDeleted: true,
      },
    });

    const interaction = mockInteraction("confirm");
    interaction._reply.awaitMessageComponent.mockResolvedValue({ customId: "confirm" });

    await command.execute(interaction);

    const replyContent = interaction.reply.mock.calls[0][0].content;
    expect(replyContent).toContain("2 channels");
    expect(replyContent).toContain("2 roles");

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

  it("replies with nothing to reset when no channels or roles found", async () => {
    mockDiscoverCategory.mockReturnValue(null);
    mockDiscoverRoles.mockReturnValue([]);

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

  it("handles unexpected errors in catch block", async () => {
    const interaction = mockInteraction("error");
    interaction._reply.awaitMessageComponent.mockRejectedValue(new Error("Something unexpected"));

    await command.execute(interaction);

    const lastEdit = interaction.editReply.mock.calls.at(-1)[0];
    expect(lastEdit.embeds[0].data.title).toContain("Error");
  });
});
