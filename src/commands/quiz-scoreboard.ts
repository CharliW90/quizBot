import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { generateScoreboard } from "../services/generate-scoreboard.js";
import { errorEmbed } from "../utils/embeds.js";
import type { ScoreboardEntry } from "../integrations/firestore/scoreboard.js";

function getQuizDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const pluralRules = new Intl.PluralRules("en-US", { type: "ordinal" });
const suffixes: Record<string, string> = { one: "st", two: "nd", few: "rd", other: "th" };

function ordinal(n: number): string {
  return `${n}${suffixes[pluralRules.select(n)]}`;
}

function buildLeaderboardEmbed(scoreboard: Record<string, ScoreboardEntry>): EmbedBuilder {
  const sorted = Object.entries(scoreboard).sort(([, a], [, b]) => b.total - a.total);

  const embed = new EmbedBuilder()
    .setTitle("Scoreboard")
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

    const value = tied
      .map(([name, entry]) => `**${name}**: ${entry.rounds.join(", ")}`)
      .join("\n");

    embed.addFields({ name: header, value });
    position += tied.length;
  }

  return embed;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("quiz-scoreboard")
    .setDescription("Generate and post the quiz leaderboard")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) as unknown as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const db = getDb();
    const quizDate = getQuizDate();

    const result = await generateScoreboard({ db, guildId: interaction.guild.id, quizDate });

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed("Scoreboard Error", result.error)] });
      return;
    }

    const embed = buildLeaderboardEmbed(result.data);

    if (interaction.channel && "send" in interaction.channel) {
      await interaction.channel.send({ embeds: [embed] });
    }

    await interaction.deleteReply();
  },
};

export default command;
