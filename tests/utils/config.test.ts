import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "../../src/utils/config.js";

describe("loadConfig", () => {
  const validEnv = {
    DISCORD_TOKEN: "test-token",
    DISCORD_CLIENT_ID: "123456",
    GUILD_ID: "789012",
    FIREBASE_PROJECT_ID: "my-project",
  };

  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    Object.assign(process.env, validEnv);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns config when all env vars are present", () => {
    const config = loadConfig();

    expect(config).toEqual(validEnv);
  });

  it("throws when a required env var is missing", () => {
    delete process.env.DISCORD_TOKEN;

    expect(() => loadConfig()).toThrow("Missing environment variables: DISCORD_TOKEN");
  });

  it("throws listing all missing vars when multiple are absent", () => {
    delete process.env.DISCORD_TOKEN;
    delete process.env.GUILD_ID;

    expect(() => loadConfig()).toThrow("Missing environment variables: DISCORD_TOKEN, GUILD_ID");
  });

  it("throws when an env var is an empty string", () => {
    process.env.DISCORD_TOKEN = "";

    expect(() => loadConfig()).toThrow("Missing environment variables: DISCORD_TOKEN");
  });
});
