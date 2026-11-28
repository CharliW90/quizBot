import { describe, it, expect, vi } from "vitest";
import { migrateGuild } from "../../../src/services/migrate/migrate-guild.js";

function mockFirestore(v3Data: Record<string, Record<string, unknown>>) {
  const store: Record<string, Record<string, unknown>> = {};

  const mockDoc = (path: string) => ({
    get: vi.fn(async () => {
      const data = v3Data[path];
      return { exists: !!data, data: () => data };
    }),
    set: vi.fn(async (_data: unknown) => {
      store[path] = _data as Record<string, unknown>;
    }),
  });

  const mockCollection = (path: string) => ({
    get: vi.fn(async () => {
      const prefix = path + "/";
      const docs = Object.keys(v3Data)
        .filter((k) => k.startsWith(prefix) && !k.slice(prefix.length).includes("/"))
        .map((k) => ({
          id: k.slice(prefix.length),
          data: () => v3Data[k],
          ref: { path: k },
        }));
      return { docs, empty: docs.length === 0 };
    }),
    doc: (id: string) => mockDoc(`${path}/${id}`),
  });

  return {
    db: {
      collection: vi.fn((path: string) => mockCollection(path)),
      doc: vi.fn((path: string) => mockDoc(path)),
    } as any,
    store,
  };
}

const GUILD_ID = "694967880252522557";
const QUIZ_DATE_1 = "2026-09-01";
const QUIZ_DATE_2 = "2026-09-08";
const OTHER_GUILD_ID = "111111111111111111";

const V3_TEAM_DOC = {
  teamName: "squam fam",
  captain: {
    userId: "563354282741727269",
    displayName: "Loerwyn",
  },
  members: [{ userId: "261269804801982465", displayName: "alice" }],
  channels: {
    textChannel: { id: "text-1" },
    voiceChannel: { id: "voice-1" },
  },
  roles: {
    teamRole: { id: "role-1", color: 15105570, createdTimestamp: 1788538397045 },
  },
  settledColour: 15105570,
  rounds: [],
  score: 0,
};

const V3_TEAM_DOC_2 = {
  teamName: "big brains",
  captain: {
    userId: "999999999999999999",
    displayName: "BrainBoss",
  },
  members: [{ userId: "888888888888888888", displayName: "smarty" }],
  channels: {
    textChannel: { id: "text-2" },
    voiceChannel: { id: "voice-2" },
  },
  roles: {
    teamRole: { id: "role-2", color: 3066993, createdTimestamp: 1788538400000 },
  },
  settledColour: 3066993,
  rounds: [],
  score: 0,
};

const V3_ROUND_DOC = {
  published: true,
  current: {
    teams: ["squam fam"],
    embeds: [
      {
        author: { name: "Round 1" },
        color: 0,
        fields: [
          { name: "Total Score", value: "18 / 20" },
          { name: "Question 1", value: "Paris :white_check_mark:" },
          { name: "Question 2", value: "Wrong :x:" },
        ],
      },
    ],
  },
  history: [],
};

const V3_ROUND_DOC_2 = {
  published: true,
  current: {
    teams: ["squam fam"],
    embeds: [
      {
        author: { name: "Round 2" },
        color: 0,
        fields: [
          { name: "Total Score", value: "10 / 10" },
          { name: "Question 1", value: "London :white_check_mark:" },
        ],
      },
    ],
  },
  history: [],
};

const V3_ALIASES = { "squam-fam": "squam fam" };
const V3_MEMBERS = { "563354282741727269": "squam fam", "261269804801982465": "squam fam" };
const V3_QUIZ = { date: "2026-09-01", ended: false };
const V3_QUIZ_2 = { date: "2026-09-08", ended: true };

const V3_USER_1 = { currentName: "Loerwyn", initialName: "Loerwyn", username: "loerwyn" };
const V3_USER_2 = { currentName: "alice", initialName: "Alice", username: "alice99" };

const V3_USER_1_GUILD = { usersTeams: ["squam fam"], serverName: "Quiz Server" };
const V3_USER_2_GUILD = { usersTeams: ["squam fam", "big brains"], serverName: "Quiz Server" };
const V3_USER_2_OTHER_GUILD = { usersTeams: ["outsiders"], serverName: "Other Server" };

function fullV3Data() {
  return {
    [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}`]: V3_QUIZ,
    [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}/Teams/squam fam`]: V3_TEAM_DOC,
    [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}/Rounds/Round 1`]: V3_ROUND_DOC,
    [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}/Maps/Teams Aliases`]: V3_ALIASES,
    [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}/Maps/Teams Members`]: V3_MEMBERS,
    [`Users/563354282741727269`]: V3_USER_1,
    [`Users/563354282741727269/Servers/${GUILD_ID}`]: V3_USER_1_GUILD,
    [`Users/261269804801982465`]: V3_USER_2,
    [`Users/261269804801982465/Servers/${GUILD_ID}`]: V3_USER_2_GUILD,
  };
}

describe("migrateGuild", () => {
  // --- Quiz migration ---

  it("migrates all quiz dates found under Servers/{guildId}/Quizzes/", async () => {
    const { db, store } = mockFirestore({
      ...fullV3Data(),
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}`]: V3_QUIZ_2,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}/Teams/big brains`]: V3_TEAM_DOC_2,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}/Rounds/Round 1`]: V3_ROUND_DOC,
    });

    const result = await migrateGuild(db, GUILD_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.quizzesMigrated).toBe(2);

    // Both V4 quiz docs were written
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}`]).toBeDefined();
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_2}`]).toBeDefined();
  });

  it("writes V4 quiz doc with correct status and createdAt", async () => {
    const { db, store } = mockFirestore(fullV3Data());

    await migrateGuild(db, GUILD_ID);

    const quizDoc = store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}`];
    expect(quizDoc).toEqual({ status: "active", createdAt: "migrated" });
  });

  it("sets ended quiz status correctly", async () => {
    const data = fullV3Data();
    data[`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}`] = { ...V3_QUIZ, ended: true };
    const { db, store } = mockFirestore(data);

    await migrateGuild(db, GUILD_ID);

    const quizDoc = store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}`];
    expect(quizDoc).toEqual({ status: "ended", createdAt: "migrated" });
  });

  // --- Teams and rounds ---

  it("migrates teams and rounds for each quiz date", async () => {
    const { db, store } = mockFirestore({
      ...fullV3Data(),
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}/Rounds/Round 2`]: V3_ROUND_DOC_2,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}`]: V3_QUIZ_2,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}/Teams/big brains`]: V3_TEAM_DOC_2,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}/Rounds/Round 1`]: V3_ROUND_DOC,
    });

    const result = await migrateGuild(db, GUILD_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Quiz 1: 1 team + 2 rounds, Quiz 2: 1 team + 1 round
    expect(result.data.totalTeams).toBe(2);
    expect(result.data.totalRounds).toBe(3);

    // V4 team docs exist
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}/teams/squam fam`]).toBeDefined();
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_2}/teams/big brains`]).toBeDefined();

    // V4 round docs exist
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}/rounds/1`]).toBeDefined();
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}/rounds/2`]).toBeDefined();
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_2}/rounds/1`]).toBeDefined();
  });

  // --- Maps ---

  it("migrates alias and member maps for each quiz date", async () => {
    const { db, store } = mockFirestore({
      ...fullV3Data(),
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}`]: V3_QUIZ_2,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}/Teams/big brains`]: V3_TEAM_DOC_2,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}/Rounds/Round 1`]: V3_ROUND_DOC,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}/Maps/Teams Aliases`]: { "big-brains": "big brains" },
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}/Maps/Teams Members`]: { "999999999999999999": "big brains" },
    });

    await migrateGuild(db, GUILD_ID);

    // Quiz 1 maps
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}/maps/teamsAliases`]).toEqual(V3_ALIASES);
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}/maps/teamsMembers`]).toEqual(V3_MEMBERS);

    // Quiz 2 maps
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_2}/maps/teamsAliases`]).toEqual({ "big-brains": "big brains" });
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_2}/maps/teamsMembers`]).toEqual({ "999999999999999999": "big brains" });
  });

  it("skips maps gracefully when none exist", async () => {
    const data = { ...fullV3Data() };
    // Remove maps from V3 data
    delete data[`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}/Maps/Teams Aliases` as keyof typeof data];
    delete data[`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}/Maps/Teams Members` as keyof typeof data];
    const { db, store } = mockFirestore(data);

    const result = await migrateGuild(db, GUILD_ID);

    expect(result.ok).toBe(true);
    // No maps written
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}/maps/teamsAliases`]).toBeUndefined();
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}/maps/teamsMembers`]).toBeUndefined();
  });

  // --- User migration ---

  it("migrates user docs from Users/{userId} to users/{userId}", async () => {
    const { db, store } = mockFirestore(fullV3Data());

    await migrateGuild(db, GUILD_ID);

    expect(store["users/563354282741727269"]).toEqual({
      currentName: "Loerwyn",
      initialName: "Loerwyn",
      username: "loerwyn",
    });
    expect(store["users/261269804801982465"]).toEqual({
      currentName: "alice",
      initialName: "Alice",
      username: "alice99",
    });
  });

  it("migrates user guild records with server name mapping", async () => {
    const { db, store } = mockFirestore(fullV3Data());

    await migrateGuild(db, GUILD_ID);

    expect(store[`users/563354282741727269/servers/${GUILD_ID}`]).toEqual({
      usersTeams: ["squam fam"],
      server: {
        name: "Quiz Server",
        owner: "",
        initialName: "Quiz Server",
        initialOwner: "",
      },
    });

    expect(store[`users/261269804801982465/servers/${GUILD_ID}`]).toEqual({
      usersTeams: ["squam fam", "big brains"],
      server: {
        name: "Quiz Server",
        owner: "",
        initialName: "Quiz Server",
        initialOwner: "",
      },
    });
  });

  it("only migrates user guild records matching the current guild", async () => {
    const data = {
      ...fullV3Data(),
      [`Users/261269804801982465/Servers/${OTHER_GUILD_ID}`]: V3_USER_2_OTHER_GUILD,
    };
    const { db, store } = mockFirestore(data);

    await migrateGuild(db, GUILD_ID);

    // Current guild record was migrated
    expect(store[`users/261269804801982465/servers/${GUILD_ID}`]).toBeDefined();

    // Other guild record was NOT migrated
    expect(store[`users/261269804801982465/servers/${OTHER_GUILD_ID}`]).toBeUndefined();
  });

  // --- Error cases ---

  it("returns error when no V3 quizzes exist", async () => {
    const { db } = mockFirestore({});

    const result = await migrateGuild(db, GUILD_ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("No V3 quiz data found");
    }
  });

  // --- Empty quiz skip ---

  it("skips quiz dates with no teams or rounds", async () => {
    const { db, store } = mockFirestore({
      ...fullV3Data(),
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}`]: V3_QUIZ_2,
    });

    const result = await migrateGuild(db, GUILD_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.quizzesMigrated).toBe(1);
    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_2}`]).toBeUndefined();
  });

  // --- Dry run ---

  it("dry run returns quiz details without writing", async () => {
    const { db, store } = mockFirestore(fullV3Data());

    const result = await migrateGuild(db, GUILD_ID, true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.quizDetails).toBeDefined();
    expect(result.data.quizDetails!.length).toBe(1);
    expect(result.data.quizDetails![0].date).toBe(QUIZ_DATE_1);
    expect(result.data.quizDetails![0].status).toBe("ok");
    expect(result.data.quizDetails![0].teamCount).toBe(1);
    expect(result.data.quizDetails![0].roundCount).toBe(1);

    expect(store[`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}`]).toBeUndefined();
  });

  it("dry run marks empty quizzes as skip", async () => {
    const { db } = mockFirestore({
      ...fullV3Data(),
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}`]: V3_QUIZ_2,
    });

    const result = await migrateGuild(db, GUILD_ID, true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const skipped = result.data.quizDetails!.find((q) => q.date === QUIZ_DATE_2);
    expect(skipped).toBeDefined();
    expect(skipped!.status).toBe("skip");
  });

  it("dry run detects teams with missing fields", async () => {
    const { db } = mockFirestore({
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}`]: V3_QUIZ,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}/Teams/broken team`]: {
        teamName: "broken team",
      },
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_1}/Rounds/Round 1`]: V3_ROUND_DOC,
      [`Users/563354282741727269`]: V3_USER_1,
    });

    const result = await migrateGuild(db, GUILD_ID, true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const detail = result.data.quizDetails![0];
    expect(detail.status).toBe("warning");
    expect(detail.warnings.some((w) => w.includes("roleId missing"))).toBe(true);
  });

  it("dry run detects would-overwrite when V4 data exists", async () => {
    const data = {
      ...fullV3Data(),
      [`guilds/${GUILD_ID}/quizzes/${QUIZ_DATE_1}`]: { status: "active", createdAt: "existing" },
    };
    const { db } = mockFirestore(data);

    const result = await migrateGuild(db, GUILD_ID, true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const detail = result.data.quizDetails![0];
    expect(detail.status).toBe("warning");
    expect(detail.wouldOverwrite).toBe(true);
    expect(detail.warnings.some((w) => w.includes("overwrite"))).toBe(true);
  });

  it("dry run returns error when no V3 quizzes exist", async () => {
    const { db } = mockFirestore({});

    const result = await migrateGuild(db, GUILD_ID, true);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("No V3 quiz data found");
    }
  });

  it("dry run counts users", async () => {
    const { db } = mockFirestore(fullV3Data());

    const result = await migrateGuild(db, GUILD_ID, true);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.usersMigrated).toBe(2);
  });

  // --- Result counts ---

  it("returns correct counts in MigrateResult", async () => {
    const { db } = mockFirestore({
      ...fullV3Data(),
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}`]: V3_QUIZ_2,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}/Teams/big brains`]: V3_TEAM_DOC_2,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE_2}/Rounds/Round 1`]: V3_ROUND_DOC,
    });

    const result = await migrateGuild(db, GUILD_ID);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.quizzesMigrated).toBe(2);
    expect(result.data.totalTeams).toBe(2);
    expect(result.data.totalRounds).toBe(2);
    expect(result.data.usersMigrated).toBe(2);
  });
});
