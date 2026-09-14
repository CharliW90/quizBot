import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../services/check-status.js", () => ({
  checkStatus: vi.fn(),
}));

vi.mock("../integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../integrations/forms/client.js", () => ({
  createFormsClient: vi.fn(() => ({ getForm: vi.fn() })),
}));

import { checkStatus } from "../services/check-status.js";
import command from "./status.js";
import type { StatusResult } from "../services/check-status.js";

const mockCheckStatus = vi.mocked(checkStatus);

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
  });

  it("has correct metadata", () => {
    expect(command.data.name).toBe("status");
    expect(command.data.description).toBe("Show integration health and bot status");
  });

  it("defers reply as ephemeral", async () => {
    mockCheckStatus.mockResolvedValue(allHealthy);
    const interaction = mockInteraction(["ManageChannels", "ManageRoles"]);

    await command.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
  });

  it("shows all-healthy status in embed", async () => {
    mockCheckStatus.mockResolvedValue(allHealthy);
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
    const unhealthy: StatusResult = {
      firestore: { healthy: false, reason: "Connection refused" },
      formsApi: { healthy: true },
      permissions: { healthy: true, granted: ["ManageChannels", "ManageRoles"], missing: [] },
      uptime: "5m",
    };
    mockCheckStatus.mockResolvedValue(unhealthy);
    const interaction = mockInteraction(["ManageChannels", "ManageRoles"]);

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    const desc = embed.data.description;
    expect(desc).toContain("Connection refused");
    expect(embed.data.color).toBe(0xe74c3c);
  });

  it("shows missing permissions", async () => {
    const missingPerms: StatusResult = {
      firestore: { healthy: true },
      formsApi: { healthy: true },
      permissions: { healthy: false, granted: ["ManageChannels"], missing: ["ManageRoles"] },
      uptime: "1m",
    };
    mockCheckStatus.mockResolvedValue(missingPerms);
    const interaction = mockInteraction(["ManageChannels"]);

    await command.execute(interaction);

    const embed = interaction.editReply.mock.calls[0][0].embeds[0];
    const desc = embed.data.description;
    expect(desc).toContain("ManageRoles");
  });
});
