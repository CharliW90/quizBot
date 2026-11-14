import { describe, it, expect, vi } from "vitest";
import { resolveTeamResources, type TeamResources } from "./resolve-team.js";
import type { Team } from "../integrations/firestore/teams.js";

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    name: "Test Team",
    captain: "captain-1",
    members: ["captain-1", "member-1"],
    roleId: "role-123",
    textChannelId: "text-456",
    voiceChannelId: "voice-789",
    color: "#ff0000",
    ...overrides,
  };
}

interface MockResource { id: string; name: string; [key: string]: unknown }

function makeGuild({
  role = { id: "role-123", name: "Team: Test Team" },
  textChannel = { id: "text-456", name: "test-team", isTextBased: () => true },
  voiceChannel = { id: "voice-789", name: "Test Team", isVoiceBased: () => true },
}: {
  role?: MockResource | null;
  textChannel?: MockResource | null;
  voiceChannel?: MockResource | null;
} = {}) {
  const channelMap = new Map<string, MockResource>();
  if (textChannel) channelMap.set(textChannel.id, textChannel);
  if (voiceChannel) channelMap.set(voiceChannel.id, voiceChannel);

  return {
    roles: {
      cache: {
        get: vi.fn((id: string) => {
          if (role && (role as any).id === id) return role;
          return undefined;
        }),
      },
    },
    channels: {
      cache: {
        get: vi.fn((id: string) => channelMap.get(id) ?? undefined),
      },
    },
  } as any;
}

describe("resolveTeamResources", () => {
  it("returns all resources when everything exists", async () => {
    const team = makeTeam();
    const guild = makeGuild();

    const result = await resolveTeamResources(guild, team);

    expect(result.role).toBeTruthy();
    expect(result.textChannel).toBeTruthy();
    expect(result.voiceChannel).toBeTruthy();
    expect(result.missing).toEqual([]);
  });

  it("reports missing role", async () => {
    const team = makeTeam();
    const guild = makeGuild({ role: null });

    const result = await resolveTeamResources(guild, team);

    expect(result.role).toBeNull();
    expect(result.textChannel).toBeTruthy();
    expect(result.voiceChannel).toBeTruthy();
    expect(result.missing).toEqual(["role"]);
  });

  it("reports missing text channel", async () => {
    const team = makeTeam();
    const guild = makeGuild({ textChannel: null });

    const result = await resolveTeamResources(guild, team);

    expect(result.role).toBeTruthy();
    expect(result.textChannel).toBeNull();
    expect(result.voiceChannel).toBeTruthy();
    expect(result.missing).toEqual(["textChannel"]);
  });

  it("reports missing voice channel", async () => {
    const team = makeTeam();
    const guild = makeGuild({ voiceChannel: null });

    const result = await resolveTeamResources(guild, team);

    expect(result.voiceChannel).toBeNull();
    expect(result.missing).toEqual(["voiceChannel"]);
  });

  it("reports all missing when everything was deleted", async () => {
    const team = makeTeam();
    const guild = makeGuild({ role: null, textChannel: null, voiceChannel: null });

    const result = await resolveTeamResources(guild, team);

    expect(result.role).toBeNull();
    expect(result.textChannel).toBeNull();
    expect(result.voiceChannel).toBeNull();
    expect(result.missing).toEqual(["role", "textChannel", "voiceChannel"]);
  });

  it("still finds renamed resources by ID", async () => {
    const team = makeTeam();
    const guild = makeGuild({
      role: { id: "role-123", name: "Renamed Role" },
      textChannel: { id: "text-456", name: "renamed-channel", isTextBased: () => true },
      voiceChannel: { id: "voice-789", name: "Renamed VC", isVoiceBased: () => true },
    });

    const result = await resolveTeamResources(guild, team);

    expect(result.role).toBeTruthy();
    expect(result.textChannel).toBeTruthy();
    expect(result.voiceChannel).toBeTruthy();
    expect(result.missing).toEqual([]);
  });
});
