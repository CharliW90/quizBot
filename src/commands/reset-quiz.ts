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
import { resetQuiz, discoverQuizTeamCategory, discoverTeamRoles } from "../services/reset-quiz.js";
import { getDb } from "../integrations/firestore/client.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const CONFIRMATION_TIMEOUT_MS = 60_000;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("reset-quiz")
    .setDescription("Delete all team roles, channels, and quiz data from the server")
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

    const guild = interaction.guild;
    const category = discoverQuizTeamCategory(guild);
    const teamRoles = discoverTeamRoles(guild);

    const channelNames: string[] = [];
    if (category) {
      for (const [, channel] of category.children.cache) {
        channelNames.push(channel.name);
      }
    }

    if (channelNames.length === 0 && teamRoles.length === 0) {
      await interaction.reply({
        embeds: [errorEmbed("Nothing to Reset", "No team channels or roles found on this server.")],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const details: string[] = [];
    if (channelNames.length > 0) {
      details.push(`**${channelNames.length} channel${channelNames.length !== 1 ? "s" : ""}**: ${channelNames.join(", ")}`);
    }
    if (teamRoles.length > 0) {
      details.push(`**${teamRoles.length} role${teamRoles.length !== 1 ? "s" : ""}**: ${teamRoles.map((r) => r.name.replace("Team: ", "")).join(", ")}`);
    }

    logger.info(
      { channels: channelNames.length, roles: teamRoles.length, guild: interaction.guildId },
      `[reset-quiz] Reset requested (${channelNames.length} channels, ${teamRoles.length} roles)`,
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("confirm")
        .setLabel("Reset Everything")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
    );

    const confirmation = await interaction.reply({
      content: `**CAUTION: Quiz Reset**\n\nThis will delete:\n${details.join("\n")}\n\nPlus Team Captain and Teams role assignments.\n\nThis cannot be undone.`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });

    try {
      const reply = await confirmation.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: CONFIRMATION_TIMEOUT_MS,
      });

      if (reply.customId === "cancel") {
        logger.info("[reset-quiz] User cancelled");
        await interaction.editReply({ content: "Cancelled.", components: [] });
        return;
      }

      logger.info("[reset-quiz] User confirmed reset");
      await interaction.editReply({ content: "Resetting...", components: [] });

      const db = getDb();
      const result = await resetQuiz({
        db,
        guildId: guild.id,
        guild,
      });

      if (!result.ok) {
        await interaction.editReply({
          embeds: [errorEmbed("Reset Error", result.error)],
          components: [],
        });
        return;
      }

      const { channelsDeleted, rolesDeleted, captainRolesCleared, teamsRolesCleared, firestoreTeamsDeleted } = result.data;
      logger.info(
        { channelsDeleted, rolesDeleted, captainRolesCleared, teamsRolesCleared, firestoreTeamsDeleted },
        "[reset-quiz] Reset complete",
      );

      const lines = [
        `${channelsDeleted} channel${channelsDeleted !== 1 ? "s" : ""} deleted`,
        `${rolesDeleted} role${rolesDeleted !== 1 ? "s" : ""} deleted`,
      ];
      if (captainRolesCleared > 0) lines.push(`${captainRolesCleared} captain role${captainRolesCleared !== 1 ? "s" : ""} cleared`);
      if (teamsRolesCleared > 0) lines.push(`${teamsRolesCleared} Teams role${teamsRolesCleared !== 1 ? "s" : ""} cleared`);
      if (firestoreTeamsDeleted > 0) lines.push(`${firestoreTeamsDeleted} team${firestoreTeamsDeleted !== 1 ? "s" : ""} removed from Firestore`);

      await interaction.editReply({
        embeds: [successEmbed("Quiz Reset Complete", lines.join("\n"))],
        components: [],
      });
    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.message.includes("reason: time");
      if (isTimeout) {
        await interaction.editReply({ content: "Timed out.", components: [] });
      } else {
        logger.error({ error: e }, "Quiz-reset command error");
        await interaction.editReply({
          embeds: [errorEmbed("Error", "Something went wrong.")],
          components: [],
        });
      }
    }
  },
};

export default command;
