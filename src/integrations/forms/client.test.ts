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

  it("exposes getForm and listResponses methods", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    expect(client.getForm).toBeInstanceOf(Function);
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

  it("listResponses calls forms.responses.list with the formId", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    const formsApi = google.forms({ version: "v1" });
    vi.mocked(formsApi.forms.responses.list).mockResolvedValue({
      data: { responses: [{ responseId: "r1" }] },
    } as never);

    const result = await client.listResponses("abc");

    expect(formsApi.forms.responses.list).toHaveBeenCalledWith({ formId: "abc" });
    expect(result).toEqual([{ responseId: "r1" }]);
  });

  it("listResponses returns empty array when no responses exist", async () => {
    const { createFormsClient } = await import("./client.js");
    const client = createFormsClient();

    const formsApi = google.forms({ version: "v1" });
    vi.mocked(formsApi.forms.responses.list).mockResolvedValue({
      data: { responses: undefined },
    } as never);

    const result = await client.listResponses("abc");

    expect(result).toEqual([]);
  });
});
