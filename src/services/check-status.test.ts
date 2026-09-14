import { describe, it, expect, vi } from "vitest";
import { checkStatus, type StatusDeps } from "./check-status.js";

function makeDeps(overrides: Partial<StatusDeps> = {}): StatusDeps {
  return {
    pingFirestore: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    pingFormsApi: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    botPermissions: ["ManageChannels", "ManageRoles"],
    requiredPermissions: ["ManageChannels", "ManageRoles"],
    uptimeMs: 8_040_000,
    ...overrides,
  };
}

describe("checkStatus", () => {
  it("reports all healthy when everything passes", async () => {
    const result = await checkStatus(makeDeps());

    expect(result.firestore).toEqual({ healthy: true });
    expect(result.formsApi).toEqual({ healthy: true });
    expect(result.permissions).toEqual({ healthy: true, granted: ["ManageChannels", "ManageRoles"], missing: [] });
    expect(result.uptime).toBe("2h 14m");
  });

  it("reports firestore failure with reason", async () => {
    const deps = makeDeps({
      pingFirestore: vi.fn().mockRejectedValue(new Error("Connection refused")),
    });

    const result = await checkStatus(deps);

    expect(result.firestore).toEqual({ healthy: false, reason: "Connection refused" });
  });

  it("reports forms API failure with reason", async () => {
    const deps = makeDeps({
      pingFormsApi: vi.fn().mockRejectedValue(new Error("Invalid credentials")),
    });

    const result = await checkStatus(deps);

    expect(result.formsApi).toEqual({ healthy: false, reason: "Invalid credentials" });
  });

  it("reports missing permissions", async () => {
    const deps = makeDeps({ botPermissions: ["ManageChannels"] });

    const result = await checkStatus(deps);

    expect(result.permissions).toEqual({
      healthy: false,
      granted: ["ManageChannels"],
      missing: ["ManageRoles"],
    });
  });

  it("formats uptime with days when applicable", async () => {
    const deps = makeDeps({ uptimeMs: 90_060_000 });

    const result = await checkStatus(deps);

    expect(result.uptime).toBe("1d 1h 1m");
  });

  it("formats short uptime as minutes only", async () => {
    const deps = makeDeps({ uptimeMs: 45_000 });

    const result = await checkStatus(deps);

    expect(result.uptime).toBe("0m");
  });

  it("handles both integrations failing simultaneously", async () => {
    const deps = makeDeps({
      pingFirestore: vi.fn().mockRejectedValue(new Error("timeout")),
      pingFormsApi: vi.fn().mockRejectedValue(new Error("auth failed")),
      botPermissions: [],
    });

    const result = await checkStatus(deps);

    expect(result.firestore.healthy).toBe(false);
    expect(result.formsApi.healthy).toBe(false);
    expect(result.permissions.healthy).toBe(false);
  });
});
