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
import { removeMembers } from "../services/team-members.js";
import { errorEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const CONFIRMATION_TIMEOUT_MS = 60_000;

function getQuizDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Leave your current quiz team")
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const member = interaction.member as GuildMember;

    // Admins should use /delete-team instead
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.editReply({
        embeds: [errorEmbed("Wrong Command", "Admins should use `/delete-team` to manage teams.")],
      });
      return;
    }

    // Find user's team role
    const teamRole = member.roles.cache.find((r) => r.name.startsWith("Team: "));
    if (!teamRole) {
      await interaction.editReply({
        embeds: [errorEmbed("Not In a Team", "You are not currently in a team.")],
      });
      return;
    }

    // Check this wouldn't leave an empty team
    await guild.members.fetch();
    const roleMembers = guild.members.cache.filter((m) => m.roles.cache.has(teamRole.id));
    if (roleMembers.size < 2) {
      await interaction.editReply({
        embeds: [errorEmbed(
          "Would Leave Empty Team",
          "You are the only member. Ask an admin to use `/delete-team` instead."
        )],
      });
      return;
    }

    // Check user is not the captain
    const captainRole = guild.roles.cache.find((r) => r.name === "Team Captain");
    if (captainRole && member.roles.cache.has(captainRole.id)) {
      await interaction.editReply({
        embeds: [errorEmbed(
          "Cannot Leave as Captain",
          "You are the team captain. Use `/team promote-to-captain` first to transfer captaincy, then leave."
        )],
      });
      return;
    }

    // Confirmation
    const teamCaptain = captainRole
      ? roleMembers.find((m) => m.roles.cache.has(captainRole.id))
      : undefined;
    const otherMembers = roleMembers.filter((m) => m.id !== member.id && m.id !== teamCaptain?.id);

    const confirmEmbed = new EmbedBuilder()
      .setColor(teamRole.color)
      .setTitle(`Leave ${teamRole.name}?`)
      .addFields(
        { name: "Team", value: teamRole.name },
        { name: "Captain", value: teamCaptain ? `${teamCaptain}` : "Unknown" },
        ...(otherMembers.size > 0
          ? [{ name: "Remaining Members", value: [...otherMembers.values()].map((m) => `${m}`).join("\n") }]
          : [])
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("confirm").setLabel("Leave Team").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      content: "Are you sure you want to leave your team?",
      embeds: [confirmEmbed],
      components: [row],
    });

    try {
      const reply = await interaction.fetchReply().then((msg) =>
        msg.awaitMessageComponent({
          filter: (i) => i.user.id === interaction.user.id,
          time: CONFIRMATION_TIMEOUT_MS,
        })
      );

      if (reply.customId === "cancel") {
        await interaction.editReply({ content: "Cancelled.", embeds: [], components: [] });
        return;
      }

      const db = getDb();
      const quizDate = getQuizDate();
      const teamName = teamRole.name.replace("Team: ", "");
      const ctx = { guild, db, quizDate, teamName, teamRole };

      const result = await removeMembers(ctx, [member]);

      if (!result.ok) {
        await interaction.editReply({ embeds: [errorEmbed("Failed", result.error)], components: [] });
        return;
      }

      await interaction.editReply({ content: `You have left ${teamRole.name}.`, embeds: [], components: [] });

      // Notify the team channel
      const teamChannelName = teamName.toLowerCase().replaceAll(" ", "-");
      const teamChannel = guild.channels.cache.find((ch) => ch.name === teamChannelName);
      if (teamChannel && "send" in teamChannel && interaction.channelId !== teamChannel.id) {
        await teamChannel.send({ content: `${interaction.user} has left the team.` });
      }
    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.message.includes("reason: time");
      if (isTimeout) {
        await interaction.editReply({ content: "Timed out.", embeds: [], components: [] });
      } else {
        logger.error({ error: e }, "Leave command error");
        await interaction.editReply({ embeds: [errorEmbed("Error", "Something went wrong.")], components: [] });
      }
    }
  },
};

export default command;
