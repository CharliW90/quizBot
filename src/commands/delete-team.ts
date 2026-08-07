import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { deleteTeamByRole } from "../services/delete-team.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const CONFIRMATION_TIMEOUT_MS = 60_000;

function getQuizDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("delete-team")
    .setDescription("Delete an entire team (admin only)")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) =>
      opt.setName("team").setDescription("The team to delete").setRequired(true).setAutocomplete(true)
    ) as unknown as SlashCommandBuilder,

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const guild = interaction.guild!;

    const teamRoles = guild.roles.cache.filter((r) => r.name.startsWith("Team: "));
    const filtered = teamRoles.filter((r) =>
      r.name.toLowerCase().includes(focused.toLowerCase())
    );

    await interaction.respond(
      [...filtered.values()].slice(0, 25).map((r) => ({
        name: r.name.replace("Team: ", ""),
        value: r.name,
      }))
    );
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const guild = interaction.guild;
    let teamInput = interaction.options.getString("team", true);
    if (!teamInput.includes("Team: ")) {
      teamInput = `Team: ${teamInput}`;
    }

    const teamRole = guild.roles.cache.find((r) => r.name === teamInput);
    if (!teamRole) {
      await interaction.reply({ embeds: [errorEmbed("Not Found", `Could not find role "${teamInput}"`)], ephemeral: true });
      return;
    }

    // Confirmation with danger styling
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("delete").setLabel("Delete Team").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );

    const confirmation = await interaction.reply({
      content: `Are you sure you want to completely delete **${teamRole.name}**? This will remove the role, channels, and all Firestore data.`,
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

      await interaction.editReply({ content: "Deleting team...", components: [] });

      const db = getDb();
      const quizDate = getQuizDate();
      const result = await deleteTeamByRole({ guild, db, quizDate }, teamRole);

      if (!result.ok) {
        await interaction.editReply({ embeds: [errorEmbed("Deletion Failed", result.error)] });
        return;
      }

      const summary = [
        `Role: ${result.data.deletedRole}`,
        `Channels: ${result.data.deletedChannels.join(", ") || "none found"}`,
        `Members affected: ${result.data.removedMemberCount}`,
      ].join("\n");

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
        await interaction.editReply({ embeds: [errorEmbed("Error", "Something went wrong.")], components: [] });
      }
    }
  },
};

export default command;
