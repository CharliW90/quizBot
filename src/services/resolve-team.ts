import type { Guild, Role, TextChannel, VoiceChannel } from "discord.js";
import type { Team } from "../integrations/firestore/teams.js";

export type MissingResource = "role" | "textChannel" | "voiceChannel";

export interface TeamResources {
  role: Role | null;
  textChannel: TextChannel | null;
  voiceChannel: VoiceChannel | null;
  missing: MissingResource[];
}

export async function resolveTeamResources(guild: Guild, team: Team): Promise<TeamResources> {
  const role = guild.roles.cache.get(team.roleId) as Role | undefined ?? null;
  const textChannel = guild.channels.cache.get(team.textChannelId) as TextChannel | undefined ?? null;
  const voiceChannel = guild.channels.cache.get(team.voiceChannelId) as VoiceChannel | undefined ?? null;

  const missing: MissingResource[] = [];
  if (!role) missing.push("role");
  if (!textChannel) missing.push("textChannel");
  if (!voiceChannel) missing.push("voiceChannel");

  return { role, textChannel, voiceChannel, missing };
}
