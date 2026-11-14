import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, clearFirestore } from "./helpers.js";
import { setAlias, getAliases, lookupAlias, deleteAliasesForTeam } from "../integrations/firestore/aliases.js";
import { createQuiz, endQuiz } from "../integrations/firestore/quiz.js";

const db = getTestDb();
const GUILD = "guild-integration";
const DATE = "2026-01-10";

describe("aliases map (emulator)", () => {
  beforeEach(async () => {
    await clearFirestore();
  });


  it("sets and looks up an alias", async () => {
    await setAlias(db, GUILD, DATE, "the quizzicals", "The Quizzicals");

    const lookup = await lookupAlias(db, GUILD, DATE, "the quizzicals");
    expect(lookup.ok).toBe(true);
    if (lookup.ok) {
      expect(lookup.data).toBe("The Quizzicals");
    }
  });

  it("returns null for unknown alias", async () => {
    const lookup = await lookupAlias(db, GUILD, DATE, "nobody");
    expect(lookup.ok).toBe(true);
    if (lookup.ok) {
      expect(lookup.data).toBeNull();
    }
  });

  it("accumulates multiple aliases in one document", async () => {
    await setAlias(db, GUILD, DATE, "alpha", "Alpha Team");
    await setAlias(db, GUILD, DATE, "beta", "Beta Team");

    const all = await getAliases(db, GUILD, DATE);
    expect(all.ok).toBe(true);
    if (!all.ok) return;
    expect(all.data).toEqual({
      alpha: "Alpha Team",
      beta: "Beta Team",
    });
  });

  it("deletes aliases for a specific team", async () => {
    await setAlias(db, GUILD, DATE, "alpha", "Alpha Team");
    await setAlias(db, GUILD, DATE, "alpha-alt", "Alpha Team");
    await setAlias(db, GUILD, DATE, "beta", "Beta Team");

    const deleted = await deleteAliasesForTeam(db, GUILD, DATE, "Alpha Team");
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) return;
    expect(deleted.data.sort()).toEqual(["alpha", "alpha-alt"]);

    const remaining = await getAliases(db, GUILD, DATE);
    expect(remaining.ok).toBe(true);
    if (remaining.ok) {
      expect(remaining.data).toEqual({ beta: "Beta Team" });
    }
  });

  it("rejects writes when quiz is ended", async () => {
    await createQuiz(db, GUILD, DATE);
    await endQuiz(db, GUILD, DATE);

    const result = await setAlias(db, GUILD, DATE, "alpha", "Alpha");
    expect(result.ok).toBe(false);
  });
});
