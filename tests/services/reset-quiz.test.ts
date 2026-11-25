import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChannelType } from "discord.js";
import { resetQuiz, discoverQuizTeamCategory, discoverTeamRoles } from "../../src/services/reset-quiz.js";

vi.mock("../../src/utils/logger.js", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

vi.mock("../../src/utils/quiz-date.js", () => ({
  getQuizDate: vi.fn(() => "2026-06-06"),
}));

const mockListTeams = vi.fn();
const mockDeleteTeam = vi.fn();
const mockDeleteAllAliases = vi.fn();
const mockDeleteAllMembers = vi.fn();
const mockGetQuiz = vi.fn();

vi.mock("../../src/integrations/firestore/teams.js", () => ({
  listTeams: (...args: unknown[]) => mockListTeams(...args),
  deleteTeam: (...args: unknown[]) => mockDeleteTeam(...args),
}));

vi.mock("../../src/integrations/firestore/aliases.js", () => ({
  deleteAllAliases: (...args: unknown[]) => mockDeleteAllAliases(...args),
}));

vi.mock("../../src/integrations/firestore/members.js", () => ({
  deleteAllMembers: (...args: unknown[]) => mockDeleteAllMembers(...args),
}));

vi.mock("../../src/integrations/firestore/quiz.js", () => ({
  getQuiz: (...args: unknown[]) => mockGetQuiz(...args),
}));

function mockChannel(id: string, name: string) {
  return { id, name, delete: vi.fn() };
}

function mockRole(id: string, name: string) {
  return { id, name, delete: vi.fn() };
}

function mockMember(id: string, roleIds: string[]) {
  const roleCache = new Map(roleIds.map((rid) => [rid, { id: rid }]));
  return {
    id,
    roles: {
      cache: { has: (rid: string) => roleCache.has(rid) },
      remove: vi.fn(),
    },
  };
}

function mockGuild(options: {
  channels?: Array<ReturnType<typeof mockChannel>>;
  categoryChildren?: Array<ReturnType<typeof mockChannel>>;
  roles?: Array<ReturnType<typeof mockRole>>;
  members?: Array<ReturnType<typeof mockMember>>;
}) {
  const categoryChildren = new Map((options.categoryChildren ?? []).map((c) => [c.id, c]));
  const category = options.categoryChildren
    ? { id: "cat-1", name: "QUIZ TEAMS", type: ChannelType.GuildCategory, children: { cache: categoryChildren } }
    : null;

  const allChannels = [...(options.channels ?? [])];
  if (category) allChannels.push(category as any);

  const channelCache = new Map(allChannels.map((c) => [c.id, c]));
  const roleCache = new Map((options.roles ?? []).map((r) => [r.id, r]));
  const memberCache = new Map((options.members ?? []).map((m) => [m.id, m]));

  return {
    roles: {
      cache: {
        find: (fn: (r: any) => boolean) => [...roleCache.values()].find(fn),
        filter: (fn: (r: any) => boolean) => {
          const matches = [...roleCache.values()].filter(fn);
          return { toJSON: () => matches };
        },
      },
    },
    channels: {
      cache: {
        find: (fn: (c: any) => boolean) => [...channelCache.values()].find(fn),
      },
    },
    members: {
      fetch: vi.fn(),
      cache: {
        filter: (fn: (m: any) => boolean) => new Map([...memberCache.entries()].filter(([, m]) => fn(m))),
      },
    },
  } as any;
}

describe("discoverQuizTeamCategory", () => {
  it("finds the QUIZ TEAMS category", () => {
    const guild = mockGuild({
      categoryChildren: [mockChannel("c1", "the-foxes")],
    });
    const category = discoverQuizTeamCategory(guild);
    expect(category).not.toBeNull();
    expect(category!.name).toBe("QUIZ TEAMS");
  });

  it("returns null when no category exists", () => {
    const guild = mockGuild({});
    expect(discoverQuizTeamCategory(guild)).toBeNull();
  });
});

describe("discoverTeamRoles", () => {
  it("finds Team: prefixed roles", () => {
    const guild = mockGuild({
      roles: [
        mockRole("r1", "Team: The Foxes"),
        mockRole("r2", "Team: Quiz Masters"),
        mockRole("r3", "Admin"),
      ],
    });
    const roles = discoverTeamRoles(guild);
    expect(roles).toHaveLength(2);
  });
});

describe("resetQuiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetQuiz.mockResolvedValue({ ok: true, data: { status: "active" } });
    mockListTeams.mockResolvedValue({ ok: true, data: [] });
    mockDeleteTeam.mockResolvedValue({ ok: true, data: undefined });
    mockDeleteAllAliases.mockResolvedValue({ ok: true, data: undefined });
    mockDeleteAllMembers.mockResolvedValue({ ok: true, data: undefined });
  });

  it("deletes channels from QUIZ TEAMS category", async () => {
    const ch1 = mockChannel("c1", "the-foxes");
    const ch2 = mockChannel("c2", "quiz-masters");
    const guild = mockGuild({ categoryChildren: [ch1, ch2], roles: [] });

    const result = await resetQuiz({ db: "mock-db" as any, guildId: "guild-1", guild });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.channelsDeleted).toBe(2);
    expect(ch1.delete).toHaveBeenCalled();
    expect(ch2.delete).toHaveBeenCalled();
  });

  it("deletes Team: roles", async () => {
    const r1 = mockRole("r1", "Team: The Foxes");
    const r2 = mockRole("r2", "Team: Quiz Masters");
    const guild = mockGuild({ roles: [r1, r2] });

    const result = await resetQuiz({ db: "mock-db" as any, guildId: "guild-1", guild });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.rolesDeleted).toBe(2);
    expect(r1.delete).toHaveBeenCalled();
    expect(r2.delete).toHaveBeenCalled();
  });

  it("clears Team Captain role assignments", async () => {
    const captainRole = mockRole("captain-id", "Team Captain");
    const member1 = mockMember("m1", ["captain-id"]);
    const guild = mockGuild({ roles: [captainRole], members: [member1] });

    const result = await resetQuiz({ db: "mock-db" as any, guildId: "guild-1", guild });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.captainRolesCleared).toBe(1);
    expect(member1.roles.remove).toHaveBeenCalledWith(captainRole);
  });

  it("clears Teams role assignments", async () => {
    const teamsRole = mockRole("teams-id", "Teams");
    const member1 = mockMember("m1", ["teams-id"]);
    const member2 = mockMember("m2", ["teams-id"]);
    const guild = mockGuild({ roles: [teamsRole], members: [member1, member2] });

    const result = await resetQuiz({ db: "mock-db" as any, guildId: "guild-1", guild });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.teamsRolesCleared).toBe(2);
  });

  it("does best-effort Firestore cleanup for active quiz", async () => {
    mockListTeams.mockResolvedValue({
      ok: true,
      data: [{ name: "The Foxes" }, { name: "Quiz Masters" }],
    });
    const guild = mockGuild({ roles: [] });

    const result = await resetQuiz({ db: "mock-db" as any, guildId: "guild-1", guild });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.firestoreTeamsDeleted).toBe(2);
      expect(result.data.firestoreAliasesDeleted).toBe(true);
      expect(result.data.firestoreMembersDeleted).toBe(true);
    }
    expect(mockDeleteTeam).toHaveBeenCalledTimes(2);
    expect(mockDeleteAllAliases).toHaveBeenCalled();
    expect(mockDeleteAllMembers).toHaveBeenCalled();
  });

  it("skips Firestore cleanup when quiz is ended", async () => {
    mockGetQuiz.mockResolvedValue({ ok: true, data: { status: "ended" } });
    const guild = mockGuild({ roles: [] });

    const result = await resetQuiz({ db: "mock-db" as any, guildId: "guild-1", guild });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.firestoreTeamsDeleted).toBe(0);
      expect(result.data.firestoreAliasesDeleted).toBe(false);
    }
    expect(mockDeleteTeam).not.toHaveBeenCalled();
  });

  it("skips Firestore cleanup when no quiz session exists", async () => {
    mockGetQuiz.mockResolvedValue({ ok: false, error: "not found" });
    const guild = mockGuild({ roles: [] });

    const result = await resetQuiz({ db: "mock-db" as any, guildId: "guild-1", guild });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.firestoreTeamsDeleted).toBe(0);
  });

  it("continues when channel.delete() throws", async () => {
    const failCh = mockChannel("c1", "broken");
    failCh.delete.mockRejectedValue(new Error("Missing perms"));
    const guild = mockGuild({ categoryChildren: [failCh], roles: [] });

    const result = await resetQuiz({ db: "mock-db" as any, guildId: "guild-1", guild });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.channelsDeleted).toBe(0);
  });

  it("continues when role.delete() throws", async () => {
    const failRole = mockRole("r1", "Team: Broken");
    failRole.delete.mockRejectedValue(new Error("Missing perms"));
    const guild = mockGuild({ roles: [failRole] });

    const result = await resetQuiz({ db: "mock-db" as any, guildId: "guild-1", guild });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.rolesDeleted).toBe(0);
  });
});
