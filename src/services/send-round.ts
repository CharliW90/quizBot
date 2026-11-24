import type { Firestore } from "firebase-admin/firestore";
import type { Guild } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { ok, type Result } from "../utils/result.js";
import { getRound, publishRound } from "../integrations/firestore/rounds.js";
import type { TeamResponse } from "../integrations/firestore/rounds.js";
import { getAliases } from "../integrations/firestore/aliases.js";
import { listTeams } from "../integrations/firestore/teams.js";
import type { Team } from "../integrations/firestore/teams.js";
import { logger } from "../utils/logger.js";

export interface SendSuccess {
  teamName: string;
  formName: string;
}

export interface SendFailure {
  teamName: string;
  reason: string;
}

export interface SendRoundResult {
  successes: SendSuccess[];
  failures: SendFailure[];
}

interface SendRoundInput {
  db: Firestore;
  guildId: string;
  quizDate: string;
  roundNumber: number;
  guild: Guild;
}

function buildTeamEmbed(
  teamName: string,
  roundNumber: number,
  response: TeamResponse,
  color: string,
): EmbedBuilder {
  const lines = response.answers.map((a, i) => {
    const icon = a.correct ? "✅" : "❌";
    return `${icon} Q${i + 1}: ${a.answer} (${a.score}pt${a.score !== 1 ? "s" : ""})`;
  });

  return new EmbedBuilder()
    .setTitle(`Round ${roundNumber} Results`)
    .setDescription(lines.join("\n"))
    .addFields({ name: "Total Score", value: String(response.score), inline: true })
    .setColor(parseInt(color.replace("#", ""), 16) || 0x7289da);
}

export async function sendRound(input: SendRoundInput): Promise<Result<SendRoundResult>> {
  const { db, guildId, quizDate, roundNumber, guild } = input;
  logger.info({ roundNumber, guildId }, "[send-round] Starting send");

  const roundResult = await getRound(db, guildId, quizDate, roundNumber);
  if (!roundResult.ok) return roundResult;

  const aliasResult = await getAliases(db, guildId, quizDate);
  const aliases = aliasResult.ok ? aliasResult.data : {};

  const teamsResult = await listTeams(db, guildId, quizDate);
  if (!teamsResult.ok) return teamsResult;

  const teamsByName = new Map<string, Team>();
  for (const team of teamsResult.data) {
    teamsByName.set(team.name, team);
  }

  const successes: SendSuccess[] = [];
  const failures: SendFailure[] = [];

  for (const [formName, response] of Object.entries(roundResult.data.responses)) {
    const resolvedName = aliases[formName] ?? formName;
    const team = teamsByName.get(resolvedName);

    if (!team) {
      const reason = `"${formName}" not registered - use /quiz correct to fix`;
      failures.push({ teamName: resolvedName, reason });
      logger.warn({ teamName: resolvedName, reason }, "[send-round] Failed to send to team");
      continue;
    }

    try {
      const channel = await guild.channels.fetch(team.textChannelId);
      if (!channel || !("send" in channel)) {
        const reason = "Text channel no longer exists or bot cannot access it";
        failures.push({ teamName: resolvedName, reason });
        logger.warn({ teamName: resolvedName, reason }, "[send-round] Failed to send to team");
        continue;
      }

      const embed = buildTeamEmbed(resolvedName, roundNumber, response, team.color);
      await channel.send({ embeds: [embed] });
      successes.push({ teamName: resolvedName, formName });
      logger.info({ teamName: resolvedName, roundNumber }, "[send-round] Sent results to team");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      const reason = `Failed to send to channel: ${message}`;
      failures.push({ teamName: resolvedName, reason });
      logger.warn({ teamName: resolvedName, reason }, "[send-round] Failed to send to team");
    }
  }

  if (successes.length > 0) {
    await publishRound(db, guildId, quizDate, roundNumber);
  }

  logger.info({ roundNumber, successes: successes.length, failures: failures.length }, "[send-round] Send complete");

  return ok({ successes, failures });
}
