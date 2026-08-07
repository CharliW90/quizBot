import type { firestore } from "firebase-admin";
import type { Guild, Role } from "discord.js";
import { ok, err, type Result } from "../utils/result.js";
import { deleteTeam as deleteTeamDoc } from "../integrations/firestore/teams.js";
import { deleteTeamMembers } from "../integrations/firestore/members.js";
import { deleteAliasesForTeam } from "../integrations/firestore/aliases.js";
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
  teamRole: Role
): Promise<Result<DeleteTeamResult>> {
  const teamName = teamRole.name.replace("Team: ", "");
  const guild = ctx.guild;

  try {
    // Find team members before deleting everything
    const teamMembers = guild.members.cache.filter((m) => m.roles.cache.has(teamRole.id));
    const memberIds = teamMembers.map((m) => m.id);

    // Remove roles from all members
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

    // Delete channels
    const deletedChannels: string[] = [];
    const textChannel = guild.channels.cache.find(
      (ch) => ch.parentId && ch.name.toLowerCase() === teamName.toLowerCase().replaceAll(" ", "-")
    );
    const voiceChannel = guild.channels.cache.find(
      (ch) => ch.parentId && ch.name.toLowerCase() === teamName.toLowerCase() && ch.isVoiceBased()
    );

    if (textChannel) {
      await textChannel.delete();
      deletedChannels.push(textChannel.name);
    }
    if (voiceChannel) {
      await voiceChannel.delete();
      deletedChannels.push(voiceChannel.name);
    }

    // Delete role
    await teamRole.delete();

    // Firestore cleanup
    await deleteTeamMembers(ctx.db, guild.id, ctx.quizDate, [...memberIds]);
    await deleteAliasesForTeam(ctx.db, guild.id, ctx.quizDate, teamName);
    await deleteTeamDoc(ctx.db, guild.id, ctx.quizDate, teamName);

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
