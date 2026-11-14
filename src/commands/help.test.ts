import { describe, it, expect, vi } from "vitest";
import { PermissionFlagsBits } from "discord.js";
import command from "./help.js";

function mockInteraction(hasManageChannels: boolean) {
  return {
    member: {
      permissions: {
        has: vi.fn((perm: bigint) =>
          perm === PermissionFlagsBits.ManageChannels ? hasManageChannels : false
        ),
      },
    },
    reply: vi.fn(),
  } as any;
}

describe("/help", () => {
  it("has correct metadata", () => {
    expect(command.data.name).toBe("help");
    expect(command.data.description).toBe("Show the QuizBot manual");
  });

  describe("admin view", () => {
    it("replies ephemerally with all sections", async () => {
      const interaction = mockInteraction(true);

      await command.execute(interaction);

      const call = interaction.reply.mock.calls[0][0];
      expect(call.ephemeral).toBe(true);
      expect(call.content).toContain("QUIZBOT(1)");
      expect(call.content).toContain("SYNOPSIS");
      expect(call.content).toContain("GETTING STARTED");
      expect(call.content).toContain("TEAM COMMANDS");
      expect(call.content).toContain("QUIZ COMMANDS");
      expect(call.content).toContain("UTILITY COMMANDS");
      expect(call.content).toContain("PERMISSIONS");
      expect(call.content).toContain("WORKFLOW TIPS");
    });

    it("includes admin commands", async () => {
      const interaction = mockInteraction(true);

      await command.execute(interaction);

      const content = interaction.reply.mock.calls[0][0].content;
      expect(content).toContain("/delete-team");
      expect(content).toContain("/quiz-setup");
      expect(content).toContain("/quiz-fetch");
      expect(content).toContain("/quiz-send");
      expect(content).toContain("/quiz-scoreboard");
      expect(content).toContain("/quiz-correct");
      expect(content).toContain("/quiz-end");
      expect(content).toContain("/quiz-reset");
    });
  });

  describe("player view", () => {
    it("replies ephemerally without admin sections", async () => {
      const interaction = mockInteraction(false);

      await command.execute(interaction);

      const call = interaction.reply.mock.calls[0][0];
      expect(call.ephemeral).toBe(true);
      expect(call.content).toContain("QUIZBOT(1)");
      expect(call.content).toContain("TEAM COMMANDS");
      expect(call.content).toContain("UTILITY COMMANDS");
      expect(call.content).not.toContain("QUIZ COMMANDS");
      expect(call.content).not.toContain("WORKFLOW TIPS");
    });

    it("excludes admin commands from synopsis", async () => {
      const interaction = mockInteraction(false);

      await command.execute(interaction);

      const content = interaction.reply.mock.calls[0][0].content;
      expect(content).not.toContain("/delete-team");
      expect(content).not.toContain("/quiz-setup");
      expect(content).not.toContain("/quiz-fetch");
      expect(content).not.toContain("/quiz-send");
      expect(content).not.toContain("/quiz-scoreboard");
      expect(content).not.toContain("/quiz-correct");
      expect(content).not.toContain("/quiz-end");
      expect(content).not.toContain("/quiz-reset");
    });

    it("still includes common commands", async () => {
      const interaction = mockInteraction(false);

      await command.execute(interaction);

      const content = interaction.reply.mock.calls[0][0].content;
      expect(content).toContain("/register");
      expect(content).toContain("/team");
      expect(content).toContain("/leave");
      expect(content).toContain("/ping");
      expect(content).toContain("/help");
    });
  });

  it("shows 2026 in footer", async () => {
    const interaction = mockInteraction(false);

    await command.execute(interaction);

    expect(interaction.reply.mock.calls[0][0].content).toContain("2026");
  });
});
