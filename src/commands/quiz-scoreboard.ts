import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { listQuizzes } from "../integrations/firestore/quiz.js";
import { generateScoreboard, type ScoreboardResult } from "../services/generate-scoreboard.js";
import { errorEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import { getQuizDate } from "../utils/quiz-date.js";
import type { ScoreboardEntry } from "../integrations/firestore/scoreboard.js";

const pluralRules = new Intl.PluralRules("en-US", { type: "ordinal" });
const suffixes: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };

function ordinal(n: number): string {
  return `${n}${suffixes[pluralRules.select(n)]}`;
}

function buildLeaderboardEmbed(
  result: ScoreboardResult,
  quizDate: string,
): EmbedBuilder {
  const { scoreboard, roundNumbers } = result;
  const sorted = Object.entries(scoreboard).sort(([, a], [, b]) => b.total - a.total);

  const embed = new EmbedBuilder()
    .setTitle(`Scoreboard - ${quizDate}`)
    .setColor(0xe511c7);

  let position = 1;
  let i = 0;

  while (i < sorted.length) {
    const currentScore = sorted[i][1].total;
    const tied: [string, ScoreboardEntry][] = [];

    while (i < sorted.length && sorted[i][1].total === currentScore) {
      tied.push(sorted[i]);
      i++;
    }

    const place = ordinal(position);
    const joint = tied.length > 1 ? "joint " : "";
    const header = `${joint}${place} place - ${currentScore} points`;

    const value = tied.map(([name, entry]) => {
      const perRound = entry.rounds
        .map((score, idx) => `R${roundNumbers[idx]}: ${score}`)
        .join(", ");
      return `**${name}**: ${perRound}`;
    }).join("\n");

    embed.addFields({ name: header, value });
    position += tied.length;
  }

  if (!result.savedToFirestore) {
    embed.setFooter({ text: "Historic scoreboard - not saved" });
  }

  return embed;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("quiz-scoreboard")
    .setDescription("Generate and post the quiz leaderboard")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) =>
      opt
        .setName("date")
        .setDescription("Quiz date (defaults to today)")
        .setAutocomplete(true),
    ) as unknown as SlashCommandBuilder,

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused();
    const db = getDb();
    const result = await listQuizzes(db, interaction.guildId!);

    if (!result.ok) {
      await interaction.respond([]);
      return;
    }

    const today = getQuizDate();
    const choices = result.data
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((q) => ({
        name: `${q.date}${q.date === today ? " (today)" : ""}${q.status === "ended" ? " (ended)" : ""}`,
        value: q.date,
      }));

    const filtered = focused
      ? choices.filter((c) => c.name.includes(focused))
      : choices;

    await interaction.respond(filtered.slice(0, 25));
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const db = getDb();
    const quizDate = interaction.options.getString("date") ?? getQuizDate();

    logger.info({ quizDate, guild: interaction.guildId }, `[quiz-scoreboard] Generating scoreboard for ${quizDate}`);

    const result = await generateScoreboard({ db, guildId: interaction.guild.id, quizDate });

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed("Scoreboard Error", result.error)] });
      return;
    }

    const teamCount = Object.keys(result.data.scoreboard).length;
    logger.info({ quizDate, teamCount }, `[quiz-scoreboard] Scoreboard generated with ${teamCount} teams`);

    const embed = buildLeaderboardEmbed(result.data, quizDate);

    if (interaction.channel && "send" in interaction.channel) {
      await interaction.channel.send({ embeds: [embed] });
    }

    await interaction.deleteReply();
  },
};

export default command;
