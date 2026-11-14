import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetQuiz } from "./reset-quiz.js";

const mockListTeams = vi.fn();
const mockDeleteTeam = vi.fn();

vi.mock("../integrations/firestore/teams.js", () => ({
  listTeams: (...args: unknown[]) => mockListTeams(...args),
  deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args),
}));

function mockGuild(options: {
  roles: Array<{ id: string; name: string; delete: ReturnType<typeof vi.fn> }>;
  channels: Array<{ id: string; name: string; delete: ReturnType<typeof vi.fn> }>;
}) {
  const roleCache = new Map(options.roles.map((r) => [r.id, r]));
  const channelCache = new Map(options.channels.map((c) => [c.id, c]));

  return {
    roles: { cache: roleCache },
    channels: { cache: channelCache },
  } as any;
}

describe("resetQuiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes team roles, channels, and Firestore docs", async () => {
    const role1 = { id: "r1", name: "Team: The Foxes", delete: vi.fn() };
    const role2 = { id: "r2", name: "Team: Quiz Masters", delete: vi.fn() };
    const ch1 = { id: "c1", name: "the-foxes", delete: vi.fn() };
    const ch2 = { id: "c2", name: "quiz-masters", delete: vi.fn() };

    mockListTeams.mockResolvedValue({
      ok: true,
      data: [
        { name: "The Foxes", textChannelId: "c1", voiceChannelId: "v1", roleId: "r1" },
        { name: "Quiz Masters", textChannelId: "c2", voiceChannelId: "v2", roleId: "r2" },
      ],
    });
    mockDeleteTeam.mockResolvedValue({ ok: true, data: undefined });

    const guild = mockGuild({
      roles: [role1, role2],
      channels: [ch1, ch2],
    });

    const result = await resetQuiz({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      guild,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rolesDeleted).toBe(2);
      expect(result.data.channelsDeleted).toBe(2);
      expect(result.data.teamsDeleted).toBe(2);
    }
    expect(role1.delete).toHaveBeenCalled();
    expect(role2.delete).toHaveBeenCalled();
    expect(ch1.delete).toHaveBeenCalled();
    expect(ch2.delete).toHaveBeenCalled();
    expect(mockDeleteTeam).toHaveBeenCalledTimes(2);
  });

  it("continues when a role or channel has already been deleted", async () => {
    mockListTeams.mockResolvedValue({
      ok: true,
      data: [
        { name: "The Foxes", textChannelId: "c1", voiceChannelId: "v1", roleId: "r1" },
      ],
    });
    mockDeleteTeam.mockResolvedValue({ ok: true, data: undefined });

    const guild = mockGuild({ roles: [], channels: [] });

    const result = await resetQuiz({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      guild,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.rolesDeleted).toBe(0);
      expect(result.data.channelsDeleted).toBe(0);
      expect(result.data.teamsDeleted).toBe(1);
    }
  });

  it("returns error when listTeams fails", async () => {
    mockListTeams.mockResolvedValue({ ok: false, error: "db error" });

    const guild = mockGuild({ roles: [], channels: [] });

    const result = await resetQuiz({
      db: "mock-db" as any,
      guildId: "guild-1",
      quizDate: "2026-06-06",
      guild,
    });

    expect(result.ok).toBe(false);
  });
});
