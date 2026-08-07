import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  Role,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { addMembers, removeMembers, promoteToCaptain } from "../services/team-members.js";
import { errorEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const CONFIRMATION_TIMEOUT_MS = 60_000;

function getQuizDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("team")
    .setDescription("Manage a team")
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName("add-member")
        .setDescription("Add a new member to the team")
        .addStringOption((opt) =>
          opt.setName("team").setDescription("The team to modify").setRequired(true).setAutocomplete(true)
        )
        .addUserOption((opt) => opt.setName("member").setDescription("The member to add").setRequired(true))
        .addUserOption((opt) => opt.setName("member-2").setDescription("Another member to add"))
        .addUserOption((opt) => opt.setName("member-3").setDescription("Another member to add"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove-member")
        .setDescription("Remove a member from the team")
        .addStringOption((opt) =>
          opt.setName("team").setDescription("The team to modify").setRequired(true).setAutocomplete(true)
        )
        .addUserOption((opt) => opt.setName("member").setDescription("The member to remove").setRequired(true))
        .addUserOption((opt) => opt.setName("member-2").setDescription("Another member to remove"))
        .addUserOption((opt) => opt.setName("member-3").setDescription("Another member to remove"))
    )
    .addSubcommand((sub) =>
      sub
        .setName("promote-to-captain")
        .setDescription("Promote a team member to team captain")
        .addStringOption((opt) =>
          opt.setName("team").setDescription("The team to modify").setRequired(true).setAutocomplete(true)
        )
        .addUserOption((opt) => opt.setName("member").setDescription("The new captain").setRequired(true))
    ) as unknown as SlashCommandBuilder,

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const guild = interaction.guild!;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;

    const teamRoles = guild.roles.cache.filter((r) => r.name.startsWith("Team: "));
    const userRoleIds = (interaction.member as GuildMember).roles.cache;

    const manageable = teamRoles.filter(
      (role) => isAdmin || userRoleIds.has(role.id)
    );

    const filtered = manageable.filter((r) =>
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

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ?? false;

    // Resolve team role
    let teamInput = interaction.options.getString("team", true);
    if (!teamInput.includes("Team: ")) {
      teamInput = `Team: ${teamInput}`;
    }

    const teamRole = guild.roles.cache.find((r) => r.name === teamInput);
    if (!teamRole) {
      await interaction.editReply({ embeds: [errorEmbed("Team Not Found", `Could not find role "${teamInput}"`)] });
      return;
    }

    // Permission check: must be admin or captain of this team
    const captainRole = guild.roles.cache.find((r) => r.name === "Team Captain");
    const memberRoles = (interaction.member as GuildMember).roles.cache;
    const isTeamCaptain = captainRole && memberRoles.has(captainRole.id) && memberRoles.has(teamRole.id);

    if (!isAdmin && !isTeamCaptain) {
      await interaction.editReply({
        embeds: [errorEmbed("Permission Denied", `You are not the Team Captain of ${teamRole.name}`)],
      });
      return;
    }

    // Collect members
    const members: GuildMember[] = [];
    for (const key of ["member", "member-2", "member-3"]) {
      const m = interaction.options.getMember(key) as GuildMember | null;
      if (m) members.push(m);
    }

    // Validate no bots or admins
    const bots = members.filter((m) => m.user.bot);
    const admins = members.filter((m) => m.permissions.has(PermissionFlagsBits.Administrator));
    if (bots.length > 0 || admins.length > 0) {
      const issues: string[] = [];
      if (bots.length > 0) issues.push(`Bots cannot be team members: ${bots.join(", ")}`);
      if (admins.length > 0) issues.push(`Admins cannot be team members: ${admins.join(", ")}`);
      await interaction.editReply({ embeds: [errorEmbed("Invalid Members", issues.join("\n"))] });
      return;
    }

    // Find current team composition
    await guild.members.fetch();
    const roleMembers = guild.members.cache.filter((m) => m.roles.cache.has(teamRole.id));
    const teamCaptain = captainRole
      ? roleMembers.find((m) => m.roles.cache.has(captainRole.id))
      : undefined;

    const subcommand = interaction.options.getSubcommand();

    // Confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setColor(teamRole.color)
      .setTitle("Team Amendment")
      .addFields(
        { name: "Team", value: teamRole.name },
        { name: "Captain", value: teamCaptain ? `${teamCaptain}` : "Unknown" },
        { name: formatSubcommandLabel(subcommand), value: members.map((m) => `${m}`).join("\n") }
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("confirm").setLabel("Update Team").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)
    );

    await interaction.editReply({
      content: "Please review your amendments and confirm.",
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
        await interaction.editReply({ content: "Action cancelled.", embeds: [], components: [] });
        return;
      }

      await interaction.editReply({ content: "Updating team...", embeds: [], components: [] });

      const db = getDb();
      const quizDate = getQuizDate();
      const teamName = teamRole.name.replace("Team: ", "");
      const ctx = { guild, db, quizDate, teamName, teamRole };

      let result;
      if (subcommand === "add-member") {
        result = await addMembers(ctx, members);
      } else if (subcommand === "remove-member") {
        result = await removeMembers(ctx, members);
      } else {
        if (!teamCaptain) {
          await interaction.editReply({ embeds: [errorEmbed("Error", "Could not find current team captain")] });
          return;
        }
        result = await promoteToCaptain(ctx, teamCaptain, members[0]);
      }

      if (!result.ok) {
        await interaction.editReply({ embeds: [errorEmbed("Update Failed", result.error)] });
        return;
      }

      await interaction.editReply({ content: "Done." });
    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.message.includes("reason: time");
      if (isTimeout) {
        await interaction.editReply({ content: "Timed out - no response received within 60 seconds.", embeds: [], components: [] });
      } else {
        logger.error({ error: e }, "Team command error");
        await interaction.editReply({ embeds: [errorEmbed("Error", "Something went wrong. Please try again.")], components: [] });
      }
    }
  },
};

function formatSubcommandLabel(subcommand: string): string {
  switch (subcommand) {
    case "add-member": return "Adding";
    case "remove-member": return "Removing";
    case "promote-to-captain": return "Promoting to Captain";
    default: return subcommand;
  }
}

export default command;
