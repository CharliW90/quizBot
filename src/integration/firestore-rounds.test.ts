import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { getTestDb, clearFirestore, teardown } from "./helpers.js";
import { storeRound, getRound, listRounds, publishRound } from "../integrations/firestore/rounds.js";
import { createQuiz, endQuiz } from "../integrations/firestore/quiz.js";

const db = getTestDb();
const GUILD = "guild-integration";
const DATE = "2026-01-10";

function makeResponses(teamName: string, score: number) {
  return {
    [teamName]: {
      answers: [{ answer: "Paris", score, correct: score > 0 }],
      score,
    },
  };
}

describe("rounds (emulator)", () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  afterAll(async () => {
    await teardown();
  });

  it("stores and retrieves a round", async () => {
    const store = await storeRound(db, GUILD, DATE, {
      roundNumber: 1,
      formId: "form-abc",
      responses: makeResponses("Alpha", 5),
    });
    expect(store.ok).toBe(true);
    if (!store.ok) return;
    expect(store.data.roundNumber).toBe(1);
    expect(store.data.history).toEqual([]);

    const get = await getRound(db, GUILD, DATE, 1);
    expect(get.ok).toBe(true);
    if (!get.ok) return;
    expect(get.data.formId).toBe("form-abc");
    expect(get.data.responses["Alpha"].score).toBe(5);
  });

  it("accumulates history on re-fetch", async () => {
    await storeRound(db, GUILD, DATE, {
      roundNumber: 1,
      formId: "form-abc",
      responses: makeResponses("Alpha", 5),
    });

    await storeRound(db, GUILD, DATE, {
      roundNumber: 1,
      formId: "form-abc",
      responses: makeResponses("Alpha", 7),
    });

    const get = await getRound(db, GUILD, DATE, 1);
    expect(get.ok).toBe(true);
    if (!get.ok) return;
    expect(get.data.responses["Alpha"].score).toBe(7);
    expect(get.data.history).toHaveLength(1);
    expect(get.data.history[0].responses["Alpha"].score).toBe(5);
  });

  it("preserves full history across multiple re-fetches", async () => {
    for (const score of [3, 5, 7]) {
      await storeRound(db, GUILD, DATE, {
        roundNumber: 1,
        formId: "form-abc",
        responses: makeResponses("Alpha", score),
      });
    }

    const get = await getRound(db, GUILD, DATE, 1);
    expect(get.ok).toBe(true);
    if (!get.ok) return;
    expect(get.data.responses["Alpha"].score).toBe(7);
    expect(get.data.history).toHaveLength(2);
    expect(get.data.history[0].responses["Alpha"].score).toBe(5);
    expect(get.data.history[1].responses["Alpha"].score).toBe(3);
  });

  it("lists all rounds", async () => {
    await storeRound(db, GUILD, DATE, {
      roundNumber: 1,
      formId: "form-1",
      responses: makeResponses("Alpha", 5),
    });
    await storeRound(db, GUILD, DATE, {
      roundNumber: 2,
      formId: "form-2",
      responses: makeResponses("Beta", 3),
    });

    const list = await listRounds(db, GUILD, DATE);
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data).toHaveLength(2);
    expect(list.data.map((r) => r.roundNumber).sort()).toEqual([1, 2]);
  });

  it("publishes a round", async () => {
    await storeRound(db, GUILD, DATE, {
      roundNumber: 1,
      formId: "form-abc",
      responses: makeResponses("Alpha", 5),
    });

    const pub = await publishRound(db, GUILD, DATE, 1);
    expect(pub.ok).toBe(true);

    const get = await getRound(db, GUILD, DATE, 1);
    expect(get.ok).toBe(true);
    if (get.ok) {
      expect(get.data.publishedAt).not.toBeNull();
    }
  });

  it("rejects operations when quiz is ended", async () => {
    await createQuiz(db, GUILD, DATE);
    await endQuiz(db, GUILD, DATE);

    const store = await storeRound(db, GUILD, DATE, {
      roundNumber: 1,
      formId: "form-abc",
      responses: makeResponses("Alpha", 5),
    });
    expect(store.ok).toBe(false);
  });

  it("returns error for non-existent round", async () => {
    const get = await getRound(db, GUILD, DATE, 99);
    expect(get.ok).toBe(false);
  });
});
