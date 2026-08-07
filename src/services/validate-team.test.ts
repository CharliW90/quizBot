import { describe, it, expect } from "vitest";
import { validateTeamRegistration, type TeamValidationInput, type ValidationError } from "./validate-team.js";

function validInput(overrides: Partial<TeamValidationInput> = {}): TeamValidationInput {
  return {
    teamName: "Quiz Wizards",
    textifiedName: "quiz wizards",
    captainId: "user-1",
    memberIds: ["user-1", "user-2"],
    requestingUserId: "user-1",
    isRequesterAdmin: false,
    existingRoleNames: [],
    existingChannelNames: [],
    botUserIds: [],
    adminUserIds: [],
    aliasMatch: null,
    memberConflicts: [],
    ...overrides,
  };
}

describe("validateTeamRegistration", () => {
  it("returns empty array when all checks pass", () => {
    const errors = validateTeamRegistration(validInput());
    expect(errors).toEqual([]);
  });

  describe("self-registration check", () => {
    it("fails if requester is not in members list and not admin", () => {
      const errors = validateTeamRegistration(
        validInput({ requestingUserId: "outsider", isRequesterAdmin: false })
      );
      expect(errors).toContainEqual({ type: "not_self_registering" });
    });

    it("passes if requester is not in members but is admin", () => {
      const errors = validateTeamRegistration(
        validInput({ requestingUserId: "admin-1", isRequesterAdmin: true })
      );
      expect(errors).not.toContainEqual({ type: "not_self_registering" });
    });
  });

  describe("duplicate role check", () => {
    it("fails if a role with the team name already exists (case-insensitive)", () => {
      const errors = validateTeamRegistration(
        validInput({ existingRoleNames: ["Team: quiz wizards", "Other Role"] })
      );
      expect(errors).toContainEqual({
        type: "duplicate_role",
        names: ["Team: quiz wizards"],
      });
    });

    it("matches against exact team name case-insensitively", () => {
      const errors = validateTeamRegistration(
        validInput({ teamName: "Big Team", existingRoleNames: ["big team", "TEAM: BIG TEAM"] })
      );
      expect(errors[0]).toMatchObject({ type: "duplicate_role" });
    });

    it("passes when no matching roles exist", () => {
      const errors = validateTeamRegistration(
        validInput({ existingRoleNames: ["Unrelated Role"] })
      );
      expect(errors.filter((e) => e.type === "duplicate_role")).toHaveLength(0);
    });
  });

  describe("duplicate channel check", () => {
    it("fails if a channel with the team name exists", () => {
      const errors = validateTeamRegistration(
        validInput({ teamName: "Quiz Wizards", existingChannelNames: ["quiz-wizards"] })
      );
      expect(errors).toContainEqual({
        type: "duplicate_channel",
        names: ["quiz-wizards"],
      });
    });

    it("fails if a channel matching textified name exists", () => {
      const errors = validateTeamRegistration(
        validInput({
          teamName: "A+B Team",
          textifiedName: "a＋b team",
          existingChannelNames: ["a＋b team"],
        })
      );
      expect(errors).toContainEqual({
        type: "duplicate_channel",
        names: ["a＋b team"],
      });
    });

    it("passes when no matching channels exist", () => {
      const errors = validateTeamRegistration(
        validInput({ existingChannelNames: ["general", "random"] })
      );
      expect(errors.filter((e) => e.type === "duplicate_channel")).toHaveLength(0);
    });
  });

  describe("alias collision check", () => {
    it("fails if alias already maps to another team", () => {
      const errors = validateTeamRegistration(
        validInput({ aliasMatch: "Other Team" })
      );
      expect(errors).toContainEqual({
        type: "alias_collision",
        existingTeam: "Other Team",
      });
    });

    it("passes when no alias match exists", () => {
      const errors = validateTeamRegistration(validInput({ aliasMatch: null }));
      expect(errors.filter((e) => e.type === "alias_collision")).toHaveLength(0);
    });
  });

  describe("members already registered check", () => {
    it("fails if any members are already on a team", () => {
      const errors = validateTeamRegistration(
        validInput({
          memberConflicts: [{ userId: "user-2", teamName: "Other Team" }],
        })
      );
      expect(errors).toContainEqual({
        type: "members_already_registered",
        conflicts: [{ userId: "user-2", teamName: "Other Team" }],
      });
    });

    it("passes when no member conflicts", () => {
      const errors = validateTeamRegistration(validInput({ memberConflicts: [] }));
      expect(errors.filter((e) => e.type === "members_already_registered")).toHaveLength(0);
    });
  });

  describe("admin members check", () => {
    it("fails if any members are admins", () => {
      const errors = validateTeamRegistration(
        validInput({ adminUserIds: ["user-2"] })
      );
      expect(errors).toContainEqual({
        type: "admin_members",
        userIds: ["user-2"],
      });
    });

    it("passes when no admins in member list", () => {
      const errors = validateTeamRegistration(
        validInput({ adminUserIds: [] })
      );
      expect(errors.filter((e) => e.type === "admin_members")).toHaveLength(0);
    });
  });

  describe("bot members check", () => {
    it("fails if any members are bots", () => {
      const errors = validateTeamRegistration(
        validInput({ botUserIds: ["user-2"] })
      );
      expect(errors).toContainEqual({
        type: "bot_members",
        userIds: ["user-2"],
      });
    });

    it("passes when no bots in member list", () => {
      const errors = validateTeamRegistration(validInput({ botUserIds: [] }));
      expect(errors.filter((e) => e.type === "bot_members")).toHaveLength(0);
    });
  });

  describe("multiple errors", () => {
    it("accumulates all validation failures", () => {
      const errors = validateTeamRegistration(
        validInput({
          requestingUserId: "outsider",
          isRequesterAdmin: false,
          botUserIds: ["user-2"],
          aliasMatch: "Existing Team",
        })
      );
      expect(errors).toHaveLength(3);
      const types = errors.map((e) => e.type);
      expect(types).toContain("not_self_registering");
      expect(types).toContain("bot_members");
      expect(types).toContain("alias_collision");
    });
  });
});
