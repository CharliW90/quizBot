import { describe, it, expect, beforeEach } from "vitest";
import { getTestDb, clearFirestore } from "./helpers.js";
import {
  createTeam,
  getTeam,
  listTeams,
  updateTeam,
  deleteTeam,
} from "../../src/integrations/firestore/teams.js";
import { createQuiz, endQuiz } from "../../src/integrations/firestore/quiz.js";

const db = getTestDb();
const GUILD = "guild-integration";
const DATE = "2026-01-10";

function makeTeam(name: string) {
  return {
    name,
    captain: "user-1",
    members: ["user-1", "user-2"],
    roleId: "role-1",
    textChannelId: "text-1",
    voiceChannelId: "voice-1",
    color: "#ff0000",
  };
}

describe("teams CRUD (emulator)", () => {
  beforeEach(async () => {
    await clearFirestore();
  });

  it("creates and retrieves a team", async () => {
    const create = await createTeam(db, GUILD, DATE, makeTeam("Alpha"));
    expect(create.ok).toBe(true);
    if (!create.ok) return;
    expect(create.data.registeredAt).toBeDefined();

    const get = await getTeam(db, GUILD, DATE, "Alpha");
    expect(get.ok).toBe(true);
    if (!get.ok) return;
    expect(get.data.captain).toBe("user-1");
    expect(get.data.members).toEqual(["user-1", "user-2"]);
  });

  it("lists multiple teams", async () => {
    await createTeam(db, GUILD, DATE, makeTeam("Alpha"));
    await createTeam(db, GUILD, DATE, makeTeam("Beta"));
    await createTeam(db, GUILD, DATE, makeTeam("Gamma"));

    const list = await listTeams(db, GUILD, DATE);
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data).toHaveLength(3);
    expect(list.data.map((t) => t.name).sort()).toEqual(["Alpha", "Beta", "Gamma"]);
  });

  it("updates specific fields without clobbering others", async () => {
    await createTeam(db, GUILD, DATE, makeTeam("Alpha"));

    const update = await updateTeam(db, GUILD, DATE, "Alpha", {
      captain: "user-2",
      color: "#00ff00",
    });
    expect(update.ok).toBe(true);

    const get = await getTeam(db, GUILD, DATE, "Alpha");
    expect(get.ok).toBe(true);
    if (!get.ok) return;
    expect(get.data.captain).toBe("user-2");
    expect(get.data.color).toBe("#00ff00");
    expect(get.data.members).toEqual(["user-1", "user-2"]);
  });

  it("deletes a team", async () => {
    await createTeam(db, GUILD, DATE, makeTeam("Doomed"));

    const del = await deleteTeam(db, GUILD, DATE, "Doomed");
    expect(del.ok).toBe(true);

    const get = await getTeam(db, GUILD, DATE, "Doomed");
    expect(get.ok).toBe(false);
  });

  it("rejects team creation when quiz is ended", async () => {
    await createQuiz(db, GUILD, DATE);
    await endQuiz(db, GUILD, DATE);

    const result = await createTeam(db, GUILD, DATE, makeTeam("TooLate"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("ended");
    }
  });

  it("rejects update and delete when quiz is ended", async () => {
    await createTeam(db, GUILD, DATE, makeTeam("Alpha"));
    await createQuiz(db, GUILD, DATE);
    await endQuiz(db, GUILD, DATE);

    const update = await updateTeam(db, GUILD, DATE, "Alpha", { color: "#000" });
    expect(update.ok).toBe(false);

    const del = await deleteTeam(db, GUILD, DATE, "Alpha");
    expect(del.ok).toBe(false);
  });

  it("returns error for non-existent team", async () => {
    const get = await getTeam(db, GUILD, DATE, "Nobody");
    expect(get.ok).toBe(false);

    const del = await deleteTeam(db, GUILD, DATE, "Nobody");
    expect(del.ok).toBe(false);

    const update = await updateTeam(db, GUILD, DATE, "Nobody", { color: "#000" });
    expect(update.ok).toBe(false);
  });
});
