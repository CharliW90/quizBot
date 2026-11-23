import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageFlags } from "discord.js";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../../src/services/send-round.js", () => ({
  sendRound: vi.fn(),
}));

vi.mock("../../src/integrations/firestore/rounds.js", () => ({
  listRounds: vi.fn(),
}));

import { sendRound } from "../../src/services/send-round.js";
import { listRounds } from "../../src/integrations/firestore/rounds.js";
import command from "../../src/commands/quiz-send.js";

const mockSendRound = vi.mocked(sendRound);
const mockListRounds = vi.mocked(listRounds);

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

describe("/quiz send", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("sends round and reports successes", async () => {
      mockSendRound.mockResolvedValue({
        ok: true,
        data: {
          successes: [
            { teamName: "The Foxes", formName: "The Foxes" },
            { teamName: "Quiz Masters", formName: "Quiz Masters" },
          ],
          failures: [],
        },
      });

      const interaction = mockInteraction(1);
      await command.execute(interaction);

      expect(interaction.deferReply).toHaveBeenCalledWith({ flags: MessageFlags.Ephemeral });
      const editCall = interaction.editReply.mock.calls[0][0];
      const fields = editCall.embeds[0].data.fields;
      expect(fields[0].value).toContain("The Foxes");
      expect(fields[0].value).toContain("Quiz Masters");
    });

    it("reports both successes and failures clearly", async () => {
      mockSendRound.mockResolvedValue({
        ok: true,
        data: {
          successes: [{ teamName: "The Foxes", formName: "The Foxes" }],
          failures: [
            {
              teamName: "Quiz Masters",
              reason: "Text channel no longer exists or bot cannot access it",
            },
          ],
        },
      });

      const interaction = mockInteraction(1);
      await command.execute(interaction);

      const editCall = interaction.editReply.mock.calls[0][0];
      const embed = editCall.embeds[0].data;
      const fields = embed.fields;
      expect(fields).toHaveLength(2);
      expect(fields[0].value).toContain("The Foxes");
      expect(fields[1].value).toContain("Quiz Masters");
      expect(fields[1].value).toContain("channel");
    });

    it("reports error when sendRound fails", async () => {
      mockSendRound.mockResolvedValue({
        ok: false,
        error: "Round 5 not found",
      });

      const interaction = mockInteraction(5);
      await command.execute(interaction);

      const editCall = interaction.editReply.mock.calls[0][0];
      expect(editCall.embeds[0].data.title).toContain("Error");
    });

    it("replies with server-only message when guild is null", async () => {
      const interaction = mockInteraction(1);
      interaction.guild = null;

      await command.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ content: "This command can only be used in a server." }),
      );
      expect(mockSendRound).not.toHaveBeenCalled();
    });

    it("uses red embed colour when all sends fail", async () => {
      mockSendRound.mockResolvedValue({
        ok: true,
        data: {
          successes: [],
          failures: [{ teamName: "The Foxes", reason: "Channel missing" }],
        },
      });

      const interaction = mockInteraction(1);
      await command.execute(interaction);

      const embed = interaction.editReply.mock.calls[0][0].embeds[0];
      expect(embed.data.color).toBe(0xe74c3c);
    });

    it("uses orange embed colour for mixed results", async () => {
      mockSendRound.mockResolvedValue({
        ok: true,
        data: {
          successes: [{ teamName: "The Foxes", formName: "The Foxes" }],
          failures: [{ teamName: "Quiz Masters", reason: "Channel missing" }],
        },
      });

      const interaction = mockInteraction(1);
      await command.execute(interaction);

      const embed = interaction.editReply.mock.calls[0][0].embeds[0];
      expect(embed.data.color).toBe(0xf39c12);
    });

    it("shows no-responses message when both successes and failures are empty", async () => {
      mockSendRound.mockResolvedValue({
        ok: true,
        data: { successes: [], failures: [] },
      });

      const interaction = mockInteraction(1);
      await command.execute(interaction);

      const editCall = interaction.editReply.mock.calls[0][0];
      expect(editCall.embeds[0].data.description).toContain("No team responses");
    });
  });

  describe("autocomplete", () => {
    it("responds with empty list when listRounds fails", async () => {
      mockListRounds.mockResolvedValue({ ok: false, error: "Firestore error" });

      const interaction = {
        guildId: "guild-1",
        options: { getFocused: vi.fn(() => "") },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      expect(interaction.respond).toHaveBeenCalledWith([]);
    });

    it("filters rounds by typed input", async () => {
      mockListRounds.mockResolvedValue({
        ok: true,
        data: [
          { roundNumber: 1, formId: "f1", responses: {}, fetchedAt: "", publishedAt: null, history: [] },
          { roundNumber: 2, formId: "f2", responses: {}, fetchedAt: "", publishedAt: null, history: [] },
          { roundNumber: 12, formId: "f12", responses: {}, fetchedAt: "", publishedAt: null, history: [] },
        ],
      });

      const interaction = {
        guildId: "guild-1",
        options: { getFocused: vi.fn(() => "1") },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      const response = interaction.respond.mock.calls[0][0];
      expect(response).toHaveLength(2);
      expect(response.map((r: any) => r.value)).toEqual([1, 12]);
    });

    it("suggests fetched rounds", async () => {
      mockListRounds.mockResolvedValue({
        ok: true,
        data: [
          {
            roundNumber: 1,
            formId: "f1",
            responses: {},
            fetchedAt: "",
            publishedAt: null,
            history: [],
          },
          {
            roundNumber: 2,
            formId: "f2",
            responses: {},
            fetchedAt: "",
            publishedAt: "2026-06-06",
            history: [],
          },
        ],
      });

      const interaction = {
        guildId: "guild-1",
        options: { getFocused: vi.fn(() => "") },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      const response = interaction.respond.mock.calls[0][0];
      expect(response).toHaveLength(2);
      expect(response[0].name).toContain("Round 1");
      expect(response[1].name).toContain("Round 2");
      expect(response[1].name).toContain("sent");
    });
  });
});
