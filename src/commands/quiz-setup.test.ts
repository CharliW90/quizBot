import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../integrations/firestore/guild-config.js", () => ({
  getFormIds: vi.fn(),
  setFormId: vi.fn(),
}));

import { getFormIds, setFormId } from "../integrations/firestore/guild-config.js";
import command from "./quiz-setup.js";

const mockGetFormIds = vi.mocked(getFormIds);
const mockSetFormId = vi.mocked(setFormId);

function mockInteraction(options: { round: number; form_id: string }) {
  return {
    guild: { id: "guild-1" },
    guildId: "guild-1",
    options: {
      getInteger: vi.fn((name: string) => {
        if (name === "round") return options.round;
        return null;
      }),
      getString: vi.fn((name: string) => {
        if (name === "form_id") return options.form_id;
        return null;
      }),
    },
    reply: vi.fn(),
  } as any;
}

function mockAutocompleteInteraction(focused: string, guildId = "guild-1") {
  return {
    guild: { id: guildId },
    guildId,
    options: {
      getFocused: vi.fn(() => focused),
    },
    respond: vi.fn(),
  } as any;
}

describe("/quiz setup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("stores a form ID and replies with success", async () => {
      mockSetFormId.mockResolvedValue({
        ok: true,
        data: { overwritten: false, previousFormId: null },
      });

      const interaction = mockInteraction({ round: 1, form_id: "form-abc" });
      await command.execute(interaction);

      expect(mockSetFormId).toHaveBeenCalledWith("mock-db", "guild-1", 1, "form-abc");
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true })
      );
    });

    it("includes overwrite info when replacing an existing form ID", async () => {
      mockSetFormId.mockResolvedValue({
        ok: true,
        data: { overwritten: true, previousFormId: "form-old" },
      });

      const interaction = mockInteraction({ round: 2, form_id: "form-new" });
      await command.execute(interaction);

      const replyCall = interaction.reply.mock.calls[0][0];
      const embedDescription = replyCall.embeds[0].data.description;
      expect(embedDescription).toContain("overwritten");
    });

    it("replies with error when setFormId fails", async () => {
      mockSetFormId.mockResolvedValue({
        ok: false,
        error: "Cannot skip rounds - next available round is 2",
      });

      const interaction = mockInteraction({ round: 5, form_id: "form-abc" });
      await command.execute(interaction);

      const replyCall = interaction.reply.mock.calls[0][0];
      const embedTitle = replyCall.embeds[0].data.title;
      expect(embedTitle).toContain("Error");
    });

    it("rejects when used outside a guild", async () => {
      const interaction = {
        guild: null,
        options: {
          getInteger: vi.fn(() => 1),
          getString: vi.fn(() => "form-abc"),
        },
        reply: vi.fn(),
      } as any;

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ content: expect.stringContaining("server") })
      );
      expect(mockSetFormId).not.toHaveBeenCalled();
    });
  });

  describe("autocomplete", () => {
    it("suggests the next round number when no forms exist", async () => {
      mockGetFormIds.mockResolvedValue({ ok: true, data: {} });

      const interaction = mockAutocompleteInteraction("");
      await command.autocomplete!(interaction);

      expect(interaction.respond).toHaveBeenCalledWith([
        { name: "Round 1 (next)", value: 1 },
      ]);
    });

    it("suggests existing rounds plus the next available", async () => {
      mockGetFormIds.mockResolvedValue({
        ok: true,
        data: { "1": "form-a", "2": "form-b" },
      });

      const interaction = mockAutocompleteInteraction("");
      await command.autocomplete!(interaction);

      const response = interaction.respond.mock.calls[0][0];
      expect(response).toContainEqual({ name: "Round 1 (overwrite)", value: 1 });
      expect(response).toContainEqual({ name: "Round 2 (overwrite)", value: 2 });
      expect(response).toContainEqual({ name: "Round 3 (next)", value: 3 });
    });

    it("filters suggestions based on typed input", async () => {
      mockGetFormIds.mockResolvedValue({
        ok: true,
        data: { "1": "form-a", "2": "form-b", "3": "form-c" },
      });

      const interaction = mockAutocompleteInteraction("2");
      await command.autocomplete!(interaction);

      const response = interaction.respond.mock.calls[0][0];
      expect(response).toHaveLength(1);
      expect(response[0].value).toBe(2);
    });

    it("returns empty array on getFormIds failure", async () => {
      mockGetFormIds.mockResolvedValue({ ok: false, error: "db error" });

      const interaction = mockAutocompleteInteraction("");
      await command.autocomplete!(interaction);

      expect(interaction.respond).toHaveBeenCalledWith([]);
    });
  });
});
