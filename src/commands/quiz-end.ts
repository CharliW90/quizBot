import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { endQuiz } from "../integrations/firestore/quiz.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import { getQuizDate } from "../utils/quiz-date.js";

const CONFIRMATION_TIMEOUT_MS = 60_000;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("quiz-end")
    .setDescription("End the current quiz session (prevents further changes)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageChannels,
    ) as unknown as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("confirm").setLabel("End Quiz").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
    );

    const quizDate = getQuizDate();

    logger.info({ quizDate, guild: interaction.guildId }, `[quiz-end] Ending quiz for ${quizDate}`);

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
        logger.info({ quizDate }, "[quiz-end] User cancelled");
        await interaction.editReply({ content: "Cancelled.", components: [] });
        return;
      }

      logger.info({ quizDate }, "[quiz-end] User confirmed");
      const db = getDb();
      const result = await endQuiz(db, interaction.guild.id, quizDate);

      if (!result.ok) {
        await interaction.editReply({
          embeds: [errorEmbed("End Quiz Error", result.error)],
          components: [],
        });
        return;
      }

      logger.info({ quizDate }, `[quiz-end] Quiz ended for ${quizDate}`);
      await interaction.editReply({
        embeds: [
          successEmbed(
            "Quiz Ended",
            `Quiz for ${quizDate} has been ended. No further modifications allowed.`,
          ),
        ],
        components: [],
      });
    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.message.includes("reason: time");
      if (isTimeout) {
        await interaction.editReply({ content: "Timed out.", components: [] });
      } else {
        logger.error({ error: e }, "Quiz-end command error");
        await interaction.editReply({
          embeds: [errorEmbed("Error", "Something went wrong.")],
          components: [],
        });
      }
    }
  },
};

export default command;
