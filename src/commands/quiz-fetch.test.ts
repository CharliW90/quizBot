import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../integrations/forms/client.js", () => ({
  createFormsClient: vi.fn(() => "mock-forms-client"),
}));

vi.mock("../services/fetch-round.js", () => ({
  fetchRound: vi.fn(),
}));

vi.mock("../integrations/firestore/guild-config.js", () => ({
  getFormIds: vi.fn(),
}));

import { fetchRound } from "../services/fetch-round.js";
import { getFormIds } from "../integrations/firestore/guild-config.js";
import command from "./quiz-fetch.js";

const mockFetchRound = vi.mocked(fetchRound);
const mockGetFormIds = vi.mocked(getFormIds);

function mockInteraction(round: number) {
  return {
    guild: { id: "guild-1" },
    guildId: "guild-1",
    options: {
      getInteger: vi.fn((name: string) => {
        if (name === "round") return round;
        return null;
      }),
    },
    deferReply: vi.fn(),
    editReply: vi.fn(),
    reply: vi.fn(),
  } as any;
}

function mockAutocompleteInteraction(focused: string) {
  return {
    guildId: "guild-1",
    options: {
      getFocused: vi.fn(() => focused),
    },
    respond: vi.fn(),
  } as any;
}

describe("/quiz fetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("defers reply then reports success with team count", async () => {
      mockFetchRound.mockResolvedValue({
        ok: true,
        data: {
          roundNumber: 1,
          formId: "form-abc",
          responses: {
            "The Foxes": { answers: [], score: 5 },
            "Quiz Masters": { answers: [], score: 3 },
          },
          fetchedAt: "2026-06-06T19:00:00Z",
          publishedAt: null,
          history: [],
        },
      });

      const interaction = mockInteraction(1);
      await command.execute(interaction);

      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
      expect(interaction.editReply).toHaveBeenCalled();
      const editCall = interaction.editReply.mock.calls[0][0];
      const description = editCall.embeds[0].data.description;
      expect(description).toContain("2");
      expect(description).toContain("Round 1");
    });

    it("reports error from fetchRound", async () => {
      mockFetchRound.mockResolvedValue({
        ok: false,
        error: "Form is still accepting responses - close it before fetching",
      });

      const interaction = mockInteraction(1);
      await command.execute(interaction);

      expect(interaction.deferReply).toHaveBeenCalled();
      const editCall = interaction.editReply.mock.calls[0][0];
      const title = editCall.embeds[0].data.title;
      expect(title).toContain("Error");
    });

    it("rejects when used outside a guild", async () => {
      const interaction = {
        guild: null,
        options: { getInteger: vi.fn(() => 1) },
        deferReply: vi.fn(),
        editReply: vi.fn(),
        reply: vi.fn(),
      } as any;

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining("server") })
      );
      expect(mockFetchRound).not.toHaveBeenCalled();
    });
  });

  describe("autocomplete", () => {
    it("suggests configured rounds", async () => {
      mockGetFormIds.mockResolvedValue({
        ok: true,
        data: { "1": "form-a", "2": "form-b", "3": "form-c" },
      });

      const interaction = mockAutocompleteInteraction("");
      await command.autocomplete!(interaction);

      const response = interaction.respond.mock.calls[0][0];
      expect(response).toHaveLength(3);
      expect(response[0]).toEqual({ name: "Round 1", value: 1 });
    });

    it("filters by typed input", async () => {
      mockGetFormIds.mockResolvedValue({
        ok: true,
        data: { "1": "form-a", "2": "form-b", "3": "form-c" },
      });

      const interaction = mockAutocompleteInteraction("3");
      await command.autocomplete!(interaction);

      const response = interaction.respond.mock.calls[0][0];
      expect(response).toHaveLength(1);
      expect(response[0].value).toBe(3);
    });

    it("returns empty on failure", async () => {
      mockGetFormIds.mockResolvedValue({ ok: false, error: "nope" });

      const interaction = mockAutocompleteInteraction("");
      await command.autocomplete!(interaction);

      expect(interaction.respond).toHaveBeenCalledWith([]);
    });
  });
});
