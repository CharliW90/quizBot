import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client, GatewayIntentBits } from "discord.js";

vi.mock("discord.js", () => {
  const mockClient = {
    login: vi.fn().mockResolvedValue("token"),
    destroy: vi.fn().mockResolvedValue(undefined),
    once: vi.fn(),
    on: vi.fn(),
    user: { tag: "QuizBot#1234" },
  };
  return {
    Client: vi.fn(() => mockClient),
    GatewayIntentBits: { Guilds: 1 },
  };
});

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../utils/config", () => ({
  loadConfig: () => ({
    DISCORD_TOKEN: "fake-token",
    DISCORD_CLIENT_ID: "123456",
    GUILD_ID: "789",
    FIREBASE_PROJECT_ID: "test",
    GOOGLE_APPLICATION_CREDENTIALS: "/fake/path.json",
  }),
}));

describe("createBot", () => {
  let processListeners: Record<string, (...args: unknown[]) => void>;

  beforeEach(() => {
    processListeners = {};
    vi.spyOn(process, "on").mockImplementation((event, handler) => {
      processListeners[event as string] = handler as (...args: unknown[]) => void;
      return process;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a Client with Guilds intent", async () => {
    const { createBot } = await import("./client.js");
    createBot();

    expect(Client).toHaveBeenCalledWith({
      intents: [GatewayIntentBits.Guilds],
    });
  });

  it("logs in with the configured token", async () => {
    const { createBot } = await import("./client.js");
    const bot = createBot();
    await bot.login();

    expect(bot.client.login).toHaveBeenCalledWith("fake-token");
  });

  it("registers a ready handler that logs the bot tag", async () => {
    const { createBot } = await import("./client.js");
    const bot = createBot();
    await bot.login();

    expect(bot.client.once).toHaveBeenCalledWith("ready", expect.any(Function));
  });

  it("registers shutdown handlers for SIGINT and SIGTERM", async () => {
    const { createBot } = await import("./client.js");
    createBot();

    expect(process.on).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    expect(process.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
  });

  it("calls client.destroy() on shutdown", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
    const { createBot } = await import("./client.js");
    const bot = createBot();

    processListeners["SIGINT"]();

    expect(bot.client.destroy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
