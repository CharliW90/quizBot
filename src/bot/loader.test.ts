import { describe, it, expect, vi, beforeEach } from "vitest";
import { Collection } from "discord.js";
import { loadCommands } from "./loader";
import type { Command } from "./types";

vi.mock("../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("node:fs", () => ({
  readdirSync: vi.fn(),
}));

describe("loadCommands", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns a Collection of commands keyed by name", async () => {
    const { readdirSync } = await import("node:fs");
    vi.mocked(readdirSync).mockReturnValue([
      { name: "ping.ts", isFile: () => true, isDirectory: () => false },
    ] as unknown as ReturnType<typeof readdirSync>);

    const mockCommand: Command = {
      data: { name: "ping" } as unknown as Command["data"],
      execute: vi.fn(),
    };

    vi.doMock(
      "/fake/commands/ping.ts",
      () => ({ default: mockCommand }),
    );

    const commands = await loadCommands("/fake/commands");

    expect(commands).toBeInstanceOf(Collection);
    expect(commands.get("ping")).toBe(mockCommand);
  });

  it("skips files that do not export a valid command", async () => {
    const { readdirSync } = await import("node:fs");
    vi.mocked(readdirSync).mockReturnValue([
      { name: "broken.ts", isFile: () => true, isDirectory: () => false },
    ] as unknown as ReturnType<typeof readdirSync>);

    vi.doMock("/fake/commands/broken.ts", () => ({ default: {} }));

    const commands = await loadCommands("/fake/commands");

    expect(commands.size).toBe(0);
  });

  it("skips test files", async () => {
    const { readdirSync } = await import("node:fs");
    vi.mocked(readdirSync).mockReturnValue([
      { name: "ping.test.ts", isFile: () => true, isDirectory: () => false },
    ] as unknown as ReturnType<typeof readdirSync>);

    const commands = await loadCommands("/fake/commands");

    expect(commands.size).toBe(0);
  });

  it("skips non-ts files", async () => {
    const { readdirSync } = await import("node:fs");
    vi.mocked(readdirSync).mockReturnValue([
      { name: "README.md", isFile: () => true, isDirectory: () => false },
    ] as unknown as ReturnType<typeof readdirSync>);

    const commands = await loadCommands("/fake/commands");

    expect(commands.size).toBe(0);
  });
});
