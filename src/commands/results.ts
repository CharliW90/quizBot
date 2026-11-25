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
import { listRounds } from "../integrations/firestore/rounds.js";
import { listQuizzes } from "../integrations/firestore/quiz.js";
import { sendRound } from "../services/send-round.js";
import { errorEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import { getQuizDate } from "../utils/quiz-date.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("results")
    .setDescription("Send stored round results to team channels")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((opt) =>
      opt
        .setName("round")
        .setDescription("Round number to send")
        .setRequired(true)
        .setMinValue(1)
        .setAutocomplete(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("date")
        .setDescription("Quiz date (defaults to today)")
        .setAutocomplete(true),
    ) as unknown as SlashCommandBuilder,

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused(true);
    const db = getDb();

    if (focused.name === "date") {
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

      const filtered = focused.value
        ? choices.filter((c) => c.name.includes(focused.value))
        : choices;

      await interaction.respond(filtered.slice(0, 25));
      return;
    }

    const quizDate = interaction.options.getString("date") ?? getQuizDate();
    const result = await listRounds(db, interaction.guildId!, quizDate);

    if (!result.ok) {
      await interaction.respond([]);
      return;
    }

    const choices = result.data
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .map((r) => ({
        name: `Round ${r.roundNumber}${r.publishedAt ? " (sent)" : ""}`,
        value: r.roundNumber,
      }));

    const filtered = focused.value ? choices.filter((c) => String(c.value).startsWith(focused.value)) : choices;

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

    const roundNumber = interaction.options.getInteger("round", true);
    const quizDate = interaction.options.getString("date") ?? getQuizDate();

    logger.info({ roundNumber, quizDate, guild: interaction.guildId }, `[results] Sending round ${roundNumber} for ${quizDate}`);

    const db = getDb();

    const result = await sendRound({
      db,
      guildId: interaction.guild.id,
      quizDate,
      roundNumber,
      guild: interaction.guild,
    });

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed("Send Error", result.error)] });
      return;
    }

    const { successes, failures, missingTeams } = result.data;
    logger.info(
      { roundNumber, successes: successes.length, failures: failures.length, missing: missingTeams.length },
      `[results] Round ${roundNumber} sent`,
    );

    const embed = new EmbedBuilder()
      .setTitle(`Round ${roundNumber} - Send Results`)
      .setColor(failures.length === 0 && missingTeams.length === 0 ? 0x2ecc71 : successes.length > 0 ? 0xf39c12 : 0xe74c3c);

    if (successes.length > 0) {
      embed.addFields({
        name: `Sent (${successes.length})`,
        value: successes.map((s) => s.teamName).join("\n"),
      });
    }

    if (failures.length > 0) {
      embed.addFields({
        name: `Failed (${failures.length})`,
        value: failures.map((f) => `**${f.teamName}**: ${f.reason}`).join("\n"),
      });
    }

    if (missingTeams.length > 0) {
      embed.addFields({
        name: `No submission (${missingTeams.length})`,
        value: missingTeams.map((m) => m.teamName).join("\n"),
      });
    }

    if (successes.length === 0 && failures.length === 0) {
      embed.setDescription("No team responses found for this round.");
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
