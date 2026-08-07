import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../integrations/firestore/client.js", () => ({
  getDb: vi.fn(() => "mock-db"),
}));

vi.mock("../services/correct-team-name.js", () => ({
  correctTeamName: vi.fn(),
}));

vi.mock("../integrations/firestore/rounds.js", () => ({
  listRounds: vi.fn(),
}));

vi.mock("../integrations/firestore/teams.js", () => ({
  listTeams: vi.fn(),
}));

import { correctTeamName } from "../services/correct-team-name.js";
import { listRounds } from "../integrations/firestore/rounds.js";
import { listTeams } from "../integrations/firestore/teams.js";
import command from "./quiz-correct.js";

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
        })
      );
      const replyCall = interaction.reply.mock.calls[0][0];
      expect(replyCall.embeds[0].data.description).toContain("3");
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
          { name: "The Foxes", captain: "", members: [], roleId: "", textChannelId: "", voiceChannelId: "", color: "" },
          { name: "Piston Broke", captain: "", members: [], roleId: "", textChannelId: "", voiceChannelId: "", color: "" },
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
          { name: "The Foxes", captain: "", members: [], roleId: "", textChannelId: "", voiceChannelId: "", color: "" },
          { name: "Piston Broke", captain: "", members: [], roleId: "", textChannelId: "", voiceChannelId: "", color: "" },
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
  });
});
