import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../../src/services/correct-team-name.js", () => ({
  correctTeamName: vi.fn(),
}));

vi.mock("../../src/integrations/firestore/rounds.js", () => ({
  listRounds: vi.fn(),
}));

vi.mock("../../src/integrations/firestore/teams.js", () => ({
  listTeams: vi.fn(),
}));

import { correctTeamName } from "../../src/services/correct-team-name.js";
import { listRounds } from "../../src/integrations/firestore/rounds.js";
import { listTeams } from "../../src/integrations/firestore/teams.js";
import command from "../../src/commands/quiz-correct.js";

const mockCorrectTeamName = vi.mocked(correctTeamName);
const mockListRounds = vi.mocked(listRounds);
const mockListTeams = vi.mocked(listTeams);

function mockInteraction(options: { incorrect: string; correct: string }) {
  return {
    guild: { id: "guild-1" },
    guildId: "guild-1",
    options: {
      getString: vi.fn((name: string) => {
        if (name === "incorrect") return options.incorrect;
        if (name === "correct") return options.correct;
        return null;
      }),
    },
    reply: vi.fn(),
  } as any;
}

describe("/quiz correct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("execute", () => {
    it("corrects team name and replies with count", async () => {
      mockCorrectTeamName.mockResolvedValue({
        ok: true,
        data: { roundsCorrected: 3 },
      });

      const interaction = mockInteraction({ incorrect: "PIston Broke", correct: "Piston Broke" });
      await command.execute(interaction);

      expect(mockCorrectTeamName).toHaveBeenCalledWith(
        expect.objectContaining({
          incorrectName: "PIston Broke",
          correctName: "Piston Broke",
        }),
      );
      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.description).toContain("3");
    });

    it("uses singular grammar for 1 round corrected", async () => {
      mockCorrectTeamName.mockResolvedValue({
        ok: true,
        data: { roundsCorrected: 1 },
      });

      const interaction = mockInteraction({ incorrect: "Typo", correct: "Fixed" });
      await command.execute(interaction);

      const replyCall = interaction.reply.mock.calls[0][0];
      const desc = replyCall.embeds[0].data.description;
      expect(desc).toContain("1 round.");
      expect(desc).not.toContain("rounds.");
    });

    it("replies with error on failure", async () => {
      mockCorrectTeamName.mockResolvedValue({
        ok: false,
        error: '"Nope" not found in any round',
      });

      const interaction = mockInteraction({ incorrect: "Nope", correct: "Whatever" });
      await command.execute(interaction);

      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.title).toContain("Error");
    });
  });

  describe("autocomplete", () => {
    it("suggests unmatched form names for 'incorrect' field", async () => {
      mockListRounds.mockResolvedValue({
        ok: true,
        data: [
          {
            roundNumber: 1,
            formId: "f1",
            responses: {
              "The Foxes": { answers: [], score: 5 },
              "PIston Broke": { answers: [], score: 3 },
            },
            fetchedAt: "2026-06-06T19:00:00Z",
            publishedAt: null,
            history: [],
          },
        ],
      });
      mockListTeams.mockResolvedValue({
        ok: true,
        data: [
          {
            name: "The Foxes",
            captain: "",
            members: [],
            roleId: "",
            textChannelId: "",
            voiceChannelId: "",
            color: "",
          },
          {
            name: "Piston Broke",
            captain: "",
            members: [],
            roleId: "",
            textChannelId: "",
            voiceChannelId: "",
            color: "",
          },
        ],
      });

      const interaction = {
        guildId: "guild-1",
        options: {
          getFocused: vi.fn(() => ({ name: "incorrect", value: "" })),
        },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      const response = interaction.respond.mock.calls[0][0];
      expect(response).toHaveLength(1);
      expect(response[0].value).toBe("PIston Broke");
    });

    it("suggests registered team names for 'correct' field", async () => {
      mockListRounds.mockResolvedValue({ ok: true, data: [] });
      mockListTeams.mockResolvedValue({
        ok: true,
        data: [
          {
            name: "The Foxes",
            captain: "",
            members: [],
            roleId: "",
            textChannelId: "",
            voiceChannelId: "",
            color: "",
          },
          {
            name: "Piston Broke",
            captain: "",
            members: [],
            roleId: "",
            textChannelId: "",
            voiceChannelId: "",
            color: "",
          },
        ],
      });

      const interaction = {
        guildId: "guild-1",
        options: {
          getFocused: vi.fn(() => ({ name: "correct", value: "" })),
        },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      const response = interaction.respond.mock.calls[0][0];
      expect(response).toHaveLength(2);
      expect(response.map((r: any) => r.value)).toContain("The Foxes");
      expect(response.map((r: any) => r.value)).toContain("Piston Broke");
    });

    it("falls back to empty set when teamsResult fails while building incorrect suggestions", async () => {
      mockListRounds.mockResolvedValue({
        ok: true,
        data: [
          {
            roundNumber: 1,
            formId: "f1",
            responses: { "Team A": { answers: [], score: 5 } },
            fetchedAt: "2026-06-06T19:00:00Z",
            publishedAt: null,
            history: [],
          },
        ],
      });
      mockListTeams.mockResolvedValue({ ok: false, error: "Firestore error" });

      const interaction = {
        guildId: "guild-1",
        options: {
          getFocused: vi.fn(() => ({ name: "incorrect", value: "" })),
        },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      const response = interaction.respond.mock.calls[0][0];
      expect(response).toHaveLength(1);
      expect(response[0].value).toBe("Team A");
    });

    it("responds with empty list when roundsResult fails for 'incorrect' field", async () => {
      mockListRounds.mockResolvedValue({ ok: false, error: "Firestore error" });
      mockListTeams.mockResolvedValue({ ok: true, data: [] });

      const interaction = {
        guildId: "guild-1",
        options: {
          getFocused: vi.fn(() => ({ name: "incorrect", value: "" })),
        },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      expect(interaction.respond).toHaveBeenCalledWith([]);
    });

    it("responds with empty list when teamsResult fails for 'correct' field", async () => {
      mockListTeams.mockResolvedValue({ ok: false, error: "Firestore error" });

      const interaction = {
        guildId: "guild-1",
        options: {
          getFocused: vi.fn(() => ({ name: "correct", value: "" })),
        },
        respond: vi.fn(),
      } as any;

      await command.autocomplete!(interaction);

      expect(interaction.respond).toHaveBeenCalledWith([]);
    });
  });

  it("replies with server-only message when guild is null", async () => {
    const interaction = mockInteraction({ incorrect: "Nope", correct: "Whatever" });
    interaction.guild = null;

    await command.execute(interaction);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ content: "This command can only be used in a server." }),
    );
    expect(mockCorrectTeamName).not.toHaveBeenCalled();
  });
});
