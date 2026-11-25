import type { Firestore } from "firebase-admin/firestore";
import type { Guild, CategoryChannel, Role } from "discord.js";
import { ChannelType } from "discord.js";
import { ok, type Result } from "../utils/result.js";
import { listTeams, deleteTeam } from "../integrations/firestore/teams.js";
import { deleteAllAliases } from "../integrations/firestore/aliases.js";
import { deleteAllMembers } from "../integrations/firestore/members.js";
import { getQuiz } from "../integrations/firestore/quiz.js";
import { logger } from "../utils/logger.js";
import { getQuizDate } from "../utils/quiz-date.js";

interface ResetQuizInput {
  db: Firestore;
  guildId: string;
  guild: Guild;
}

interface ResetQuizResult {
  channelsDeleted: number;
  rolesDeleted: number;
  captainRolesCleared: number;
  teamsRolesCleared: number;
  firestoreTeamsDeleted: number;
  firestoreAliasesDeleted: boolean;
  firestoreMembersDeleted: boolean;
}

export function discoverQuizTeamCategory(guild: Guild): CategoryChannel | null {
  return (
    guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name === "QUIZ TEAMS",
    ) as CategoryChannel | undefined
  ) ?? null;
}

export function discoverTeamRoles(guild: Guild): Role[] {
  return guild.roles.cache.filter((r) => r.name.startsWith("Team: ")).toJSON();
}

export async function resetQuiz(input: ResetQuizInput): Promise<Result<ResetQuizResult>> {
  const { db, guildId, guild } = input;
  logger.info({ guildId }, "[reset-quiz] Starting server-state-driven reset");

  let channelsDeleted = 0;
  let rolesDeleted = 0;
  let captainRolesCleared = 0;
  let teamsRolesCleared = 0;
  let firestoreTeamsDeleted = 0;
  let firestoreAliasesDeleted = false;
  let firestoreMembersDeleted = false;

  const category = discoverQuizTeamCategory(guild);
  if (category) {
    for (const [, channel] of category.children.cache) {
      try {
        await channel.delete();
        channelsDeleted++;
      } catch (e) {
        logger.warn({ error: e, channelId: channel.id }, "Failed to delete channel during reset");
      }
    }
  }

  const teamRoles = discoverTeamRoles(guild);
  for (const role of teamRoles) {
    try {
      await role.delete();
      rolesDeleted++;
    } catch (e) {
      logger.warn({ error: e, roleId: role.id }, "Failed to delete role during reset");
    }
  }

  const captainRole = guild.roles.cache.find((r) => r.name === "Team Captain");
  if (captainRole) {
    await guild.members.fetch();
    const captains = guild.members.cache.filter((m) => m.roles.cache.has(captainRole.id));
    for (const [, member] of captains) {
      try {
        await member.roles.remove(captainRole);
        captainRolesCleared++;
      } catch (e) {
        logger.warn({ error: e, memberId: member.id }, "Failed to remove captain role");
      }
    }
  }

  const teamsRole = guild.roles.cache.find((r) => r.name === "Teams");
  if (teamsRole) {
    const teamMembers = guild.members.cache.filter((m) => m.roles.cache.has(teamsRole.id));
    for (const [, member] of teamMembers) {
      try {
        await member.roles.remove(teamsRole);
        teamsRolesCleared++;
      } catch (e) {
        logger.warn({ error: e, memberId: member.id }, "Failed to remove Teams role");
      }
    }
  }

  const quizDate = getQuizDate();
  try {
    const quizResult = await getQuiz(db, guildId, quizDate);
    if (quizResult.ok && quizResult.data.status !== "ended") {
      const teamsResult = await listTeams(db, guildId, quizDate);
      if (teamsResult.ok) {
        for (const team of teamsResult.data) {
          await deleteTeam(db, guildId, quizDate, team.name);
          firestoreTeamsDeleted++;
        }
      }

      await deleteAllAliases(db, guildId, quizDate);
      firestoreAliasesDeleted = true;

      await deleteAllMembers(db, guildId, quizDate);
      firestoreMembersDeleted = true;
    } else if (quizResult.ok && quizResult.data.status === "ended") {
      logger.info({ quizDate }, "[reset-quiz] Quiz is ended - skipping Firestore cleanup");
    } else {
      logger.info({ quizDate }, "[reset-quiz] No quiz session for today - Firestore cleanup skipped");
    }
  } catch (e) {
    logger.warn({ error: e, quizDate }, "[reset-quiz] Firestore cleanup failed (non-fatal)");
  }

  logger.info(
    { channelsDeleted, rolesDeleted, captainRolesCleared, teamsRolesCleared, firestoreTeamsDeleted },
    "[reset-quiz] Reset complete",
  );

  return ok({
    channelsDeleted,
    rolesDeleted,
    captainRolesCleared,
    teamsRolesCleared,
    firestoreTeamsDeleted,
    firestoreAliasesDeleted,
    firestoreMembersDeleted,
  });
}
