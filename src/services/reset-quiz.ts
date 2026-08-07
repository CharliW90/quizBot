import type { firestore } from "firebase-admin";
import type { Guild } from "discord.js";
import { ok, err, type Result } from "../utils/result.js";
import { listTeams, deleteTeam } from "../integrations/firestore/teams.js";
import { logger } from "../utils/logger.js";

type Firestore = firestore.Firestore;

interface ResetQuizInput {
  db: Firestore;
  guildId: string;
  quizDate: string;
  guild: Guild;
}

interface ResetQuizResult {
  rolesDeleted: number;
  channelsDeleted: number;
  teamsDeleted: number;
}

export async function resetQuiz(input: ResetQuizInput): Promise<Result<ResetQuizResult>> {
  const { db, guildId, quizDate, guild } = input;

  const teamsResult = await listTeams(db, guildId, quizDate);
  if (!teamsResult.ok) return teamsResult;

  let rolesDeleted = 0;
  let channelsDeleted = 0;
  let teamsDeleted = 0;

  for (const team of teamsResult.data) {
    const role = guild.roles.cache.get(team.roleId);
    if (role) {
      try {
        await role.delete();
        rolesDeleted++;
      } catch (e) {
        logger.warn({ error: e, roleId: team.roleId }, "Failed to delete role during reset");
      }
    }

    for (const channelId of [team.textChannelId, team.voiceChannelId]) {
      const channel = guild.channels.cache.get(channelId);
      if (channel) {
        try {
          await channel.delete();
          channelsDeleted++;
        } catch (e) {
          logger.warn({ error: e, channelId }, "Failed to delete channel during reset");
        }
      }
    }

    await deleteTeam(db, guildId, quizDate, team.name);
    teamsDeleted++;
  }

  return ok({ rolesDeleted, channelsDeleted, teamsDeleted });
}
