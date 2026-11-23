import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageFlags } from "discord.js";
import type { StatusResult } from "../../src/services/check-status.js";

let checkStatusResult: StatusResult;

vi.mock("../../src/services/check-status.js", () => ({
  checkStatus: vi.fn(async (deps: any) => {
    await deps.pingFirestore().catch(() => {});
    await deps.pingFormsApi().catch(() => {});
    return checkStatusResult;
  }),
}));

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => ({ listCollections: vi.fn().mockResolvedValue([]) })),
}));

vi.mock("../../src/integrations/forms/client.js", () => ({
  createFormsClient: vi.fn(() => ({ getForm: vi.fn().mockResolvedValue({}) })),
}));

import { checkStatus } from "../../src/services/check-status.js";
import { createFormsClient } from "../../src/integrations/forms/client.js";
import command from "../../src/commands/status.js";

function mockInteraction(botPermissions: string[]) {
  return {
    guild: {
      id: "guild-1",
      members: {
        me: {
          permissions: {
            toArray: () => botPermissions,
          },
        },
      },
    },
    client: { uptime: 8_040_000 },
    deferReply: vi.fn(),
    editReply: vi.fn(),
  } as any;
}

const allHealthy: StatusResult = {
  firestore: { healthy: true },
  formsApi: { healthy: true },
  permissions: { healthy: true, granted: ["ManageChannels", "ManageRoles"], missing: [] },
  uptime: "2h 14m",
};

describe("/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkStatusResult = allHealthy;
  });

  it("has correct metadata", () => {
    expect(command.data.name).toBe("status");
    expect(command.data.description).toBe("Show integration health and bot status");
  });

  it("defers reply as ephemeral", async () => {
    const interaction = mockInteraction(["ManageChannels", "ManageRoles"]);

    await command.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
  });

  it("shows all-healthy status in embed", async () => {
    const interaction = mockInteraction(["ManageChannels", "ManageRoles"]);

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    const desc = embed.data.description;
    expect(desc).toContain("Firestore");
    expect(desc).toContain("Connected");
    expect(desc).toContain("Google Forms");
    expect(desc).toContain("Authenticated");
    expect(desc).toContain("Permissions");
    expect(desc).toContain("Uptime");
    expect(desc).toContain("2h 14m");
    expect(embed.data.color).toBe(0x2ecc71);
  });

  it("shows failure status with red embed when something is down", async () => {
    checkStatusResult = {
      firestore: { healthy: false, reason: "Connection refused" },
      formsApi: { healthy: true },
      permissions: { healthy: true, granted: ["ManageChannels", "ManageRoles"], missing: [] },
      uptime: "5m",
    };
    const interaction = mockInteraction(["ManageChannels", "ManageRoles"]);

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    const desc = embed.data.description;
    expect(desc).toContain("Connection refused");
    expect(embed.data.color).toBe(0xe74c3c);
  });

  it("shows failure reason when Google Forms is down", async () => {
    checkStatusResult = {
      firestore: { healthy: true },
      formsApi: { healthy: false, reason: "Auth token expired" },
      permissions: { healthy: true, granted: ["ManageChannels", "ManageRoles"], missing: [] },
      uptime: "10m",
    };
    const interaction = mockInteraction(["ManageChannels", "ManageRoles"]);

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    const desc = embed.data.description;
    expect(desc).toContain("Auth token expired");
    expect(embed.data.color).toBe(0xe74c3c);
  });

  it("treats Forms API 404 as healthy (auth works, ping form doesn't exist)", async () => {
    const error404 = Object.assign(new Error("Not Found"), { code: 404 });
    vi.mocked(createFormsClient).mockReturnValue({ getForm: vi.fn().mockRejectedValue(error404) } as any);

    const interaction = mockInteraction(["ManageChannels", "ManageRoles"]);
    await command.execute(interaction);

    const deps = vi.mocked(checkStatus).mock.calls[0][0];
    await expect(deps.pingFormsApi()).resolves.toBeUndefined();
  });

  it("propagates Forms API permission errors", async () => {
    const error403 = Object.assign(new Error("Insufficient Permission"), { code: 403 });
    vi.mocked(createFormsClient).mockReturnValue({ getForm: vi.fn().mockRejectedValue(error403) } as any);

    const interaction = mockInteraction(["ManageChannels", "ManageRoles"]);
    await command.execute(interaction);

    const deps = vi.mocked(checkStatus).mock.calls[0][0];
    await expect(deps.pingFormsApi()).rejects.toThrow("Insufficient Permission");
  });

  it("shows missing permissions", async () => {
    checkStatusResult = {
      firestore: { healthy: true },
      formsApi: { healthy: true },
      permissions: { healthy: false, granted: ["ManageChannels"], missing: ["ManageRoles"] },
      uptime: "1m",
    };
    const interaction = mockInteraction(["ManageChannels"]);

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    const desc = embed.data.description;
    expect(desc).toContain("ManageRoles");
  });
});
