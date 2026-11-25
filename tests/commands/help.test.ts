import { describe, it, expect, vi } from "vitest";
import { MessageFlags, PermissionFlagsBits } from "discord.js";
import command from "../../src/commands/help.js";

function mockInteraction(hasManageChannels: boolean, commandArg: string | null = null) {
  return {
    member: {
      permissions: {
        has: vi.fn((perm: bigint) =>
          perm === PermissionFlagsBits.ManageChannels ? hasManageChannels : false,
        ),
      },
    },
    options: {
      getString: vi.fn(() => commandArg),
    },
    reply: vi.fn(),
  } as any;
}

function mockAutocomplete(hasManageChannels: boolean, focused: string) {
  return {
    member: {
      permissions: {
        has: vi.fn((perm: bigint) =>
          perm === PermissionFlagsBits.ManageChannels ? hasManageChannels : false,
        ),
      },
    },
    options: {
      getFocused: vi.fn(() => focused),
    },
    respond: vi.fn(),
  } as any;
}

describe("/help", () => {
  it("has correct metadata", () => {
    expect(command.data.name).toBe("help");
  });

  it("has an autocomplete command option", () => {
    const option = command.data.options[0]?.toJSON() as unknown as Record<string, unknown>;
    expect(option?.name).toBe("command");
    expect(option?.autocomplete).toBe(true);
  });

  describe("index (no argument)", () => {
    it("replies ephemerally", async () => {
      const interaction = mockInteraction(false);
      await command.execute(interaction);
      expect(interaction.reply.mock.calls[0][0].flags).toBe(MessageFlags.Ephemeral);
    });

    it("shows player commands for non-admin", async () => {
      const interaction = mockInteraction(false);
      await command.execute(interaction);
      const content = interaction.reply.mock.calls[0][0].content;
      expect(content).toContain("/register");
      expect(content).toContain("/team");
      expect(content).toContain("/leave");
      expect(content).toContain("/ping");
      expect(content).toContain("/help");
    });

    it("hides admin commands for non-admin", async () => {
      const interaction = mockInteraction(false);
      await command.execute(interaction);
      const content = interaction.reply.mock.calls[0][0].content;
      expect(content).not.toContain("/delete-team");
      expect(content).not.toContain("/setup");
      expect(content).not.toContain("/fetch-responses");
      expect(content).not.toContain("/results");
      expect(content).not.toContain("/scores");
      expect(content).not.toContain("/correction");
      expect(content).not.toContain("/end-quiz");
      expect(content).not.toContain("/reset-quiz");
    });

    it("shows all commands for admin", async () => {
      const interaction = mockInteraction(true);
      await command.execute(interaction);
      const content = interaction.reply.mock.calls[0][0].content;
      expect(content).toContain("/register");
      expect(content).toContain("/delete-team");
      expect(content).toContain("/setup");
      expect(content).toContain("/reset-quiz");
    });

    it("shows version header", async () => {
      const interaction = mockInteraction(false);
      await command.execute(interaction);
      expect(interaction.reply.mock.calls[0][0].content).toContain("QuizBot v4.0.0");
    });
  });

  describe("detail (with argument)", () => {
    it("shows usage and detail for a valid command", async () => {
      const interaction = mockInteraction(false, "register");
      await command.execute(interaction);
      const content = interaction.reply.mock.calls[0][0].content;
      expect(content).toContain("/register <name> <captain> <members...> [color]");
      expect(content).toContain("Creates a role");
    });

    it("shows admin command detail for admin", async () => {
      const interaction = mockInteraction(true, "setup");
      await command.execute(interaction);
      const content = interaction.reply.mock.calls[0][0].content;
      expect(content).toContain("/setup");
      expect(content).toContain("form ID");
    });

    it("rejects admin command for non-admin", async () => {
      const interaction = mockInteraction(false, "setup");
      await command.execute(interaction);
      const content = interaction.reply.mock.calls[0][0].content;
      expect(content).toContain("Unknown command");
    });

    it("rejects unknown command", async () => {
      const interaction = mockInteraction(true, "nonexistent");
      await command.execute(interaction);
      const content = interaction.reply.mock.calls[0][0].content;
      expect(content).toContain("Unknown command");
    });
  });

  describe("autocomplete", () => {
    it("shows only player commands for non-admin", async () => {
      const interaction = mockAutocomplete(false, "");
      await command.autocomplete!(interaction);
      const choices = interaction.respond.mock.calls[0][0];
      const names = choices.map((c: { name: string }) => c.name);
      expect(names).toContain("register");
      expect(names).toContain("leave");
      expect(names).not.toContain("setup");
      expect(names).not.toContain("delete-team");
    });

    it("shows all commands for admin", async () => {
      const interaction = mockAutocomplete(true, "");
      await command.autocomplete!(interaction);
      const choices = interaction.respond.mock.calls[0][0];
      const names = choices.map((c: { name: string }) => c.name);
      expect(names).toContain("register");
      expect(names).toContain("setup");
      expect(names).toContain("delete-team");
    });

    it("filters by typed text", async () => {
      const interaction = mockAutocomplete(true, "res");
      await command.autocomplete!(interaction);
      const choices = interaction.respond.mock.calls[0][0];
      const names = choices.map((c: { name: string }) => c.name);
      expect(names.every((n: string) => n.includes("res"))).toBe(true);
      expect(names).toContain("results");
      expect(names).toContain("reset-quiz");
      expect(names).not.toContain("register");
    });
  });
});
