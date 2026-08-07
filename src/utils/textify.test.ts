import { describe, it, expect } from "vitest";
import { textifyTeamName } from "./textify.js";

describe("textifyTeamName", () => {
  it("lowercases the input", () => {
    expect(textifyTeamName("BIG TEAM")).toBe("big team");
  });

  it("replaces + with fullwidth plus", () => {
    expect(textifyTeamName("A+B")).toBe("a＋b");
  });

  it("replaces - with en-dash", () => {
    expect(textifyTeamName("Foo-Bar")).toBe("foo–bar");
  });

  it("replaces ' with acute accent", () => {
    expect(textifyTeamName("it's")).toBe("it´s");
  });

  it("replaces $ with S", () => {
    expect(textifyTeamName("Ca$h")).toBe("cash");
  });

  it("replaces & with and (with surrounding spaces)", () => {
    expect(textifyTeamName("Salt & Pepper")).toBe("salt and pepper");
  });

  it("replaces standalone & with and (no surrounding spaces)", () => {
    expect(textifyTeamName("Salt&Pepper")).toBe("salt and pepper");
  });

  it("replaces = with is (with surrounding spaces)", () => {
    expect(textifyTeamName("2 = 2")).toBe("2 is 2");
  });

  it("replaces standalone = with is (no surrounding spaces)", () => {
    expect(textifyTeamName("2=2")).toBe("2 is 2");
  });

  it("strips characters that are not word chars, fullwidth plus, en-dash, acute accent, or space", () => {
    expect(textifyTeamName("Team!@#%^*()")).toBe("team");
  });

  it("handles a realistic team name with multiple substitutions", () => {
    expect(textifyTeamName("Rock & Roll's $tars")).toBe("rock and roll´s stars");
  });

  it("returns unchanged for simple alphanumeric names", () => {
    expect(textifyTeamName("quiz wizards")).toBe("quiz wizards");
  });

  it("handles empty string", () => {
    expect(textifyTeamName("")).toBe("");
  });
});
