import type { Team } from "../../integrations/firestore/teams.js";

export interface V3Member {
  userId: string;
  displayName?: string;
  [key: string]: unknown;
}

export interface V3Team {
  teamName: string;
  captain: V3Member;
  members: V3Member[];
  channels: {
    textChannel: { id: string; [key: string]: unknown };
    voiceChannel: { id: string; [key: string]: unknown };
  };
  roles: {
    teamRole: { id: string; color?: number; createdTimestamp?: number; [key: string]: unknown };
    captainRole?: { id: string; [key: string]: unknown };
  };
  settledColour: number;
  [key: string]: unknown;
}

export function parseV3Team(v3: V3Team): Team {
  const captainId = v3.captain.userId;
  const memberIds = v3.members.map((m) => m.userId);

  const allMembers = [captainId, ...memberIds.filter((id) => id !== captainId)];

  const registeredAt = v3.roles.teamRole.createdTimestamp
    ? new Date(v3.roles.teamRole.createdTimestamp).toISOString()
    : new Date().toISOString();

  return {
    name: v3.teamName,
    captain: captainId,
    members: allMembers,
    roleId: v3.roles.teamRole.id,
    textChannelId: v3.channels.textChannel.id,
    voiceChannelId: v3.channels.voiceChannel.id,
    color: v3.settledColour.toString(16),
    registeredAt,
  };
}
