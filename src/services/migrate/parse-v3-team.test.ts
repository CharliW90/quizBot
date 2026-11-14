import { describe, it, expect } from "vitest";
import { parseV3Team } from "./parse-v3-team.js";

const V3_TEAM = {
  teamName: "squam fam",
  captain: {
    userId: "563354282741727269",
    displayName: "Loerwyn",
    guildId: "694967880252522557",
    avatar: null,
    roles: ["1258751104145952862", "694967880252522557"],
  },
  members: [
    {
      userId: "261269804801982465",
      displayName: "alice",
      guildId: "694967880252522557",
      avatar: null,
      roles: ["1258751104145952862", "694967880252522557"],
    },
  ],
  channels: {
    textChannel: {
      id: "1545466799385215079",
      name: "squam-fam",
      guildId: "694967880252522557",
      type: 0,
    },
    voiceChannel: {
      id: "1545466800123456789",
      name: "squam fam",
      guildId: "694967880252522557",
      type: 2,
    },
  },
  roles: {
    teamRole: {
      id: "1545466793877971106",
      name: "Team: squam fam",
      color: 15105570,
      createdTimestamp: 1788538397045,
    },
    captainRole: {
      id: "697549875536986113",
      name: "Team Captain",
      color: 14155776,
    },
  },
  settledColour: 15105570,
  rounds: [],
  score: 0,
};

describe("parseV3Team", () => {
  it("extracts captain userId", () => {
    const result = parseV3Team(V3_TEAM);

    expect(result.captain).toBe("563354282741727269");
  });

  it("builds members array including captain", () => {
    const result = parseV3Team(V3_TEAM);

    expect(result.members).toEqual(["563354282741727269", "261269804801982465"]);
  });

  it("extracts channel IDs", () => {
    const result = parseV3Team(V3_TEAM);

    expect(result.textChannelId).toBe("1545466799385215079");
    expect(result.voiceChannelId).toBe("1545466800123456789");
  });

  it("extracts roleId from teamRole", () => {
    const result = parseV3Team(V3_TEAM);

    expect(result.roleId).toBe("1545466793877971106");
  });

  it("converts settledColour int to hex string", () => {
    const result = parseV3Team(V3_TEAM);

    expect(result.color).toBe("e67e22");
  });

  it("preserves team name", () => {
    const result = parseV3Team(V3_TEAM);

    expect(result.name).toBe("squam fam");
  });

  it("sets registeredAt from teamRole createdTimestamp if available", () => {
    const result = parseV3Team(V3_TEAM);

    expect(result.registeredAt).toBe(new Date(1788538397045).toISOString());
  });

  it("deduplicates members when captain is also in members array", () => {
    const v3 = {
      ...V3_TEAM,
      members: [
        { userId: "563354282741727269", displayName: "Loerwyn" },
        { userId: "261269804801982465", displayName: "alice" },
      ],
    };

    const result = parseV3Team(v3);

    expect(result.members).toEqual(["563354282741727269", "261269804801982465"]);
  });
});
