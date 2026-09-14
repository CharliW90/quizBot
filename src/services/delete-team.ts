import type { firestore } from "firebase-admin";
import type { Guild, Role } from "discord.js";
import { ok, err, type Result } from "../utils/result.js";
import { deleteTeam as deleteTeamDoc } from "../integrations/firestore/teams.js";
import { deleteTeamMembers } from "../integrations/firestore/members.js";
import { deleteAliasesForTeam } from "../integrations/firestore/aliases.js";
import type { Team } from "../integrations/firestore/teams.js";
import { logger } from "../utils/logger.js";

export interface DeleteTeamContext {
  guild: Guild;
  db: firestore.Firestore;
  quizDate: string;
}

export interface DeleteTeamResult {
  deletedRole: string;
  deletedChannels: string[];
  removedMemberCount: number;
}

export async function deleteTeamByRole(
  ctx: DeleteTeamContext,
  teamRole: Role,
  team: Team
): Promise<Result<DeleteTeamResult>> {
  const guild = ctx.guild;

  try {
    const teamMembers = guild.members.cache.filter((m) => m.roles.cache.has(teamRole.id));
    const memberIds = teamMembers.map((m) => m.id);

    const teamsRole = guild.roles.cache.find((r) => r.name === "Teams");
    const captainRole = guild.roles.cache.find((r) => r.name === "Team Captain");

    const roleRemovals = teamMembers.map((m) => m.roles.remove(teamRole));
    if (teamsRole) {
      roleRemovals.push(...teamMembers.map((m) => m.roles.remove(teamsRole)));
    }
    if (captainRole) {
      const captains = teamMembers.filter((m) => m.roles.cache.has(captainRole.id));
      roleRemovals.push(...captains.map((m) => m.roles.remove(captainRole)));
    }
    await Promise.all(roleRemovals);

    const deletedChannels: string[] = [];
    for (const channelId of [team.textChannelId, team.voiceChannelId]) {
      const channel = guild.channels.cache.get(channelId);
      if (channel) {
        await channel.delete();
        deletedChannels.push(channel.name);
      }
    }

    await teamRole.delete();

    await deleteTeamMembers(ctx.db, guild.id, ctx.quizDate, [...memberIds]);
    await deleteAliasesForTeam(ctx.db, guild.id, ctx.quizDate, team.name);
    await deleteTeamDoc(ctx.db, guild.id, ctx.quizDate, team.name);

    return ok({
      deletedRole: teamRole.name,
      deletedChannels,
      removedMemberCount: teamMembers.size,
    });
  } catch (error) {
    logger.error({ error }, "deleteTeamByRole failed");
    return err(error instanceof Error ? error.message : "Failed to delete team");
  }
}
