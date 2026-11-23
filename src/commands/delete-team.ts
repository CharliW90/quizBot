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
import { getTeam } from "../integrations/firestore/teams.js";
import { deleteTeamByRole } from "../services/delete-team.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";
import { getQuizDate } from "../utils/quiz-date.js";

const CONFIRMATION_TIMEOUT_MS = 60_000;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("delete-team")
    .setDescription("Delete an entire team (admin only)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) =>
      opt
        .setName("team")
        .setDescription("The team to delete")
        .setRequired(true)
        .setAutocomplete(true),
    ) as unknown as SlashCommandBuilder,

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const guild = interaction.guild!;

    const teamRoles = guild.roles.cache.filter((r) => r.name.startsWith("Team: "));
    const filtered = teamRoles.filter((r) => r.name.toLowerCase().includes(focused.toLowerCase()));

    await interaction.respond(
      [...filtered.values()].slice(0, 25).map((r) => ({
        name: r.name.replace("Team: ", ""),
        value: r.name,
      })),
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guild = interaction.guild;
    const db = getDb();
    const quizDate = getQuizDate();
    const teamInput = interaction.options.getString("team", true);
    const teamName = teamInput.replace("Team: ", "");

    logger.info({ teamName, guild: guild.id }, `[delete-team] Requested deletion of "${teamName}"`);

    // Try role by name first, then fall back to Firestore + stored ID
    let teamRole = guild.roles.cache.find((r) => r.name === `Team: ${teamName}`);
    if (!teamRole) {
      const teamResult = await getTeam(db, guild.id, quizDate, teamName);
      if (teamResult.ok) {
        teamRole = guild.roles.cache.get(teamResult.data.roleId);
      }
    }
    if (!teamRole) {
      await interaction.reply({
        embeds: [errorEmbed("Not Found", `Could not find team "${teamName}"`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const teamResult = await getTeam(db, guild.id, quizDate, teamName);
    if (!teamResult.ok) {
      await interaction.reply({
        embeds: [errorEmbed("Not Found", `Team "${teamName}" not found in database`)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const team = teamResult.data;

    // Confirmation with danger styling
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("delete")
        .setLabel("Delete Team")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary),
    );

    const confirmation = await interaction.reply({
      content: `Are you sure you want to completely delete **${teamRole.name}**? This will remove the role, channels, and all Firestore data.`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });

    try {
      const reply = await confirmation.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: CONFIRMATION_TIMEOUT_MS,
      });

      if (reply.customId === "cancel") {
        logger.info({ teamName }, "[delete-team] User cancelled deletion");
        await interaction.editReply({ content: "Cancelled.", components: [] });
        return;
      }

      logger.info({ teamName }, "[delete-team] User confirmed deletion");
      await interaction.editReply({ content: "Deleting team...", components: [] });

      const result = await deleteTeamByRole({ guild, db, quizDate }, teamRole, team);

      if (!result.ok) {
        await interaction.editReply({ embeds: [errorEmbed("Deletion Failed", result.error)] });
        return;
      }

      const summary = [
        `Role: ${result.data.deletedRole}`,
        `Channels: ${result.data.deletedChannels.join(", ") || "none found"}`,
        `Members affected: ${result.data.removedMemberCount}`,
      ].join("\n");

      logger.info(
        { teamName, deletedRole: result.data.deletedRole, deletedChannels: result.data.deletedChannels, removedMembers: result.data.removedMemberCount },
        `[delete-team] Deletion complete for "${teamName}"`,
      );

      if (interaction.channel && "send" in interaction.channel) {
        await interaction.channel.send({
          embeds: [successEmbed(`Deleted ${teamRole.name}`, summary)],
        });
      }
      await interaction.deleteReply();
    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.message.includes("reason: time");
      if (isTimeout) {
        await interaction.editReply({ content: "Timed out.", components: [] });
      } else {
        logger.error({ error: e }, "Delete-team command error");
        await interaction.editReply({
          embeds: [errorEmbed("Error", "Something went wrong.")],
          components: [],
        });
      }
    }
  },
};

export default command;
