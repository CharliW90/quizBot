import { describe, it, expect, vi } from "vitest";
import { Collection } from "discord.js";
import { createInteractionHandler } from "./handler";
import type { Command } from "./types";

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function mockInteraction(commandName: string, replied = false, deferred = false) {
  return {
    isAutocomplete: () => false,
    isChatInputCommand: () => true,
    commandName,
    replied,
    deferred,
    reply: vi.fn(),
    editReply: vi.fn(),
  };
}

describe("createInteractionHandler", () => {
  it("dispatches autocomplete to the command's autocomplete handler", async () => {
    const autocomplete = vi.fn();
    const commands = new Collection<string, Command>();
    commands.set("register", {
      data: { name: "register" } as unknown as Command["data"],
      execute: vi.fn(),
      autocomplete,
    });

    const handler = createInteractionHandler(commands);
    const interaction = {
      isAutocomplete: () => true,
      commandName: "register",
    };

    await handler(interaction as never);

    expect(autocomplete).toHaveBeenCalledWith(interaction);
  });

  it("silently ignores autocomplete for commands without an autocomplete handler", async () => {
    const commands = new Collection<string, Command>();
    commands.set("ping", {
      data: { name: "ping" } as unknown as Command["data"],
      execute: vi.fn(),
    });

    const handler = createInteractionHandler(commands);
    const interaction = {
      isAutocomplete: () => true,
      commandName: "ping",
    };

    await handler(interaction as never);
  });

  it("executes the matching command", async () => {
    const execute = vi.fn();
    const commands = new Collection<string, Command>();
    commands.set("ping", {
      data: { name: "ping" } as unknown as Command["data"],
      execute,
    });

    const handler = createInteractionHandler(commands);
    const interaction = mockInteraction("ping");

    await handler(interaction as never);

    expect(execute).toHaveBeenCalledWith(interaction);
  });

  it("ignores non-chat-input interactions", async () => {
    const commands = new Collection<string, Command>();
    const handler = createInteractionHandler(commands);

    const interaction = { isAutocomplete: () => false, isChatInputCommand: () => false };
    await handler(interaction as never);
  });

  it("replies with an error if command is not found", async () => {
    const commands = new Collection<string, Command>();
    const handler = createInteractionHandler(commands);

    const interaction = mockInteraction("unknown");
    await handler(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining("not found"), ephemeral: true }),
    );
  });

  it("replies with an error if command throws", async () => {
    const commands = new Collection<string, Command>();
    commands.set("boom", {
      data: { name: "boom" } as unknown as Command["data"],
      execute: () => { throw new Error("kaboom"); },
    });

    const handler = createInteractionHandler(commands);
    const interaction = mockInteraction("boom");

    await handler(interaction as never);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining("unexpected error"), ephemeral: true }),
    );
  });

  it("uses editReply if interaction was already deferred", async () => {
    const commands = new Collection<string, Command>();
    commands.set("boom", {
      data: { name: "boom" } as unknown as Command["data"],
      execute: () => { throw new Error("kaboom"); },
    });

    const handler = createInteractionHandler(commands);
    const interaction = mockInteraction("boom", false, true);

    await handler(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ content: expect.stringContaining("unexpected error") }),
    );
  });
});
