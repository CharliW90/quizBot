import { describe, it, expect, vi, beforeEach } from "vitest";
import { migrateGuild, type MigrateResult } from "./migrate-guild.js";

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
const QUIZ_DATE = "2026-09-01";

const V3_TEAM_DOC = {
  teamName: "squam fam",
  captain: {
    userId: "563354282741727269",
    displayName: "Loerwyn",
  },
  members: [
    { userId: "261269804801982465", displayName: "alice" },
  ],
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

const V3_ROUND_DOC = {
  published: true,
  current: {
    teams: ["squam fam"],
    embeds: [{
      author: { name: "Round 1" },
      color: 0,
      fields: [
        { name: "Total Score", value: "18 / 20" },
        { name: "Question 1", value: "Paris :white_check_mark:" },
        { name: "Question 2", value: "Wrong :x:" },
      ],
    }],
  },
  history: [],
};

const V3_ALIASES = { "squam-fam": "squam fam" };
const V3_MEMBERS = { "563354282741727269": "squam fam", "261269804801982465": "squam fam" };
const V3_QUIZ = { date: "2026-09-01", ended: false };

describe("migrateGuild", () => {
  it("migrates teams from V3 to V4 paths", async () => {
    const { db, store } = mockFirestore({
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}`]: V3_QUIZ,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Teams/squam fam`]: V3_TEAM_DOC,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Rounds/Round 1`]: V3_ROUND_DOC,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Maps/Teams Aliases`]: V3_ALIASES,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Maps/Teams Members`]: V3_MEMBERS,
    });

    const result = await migrateGuild(db, GUILD_ID, QUIZ_DATE);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.teamsMigrated).toBe(1);
      expect(result.data.roundsMigrated).toBe(1);
    }
  });

  it("returns error when V3 quiz does not exist", async () => {
    const { db } = mockFirestore({});

    const result = await migrateGuild(db, GUILD_ID, QUIZ_DATE);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("not found");
    }
  });

  it("migrates quiz session status", async () => {
    const { db, store } = mockFirestore({
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}`]: { ...V3_QUIZ, ended: true },
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Teams/squam fam`]: V3_TEAM_DOC,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Rounds/Round 1`]: V3_ROUND_DOC,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Maps/Teams Aliases`]: V3_ALIASES,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Maps/Teams Members`]: V3_MEMBERS,
    });

    const result = await migrateGuild(db, GUILD_ID, QUIZ_DATE);

    expect(result.ok).toBe(true);
    const quizWrite = db.doc.mock.calls.find(
      (c: string[]) => c[0] === `guilds/${GUILD_ID}/quizzes/${QUIZ_DATE}`
    );
    expect(quizWrite).toBeTruthy();
  });

  it("reports counts in result", async () => {
    const { db } = mockFirestore({
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}`]: V3_QUIZ,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Teams/squam fam`]: V3_TEAM_DOC,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Rounds/Round 1`]: V3_ROUND_DOC,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Maps/Teams Aliases`]: V3_ALIASES,
      [`Servers/${GUILD_ID}/Quizzes/${QUIZ_DATE}/Maps/Teams Members`]: V3_MEMBERS,
    });

    const result = await migrateGuild(db, GUILD_ID, QUIZ_DATE);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.teamsMigrated).toBe(1);
      expect(result.data.roundsMigrated).toBe(1);
      expect(result.data.aliasesMigrated).toBe(true);
      expect(result.data.membersMigrated).toBe(true);
    }
  });
});
