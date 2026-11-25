import {
  ActionRowBuilder,
  AutocompleteInteraction,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { endQuiz, listQuizzes } from "../integrations/firestore/quiz.js";
import { getScoreboard } from "../integrations/firestore/scoreboard.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import { getQuizDate } from "../utils/quiz-date.js";

const CONFIRMATION_TIMEOUT_MS = 60_000;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("end-quiz")
    .setDescription("End a quiz session (prevents further changes)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) =>
      opt
        .setName("date")
        .setDescription("Quiz date to end (defaults to today)")
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
      .filter((q) => q.status === "active")
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((q) => ({
        name: `${q.date}${q.date === today ? " (today)" : ""}`,
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

    const quizDate = interaction.options.getString("date") ?? getQuizDate();

    logger.info({ quizDate, guild: interaction.guildId }, `[end-quiz] Ending quiz for ${quizDate}`);

    const db = getDb();

    const scoreboard = await getScoreboard(db, interaction.guild.id, quizDate);
    if (scoreboard.ok && scoreboard.data === null) {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("confirm").setLabel("End Anyway").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
      );

      const warning = await interaction.reply({
        content: `**Warning:** Quiz for **${quizDate}** has no scoreboard yet. Ending it now means scores cannot be generated later.\n\nEnd anyway?`,
        components: [row],
        flags: MessageFlags.Ephemeral,
      });

      try {
        const reply = await warning.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: CONFIRMATION_TIMEOUT_MS,
        });

        if (reply.customId === "cancel") {
          await interaction.editReply({ content: "Cancelled.", components: [] });
          return;
        }
      } catch {
        await interaction.editReply({ content: "Timed out.", components: [] });
        return;
      }
    } else {
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("confirm").setLabel("End Quiz").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
      );

      const confirmation = await interaction.reply({
        content: `Are you sure you want to end the quiz for **${quizDate}**? This will prevent any further fetches, corrections, or score updates.`,
        components: [row],
        flags: MessageFlags.Ephemeral,
      });

      try {
        const reply = await confirmation.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: CONFIRMATION_TIMEOUT_MS,
        });

        if (reply.customId === "cancel") {
          logger.info({ quizDate }, "[end-quiz] User cancelled");
          await interaction.editReply({ content: "Cancelled.", components: [] });
          return;
        }
      } catch {
        await interaction.editReply({ content: "Timed out.", components: [] });
        return;
      }
    }

    logger.info({ quizDate }, "[end-quiz] User confirmed");
    const result = await endQuiz(db, interaction.guild.id, quizDate);

    if (!result.ok) {
      await interaction.editReply({
        embeds: [errorEmbed("End Quiz Error", result.error)],
        components: [],
      });
      return;
    }

    logger.info({ quizDate }, `[end-quiz] Quiz ended for ${quizDate}`);
    await interaction.editReply({
      embeds: [
        successEmbed(
          "Quiz Ended",
          `Quiz for ${quizDate} has been ended. No further modifications allowed.`,
        ),
      ],
      components: [],
    });
  },
};

export default command;
