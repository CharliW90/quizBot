import { describe, it, expect, vi, afterEach } from "vitest";
import { getQuizDate } from "./quiz-date.js";

describe("getQuizDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns YYYY-MM-DD format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T14:00:00Z"));

    const result = getQuizDate();

    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("defaults to Europe/London timezone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T14:00:00Z"));

    const result = getQuizDate();

    expect(result).toBe("2026-06-15");
  });

  it("respects a configured timezone", () => {
    vi.useFakeTimers();
    // 2026-06-15 23:30 UTC = 2026-06-16 08:30 in Asia/Tokyo
    vi.setSystemTime(new Date("2026-06-15T23:30:00Z"));

    const result = getQuizDate("Asia/Tokyo");

    expect(result).toBe("2026-06-16");
  });

  it("handles BST (British Summer Time) correctly", () => {
    vi.useFakeTimers();
    // 2026-06-15 23:30 UTC = 2026-06-16 00:30 BST
    vi.setSystemTime(new Date("2026-06-15T23:30:00Z"));

    const result = getQuizDate("Europe/London");

    expect(result).toBe("2026-06-16");
  });

  it("handles GMT (winter) correctly", () => {
    vi.useFakeTimers();
    // 2026-01-15 23:30 UTC = 2026-01-15 23:30 GMT (no offset)
    vi.setSystemTime(new Date("2026-01-15T23:30:00Z"));

    const result = getQuizDate("Europe/London");

    expect(result).toBe("2026-01-15");
  });

  it("handles US Eastern timezone", () => {
    vi.useFakeTimers();
    // 2026-06-15 03:00 UTC = 2026-06-14 23:00 EDT
    vi.setSystemTime(new Date("2026-06-15T03:00:00Z"));

    const result = getQuizDate("America/New_York");

    expect(result).toBe("2026-06-14");
  });
});
