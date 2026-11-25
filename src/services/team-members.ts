import type { Firestore } from "firebase-admin/firestore";
import type { Guild, GuildMember, Role } from "discord.js";
import { ok, err, type Result } from "../utils/result.js";
import { setTeamMembers, deleteTeamMembers } from "../integrations/firestore/members.js";
import { updateTeam } from "../integrations/firestore/teams.js";
import { logger } from "../utils/logger.js";

export interface TeamMemberContext {
  guild: Guild;
  db: Firestore;
  quizDate: string;
  teamName: string;
  teamRole: Role;
}

export async function addMembers(
  ctx: TeamMemberContext,
  members: GuildMember[],
): Promise<Result<void>> {
  const teamsRole = ctx.guild.roles.cache.find((r) => r.name === "Teams");

  try {
    const roleAssignments = members.map((m) => m.roles.add(ctx.teamRole));
    if (teamsRole) {
      roleAssignments.push(...members.map((m) => m.roles.add(teamsRole)));
    }
    await Promise.all(roleAssignments);
    logger.info({ teamName: ctx.teamName, memberIds: members.map((m) => m.id) }, "[team-members] Added members to roles");

    const memberIds = members.map((m) => m.id);
    await setTeamMembers(ctx.db, ctx.guild.id, ctx.quizDate, ctx.teamName.toLowerCase(), memberIds);

    const teamResult = await updateTeam(ctx.db, ctx.guild.id, ctx.quizDate, ctx.teamName, {
      members: getAllTeamMemberIds(ctx),
    });
    if (!teamResult.ok) return teamResult;

    logger.info({ teamName: ctx.teamName, addedCount: members.length }, "[team-members] Add members complete");
    return ok(undefined);
  } catch (error) {
    logger.error({ error }, "addMembers failed");
    return err(error instanceof Error ? error.message : "Failed to add members");
  }
}

export async function removeMembers(
  ctx: TeamMemberContext,
  members: GuildMember[],
): Promise<Result<void>> {
  const teamsRole = ctx.guild.roles.cache.find((r) => r.name === "Teams");

  try {
    const roleRemovals = members.map((m) => m.roles.remove(ctx.teamRole));
    if (teamsRole) {
      roleRemovals.push(...members.map((m) => m.roles.remove(teamsRole)));
    }
    await Promise.all(roleRemovals);
    logger.info({ teamName: ctx.teamName, memberIds: members.map((m) => m.id) }, "[team-members] Removed members from roles");

    const memberIds = members.map((m) => m.id);
    await deleteTeamMembers(ctx.db, ctx.guild.id, ctx.quizDate, memberIds);

    const remainingIds = getAllTeamMemberIds(ctx);
    await updateTeam(ctx.db, ctx.guild.id, ctx.quizDate, ctx.teamName, {
      members: remainingIds,
    });

    logger.info({ teamName: ctx.teamName, removedCount: members.length }, "[team-members] Remove members complete");
    return ok(undefined);
  } catch (error) {
    logger.error({ error }, "removeMembers failed");
    return err(error instanceof Error ? error.message : "Failed to remove members");
  }
}

export async function promoteToCaptain(
  ctx: TeamMemberContext,
  currentCaptain: GuildMember,
  newCaptain: GuildMember,
): Promise<Result<void>> {
  const captainRole = ctx.guild.roles.cache.find((r) => r.name === "Team Captain");

  if (!captainRole) {
    return err("Team Captain role not found in this server");
  }

  try {
    await Promise.all([
      newCaptain.roles.add(captainRole),
      currentCaptain.roles.remove(captainRole),
    ]);
    logger.info({ teamName: ctx.teamName, newCaptain: newCaptain.id, oldCaptain: currentCaptain.id }, "[team-members] Captain promoted");

    const updatedMembers = getAllTeamMemberIds(ctx).filter((id) => id !== newCaptain.id);
    await updateTeam(ctx.db, ctx.guild.id, ctx.quizDate, ctx.teamName, {
      captain: newCaptain.id,
      members: updatedMembers,
    });

    return ok(undefined);
  } catch (error) {
    logger.error({ error }, "promoteToCaptain failed");
    return err(error instanceof Error ? error.message : "Failed to promote captain");
  }
}

function getAllTeamMemberIds(ctx: TeamMemberContext): string[] {
  return ctx.guild.members.cache.filter((m) => m.roles.cache.has(ctx.teamRole.id)).map((m) => m.id);
}
