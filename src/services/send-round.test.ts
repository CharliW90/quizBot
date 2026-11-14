import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendRound } from "./send-round.js";
import type { RoundData } from "../integrations/firestore/rounds.js";
import type { Team } from "../integrations/firestore/teams.js";

const mockGetRound = vi.fn();
const mockGetAliases = vi.fn();
const mockListTeams = vi.fn();
const mockPublishRound = vi.fn();

vi.mock("../integrations/firestore/rounds.js", () => ({
  getRound: (...args: unknown[]) => mockGetRound(...args),
  publishRound: (...args: unknown[]) => mockPublishRound(...args),
}));

vi.mock("../integrations/firestore/aliases.js", () => ({
  getAliases: (...args: unknown[]) => mockGetAliases(...args),
}));

vi.mock("../integrations/firestore/teams.js", () => ({
  listTeams: (...args: unknown[]) => mockListTeams(...args),
}));

const roundData: RoundData = {
  roundNumber: 1,
  formId: "form-abc",
  responses: {
    "The Foxes": { answers: [{ answer: "Paris", score: 2, correct: true }], score: 2 },
    "Quiz Masters": { answers: [{ answer: "Nope", score: 0, correct: false }], score: 0 },
  },
  fetchedAt: "2026-06-06T19:00:00Z",
  publishedAt: null,
  history: [],
};

const teams: Team[] = [
  {
    name: "The Foxes",
    captain: "user-1",
    members: ["user-1", "user-2"],
    roleId: "role-1",
    textChannelId: "channel-1",
    voiceChannelId: "voice-1",
    color: "#ff0000",
  },
  {
    name: "Quiz Masters",
    captain: "user-3",
    members: ["user-3", "user-4"],
    roleId: "role-2",
    textChannelId: "channel-2",
    voiceChannelId: "voice-2",
    color: "#00ff00",
  },
];

function mockGuild(channels: Record<string, { send: ReturnType<typeof vi.fn> } | null>) {
  return {
    channels: {
      fetch: vi.fn(async (id: string) => {
        const ch = channels[id];
        if (ch === null) throw new Error("Unknown Channel");
        if (ch === undefined) throw new Error("Unknown Channel");
        return ch;
      }),
    },
  } as any;
}

describe("sendRound", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends embeds to each team channel and marks round published", async () => {
    mockGetRound.mockResolvedValue({ ok: true, data: roundData });
    mockGetAliases.mockResolvedValue({ ok: true, data: {} });
    mockListTeams.mockResolvedValue({ ok: true, data: teams });
    mockPublishRound.mockResolvedValue({ ok: true, data: undefined });

    const ch1 = { send: vi.fn() };
    const ch2 = { send: vi.fn() };
    const guild = mockGuild({ "channel-1": ch1, "channel-2": ch2 });

    const result = await sendRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 1,
      guild,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.successes).toHaveLength(2);
      expect(result.data.failures).toHaveLength(0);
    }
    expect(ch1.send).toHaveBeenCalled();
    expect(ch2.send).toHaveBeenCalled();
    expect(mockPublishRound).toHaveBeenCalled();
  });

  it("resolves team names through aliases", async () => {
    const aliasedRound: RoundData = {
      ...roundData,
      responses: {
        "teh foxes": { answers: [{ answer: "Paris", score: 2, correct: true }], score: 2 },
      },
    };

    mockGetRound.mockResolvedValue({ ok: true, data: aliasedRound });
    mockGetAliases.mockResolvedValue({ ok: true, data: { "teh foxes": "The Foxes" } });
    mockListTeams.mockResolvedValue({ ok: true, data: [teams[0]] });
    mockPublishRound.mockResolvedValue({ ok: true, data: undefined });

    const ch1 = { send: vi.fn() };
    const guild = mockGuild({ "channel-1": ch1 });

    const result = await sendRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 1,
      guild,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.successes).toContainEqual(
        expect.objectContaining({ teamName: "The Foxes" })
      );
    }
    expect(ch1.send).toHaveBeenCalled();
  });

  it("reports failure with reason when channel does not exist", async () => {
    mockGetRound.mockResolvedValue({ ok: true, data: roundData });
    mockGetAliases.mockResolvedValue({ ok: true, data: {} });
    mockListTeams.mockResolvedValue({ ok: true, data: teams });
    mockPublishRound.mockResolvedValue({ ok: true, data: undefined });

    const ch1 = { send: vi.fn() };
    const guild = mockGuild({ "channel-1": ch1, "channel-2": null });

    const result = await sendRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 1,
      guild,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.successes).toHaveLength(1);
      expect(result.data.failures).toHaveLength(1);
      expect(result.data.failures[0].teamName).toBe("Quiz Masters");
      expect(result.data.failures[0].reason).toContain("channel");
    }
  });

  it("reports failure when team not found in registered teams", async () => {
    mockGetRound.mockResolvedValue({ ok: true, data: roundData });
    mockGetAliases.mockResolvedValue({ ok: true, data: {} });
    mockListTeams.mockResolvedValue({ ok: true, data: [teams[0]] });
    mockPublishRound.mockResolvedValue({ ok: true, data: undefined });

    const ch1 = { send: vi.fn() };
    const guild = mockGuild({ "channel-1": ch1 });

    const result = await sendRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 1,
      guild,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.successes).toHaveLength(1);
      expect(result.data.failures).toHaveLength(1);
      expect(result.data.failures[0].teamName).toBe("Quiz Masters");
      expect(result.data.failures[0].reason).toContain("not registered");
    }
  });

  it("still marks published when some sends succeed", async () => {
    mockGetRound.mockResolvedValue({ ok: true, data: roundData });
    mockGetAliases.mockResolvedValue({ ok: true, data: {} });
    mockListTeams.mockResolvedValue({ ok: true, data: teams });
    mockPublishRound.mockResolvedValue({ ok: true, data: undefined });

    const ch1 = { send: vi.fn() };
    const guild = mockGuild({ "channel-1": ch1, "channel-2": null });

    await sendRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 1,
      guild,
    });

    expect(mockPublishRound).toHaveBeenCalled();
  });

  it("does not mark published when all sends fail", async () => {
    mockGetRound.mockResolvedValue({ ok: true, data: roundData });
    mockGetAliases.mockResolvedValue({ ok: true, data: {} });
    mockListTeams.mockResolvedValue({ ok: true, data: [] });
    mockPublishRound.mockResolvedValue({ ok: true, data: undefined });

    const guild = mockGuild({});

    const result = await sendRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 1,
      guild,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.successes).toHaveLength(0);
    }
    expect(mockPublishRound).not.toHaveBeenCalled();
  });

  it("returns error when round not found", async () => {
    mockGetRound.mockResolvedValue({ ok: false, error: "Round 5 not found" });

    const guild = mockGuild({});

    const result = await sendRound({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      roundNumber: 5,
      guild,
    });

    expect(result.ok).toBe(false);
  });
});
