import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { listTeams } from "../integrations/firestore/teams.js";
import { resetQuiz } from "../services/reset-quiz.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const CONFIRMATION_TIMEOUT_MS = 60_000;

function getQuizDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("quiz-reset")
    .setDescription("Delete all team roles, channels, and Firestore data for today's quiz")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) as unknown as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const db = getDb();
    const quizDate = getQuizDate();

    const teamsResult = await listTeams(db, interaction.guild.id, quizDate);
    const teamCount = teamsResult.ok ? teamsResult.data.length : 0;

    if (teamCount === 0) {
      await interaction.reply({ embeds: [errorEmbed("Nothing to Reset", "No teams found for today's quiz.")], ephemeral: true });
      return;
    }

    const teamNames = teamsResult.ok
      ? teamsResult.data.map((t) => t.name).join(", ")
      : "";

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("confirm").setLabel("Reset Everything").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );

    const confirmation = await interaction.reply({
      content: `**CAUTION: Quiz Reset**\n\nThis will delete **${teamCount} teams** (${teamNames}) - their roles, channels, and Firestore data.\n\nThis cannot be undone.`,
      components: [row],
      ephemeral: true,
    });

    try {
      const reply = await confirmation.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: CONFIRMATION_TIMEOUT_MS,
      });

      if (reply.customId === "cancel") {
        await interaction.editReply({ content: "Cancelled.", components: [] });
        return;
      }

      await interaction.editReply({ content: "Resetting...", components: [] });

      const result = await resetQuiz({
        db,
        guildId: interaction.guild.id,
        quizDate,
        guild: interaction.guild,
      });

      if (!result.ok) {
        await interaction.editReply({ embeds: [errorEmbed("Reset Error", result.error)], components: [] });
        return;
      }

      const { rolesDeleted, channelsDeleted, teamsDeleted } = result.data;
      const description = [
        `${teamsDeleted} team${teamsDeleted !== 1 ? "s" : ""} removed from Firestore`,
        `${rolesDeleted} role${rolesDeleted !== 1 ? "s" : ""} deleted`,
        `${channelsDeleted} channel${channelsDeleted !== 1 ? "s" : ""} deleted`,
      ].join("\n");

      await interaction.editReply({
        embeds: [successEmbed("Quiz Reset Complete", description)],
        components: [],
      });
    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.message.includes("reason: time");
      if (isTimeout) {
        await interaction.editReply({ content: "Timed out.", components: [] });
      } else {
        logger.error({ error: e }, "Quiz-reset command error");
        await interaction.editReply({ embeds: [errorEmbed("Error", "Something went wrong.")], components: [] });
      }
    }
  },
};

export default command;
