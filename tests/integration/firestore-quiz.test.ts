import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, clearFirestore } from "./helpers.js";
import {
  createQuiz,
  getQuiz,
  listQuizzes,
  endQuiz,
} from "../../src/integrations/firestore/quiz.js";

const db = getTestDb();
const GUILD = "guild-integration";

describe("quiz lifecycle (emulator)", () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it("creates and retrieves a quiz", async () => {
    const create = await createQuiz(db, GUILD, "2026-01-10");
    expect(create.ok).toBe(true);
    if (!create.ok) return;
    expect(create.data.status).toBe("active");

    const get = await getQuiz(db, GUILD, "2026-01-10");
    expect(get.ok).toBe(true);
    if (!get.ok) return;
    expect(get.data.date).toBe("2026-01-10");
    expect(get.data.status).toBe("active");
  });

  it("rejects duplicate quiz creation", async () => {
    await createQuiz(db, GUILD, "2026-01-10");
    const dup = await createQuiz(db, GUILD, "2026-01-10");
    expect(dup.ok).toBe(false);
    if (!dup.ok) {
      expect(dup.error).toContain("already exists");
    }
  });

  it("lists quizzes for a guild", async () => {
    await createQuiz(db, GUILD, "2026-01-10");
    await createQuiz(db, GUILD, "2026-01-17");

    const list = await listQuizzes(db, GUILD);
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data).toHaveLength(2);
    expect(list.data.map((q) => q.date).sort()).toEqual(["2026-01-10", "2026-01-17"]);
  });

  it("ends a quiz and rejects double-end", async () => {
    await createQuiz(db, GUILD, "2026-01-10");

    const end = await endQuiz(db, GUILD, "2026-01-10");
    expect(end.ok).toBe(true);

    const get = await getQuiz(db, GUILD, "2026-01-10");
    expect(get.ok).toBe(true);
    if (get.ok) {
      expect(get.data.status).toBe("ended");
    }

    const doubleEnd = await endQuiz(db, GUILD, "2026-01-10");
    expect(doubleEnd.ok).toBe(false);
  });

  it("returns error for non-existent quiz", async () => {
    const get = await getQuiz(db, GUILD, "1999-01-01");
    expect(get.ok).toBe(false);
  });
});
