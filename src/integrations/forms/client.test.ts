import { describe, it, expect, vi, beforeEach } from "vitest";
import { google } from "googleapis";

vi.mock("googleapis", () => {
  const mockGet = vi.fn();
  const mockList = vi.fn();
  return {
    google: {
      auth: {
        GoogleAuth: vi.fn(() => ({ getClient: vi.fn() })),
      },
      forms: vi.fn(() => ({
        forms: {
          get: mockGet,
          responses: { list: mockList },
        },
      })),
    },
  };
});

vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("../../utils/result", () => ({
  ok: (data: unknown) => ({ ok: true, data }),
  err: (error: unknown) => ({ ok: false, error }),
}));

describe("createFormsClient", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates a Google Auth instance with forms scopes", async () => {
    const { createFormsClient } = await import("./client.js");
    createFormsClient();

    expect(google.auth.GoogleAuth).toHaveBeenCalledWith({
      scopes: [
        "https://www.googleapis.com/auth/forms.body.readonly",
        "https://www.googleapis.com/auth/forms.responses.readonly",
      ],
    });
  });

  it("exposes getForm, isFormClosed, and listResponses methods", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    expect(client.getForm).toBeInstanceOf(Function);
    expect(client.isFormClosed).toBeInstanceOf(Function);
    expect(client.listResponses).toBeInstanceOf(Function);
  });

  it("getForm calls forms.get with the formId", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    const formsApi = google.forms({ version: "v1" });
    vi.mocked(formsApi.forms.get).mockResolvedValue({ data: { formId: "abc" } } as never);

    const result = await client.getForm("abc");

    expect(formsApi.forms.get).toHaveBeenCalledWith({ formId: "abc" });
    expect(result).toEqual({ formId: "abc" });
  });

  it("isFormClosed returns true when form state is CLOSED", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    const form = { formId: "abc", settings: { state: "CLOSED" } };
    expect(client.isFormClosed(form as any)).toBe(true);
  });

  it("isFormClosed returns false when form state is not CLOSED", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    const form = { formId: "abc", settings: { state: "OPEN" } };
    expect(client.isFormClosed(form as any)).toBe(false);
  });

  it("isFormClosed returns false when settings are absent", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    const form = { formId: "abc" };
    expect(client.isFormClosed(form as any)).toBe(false);
  });

  it("listResponses returns responses when form is closed", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    const formsApi = google.forms({ version: "v1" });
    vi.mocked(formsApi.forms.get).mockResolvedValue({
      data: { formId: "abc", settings: { state: "CLOSED" } },
    } as never);
    vi.mocked(formsApi.forms.responses.list).mockResolvedValue({
      data: { responses: [{ responseId: "r1" }] },
    } as never);

    const result = await client.listResponses("abc");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([{ responseId: "r1" }]);
    }
  });

  it("listResponses returns error when form is still open", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    const formsApi = google.forms({ version: "v1" });
    vi.mocked(formsApi.forms.get).mockResolvedValue({
      data: { formId: "abc", settings: { state: "OPEN" } },
    } as never);

    const result = await client.listResponses("abc");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("still accepting responses");
    }
  });

  it("listResponses returns empty array when no responses exist", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    const formsApi = google.forms({ version: "v1" });
    vi.mocked(formsApi.forms.get).mockResolvedValue({
      data: { formId: "abc", settings: { state: "CLOSED" } },
    } as never);
    vi.mocked(formsApi.forms.responses.list).mockResolvedValue({
      data: { responses: undefined },
    } as never);

    const result = await client.listResponses("abc");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual([]);
    }
  });
});
