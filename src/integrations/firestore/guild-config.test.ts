import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFormIds, setFormId } from "./guild-config.js";

function mockFirestore() {
  const store: Record<string, Record<string, unknown>> = {};

  const doc = (path: string) => ({
    set: vi.fn(async (data: unknown, opts?: { merge?: boolean }) => {
      if (opts?.merge) {
        store[path] = { ...store[path], ...(data as Record<string, unknown>) };
      } else {
        store[path] = data as Record<string, unknown>;
      }
    }),
    get: vi.fn(async () => ({
      exists: path in store,
      data: () => store[path] ?? undefined,
    })),
  });

  const collection = (collectionPath: string) => ({
    doc: (id: string) => doc(`${collectionPath}/${id}`),
  });

  return { collection, doc, _store: store };
}

describe("guild-config", () => {
  let db: ReturnType<typeof mockFirestore>;

  beforeEach(() => {
    db = mockFirestore();
  });

  describe("getFormIds", () => {
    it("returns empty object when no config exists", async () => {
      const result = await getFormIds(db as any, "guild-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({});
      }
    });

    it("returns stored form IDs", async () => {
      db._store["guilds/guild-1/config/forms"] = {
        "1": "form-aaa",
        "2": "form-bbb",
      };

      const result = await getFormIds(db as any, "guild-1");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ "1": "form-aaa", "2": "form-bbb" });
      }
    });
  });

  describe("setFormId", () => {
    it("stores a form ID for round 1 when no config exists", async () => {
      const result = await setFormId(db as any, "guild-1", 1, "form-abc");

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/config/forms"];
      expect(stored["1"]).toBe("form-abc");
    });

    it("rejects round 0", async () => {
      const result = await setFormId(db as any, "guild-1", 0, "form-abc");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("must be 1 or greater");
      }
    });

    it("rejects negative rounds", async () => {
      const result = await setFormId(db as any, "guild-1", -2, "form-abc");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("must be 1 or greater");
      }
    });

    it("rejects skipping a round number", async () => {
      db._store["guilds/guild-1/config/forms"] = {
        "1": "form-aaa",
      };

      const result = await setFormId(db as any, "guild-1", 3, "form-ccc");

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("next available round is 2");
      }
    });

    it("allows adding the next sequential round", async () => {
      db._store["guilds/guild-1/config/forms"] = {
        "1": "form-aaa",
        "2": "form-bbb",
      };

      const result = await setFormId(db as any, "guild-1", 3, "form-ccc");

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/config/forms"];
      expect(stored["3"]).toBe("form-ccc");
    });

    it("allows overwriting an existing round", async () => {
      db._store["guilds/guild-1/config/forms"] = {
        "1": "form-aaa",
        "2": "form-bbb",
        "3": "form-ccc",
      };

      const result = await setFormId(db as any, "guild-1", 2, "form-new");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.overwritten).toBe(true);
        expect(result.data.previousFormId).toBe("form-bbb");
      }
      const stored = db._store["guilds/guild-1/config/forms"];
      expect(stored["2"]).toBe("form-new");
    });

    it("reports overwritten: false for new rounds", async () => {
      const result = await setFormId(db as any, "guild-1", 1, "form-abc");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.overwritten).toBe(false);
        expect(result.data.previousFormId).toBeNull();
      }
    });

    it("extracts form ID from a full Google Forms URL", async () => {
      const url =
        "https://docs.google.com/forms/d/1BxOQ3abc123_xyz/edit";

      const result = await setFormId(db as any, "guild-1", 1, url);

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/config/forms"];
      expect(stored["1"]).toBe("1BxOQ3abc123_xyz");
    });

    it("extracts form ID from URL without trailing path", async () => {
      const url =
        "https://docs.google.com/forms/d/1BxOQ3abc123_xyz";

      const result = await setFormId(db as any, "guild-1", 1, url);

      expect(result.ok).toBe(true);
      const stored = db._store["guilds/guild-1/config/forms"];
      expect(stored["1"]).toBe("1BxOQ3abc123_xyz");
    });

    it("rejects an invalid URL that looks like a link but has no form ID", async () => {
      const url = "https://docs.google.com/forms/";

      const result = await setFormId(db as any, "guild-1", 1, url);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain("Could not extract");
      }
    });
  });
});
