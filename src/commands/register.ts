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
import { getUserTeamNames } from "../integrations/firestore/users.js";
import { checkMembersRegistered } from "../integrations/firestore/members.js";
import { lookupAlias } from "../integrations/firestore/aliases.js";
import { validateTeamRegistration, type TeamValidationInput } from "../services/validate-team.js";
import { registerTeam } from "../services/register-team.js";
import { textifyTeamName } from "../utils/textify.js";
import { errorEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const COLOUR_CHOICES = [
  { name: "Random (default)", value: "Random" },
  { name: "Green", value: "Green" },
  { name: "Aqua", value: "Aqua" },
  { name: "Blue", value: "Blue" },
  { name: "Blurple", value: "Blurple" },
  { name: "Pink", value: "Fuchsia" },
  { name: "Orange", value: "Orange" },
  { name: "Yellow", value: "Yellow" },
  { name: "Dark Green", value: "DarkGreen" },
  { name: "Dark Blue", value: "DarkBlue" },
  { name: "Dark Purple", value: "DarkPurple" },
  { name: "Dark Pink", value: "DarkVividPink" },
  { name: "Dark Orange", value: "DarkOrange" },
  { name: "Dark Red", value: "DarkRed" },
  { name: "Greyple", value: "Greyple" },
  { name: "White", value: "White" },
] as const;

const CONFIRMATION_TIMEOUT_MS = 60_000;
const CATEGORY_NAME = "QUIZ TEAMS";
const BOT_ROLE_NAME = "Quizzy";

function resolveColour(choice: string): number {
  if (choice === "Random") {
    return Math.floor(Math.random() * 0xffffff);
  }
  const colours: Record<string, number> = {
    Green: 0x57f287,
    Aqua: 0x1abc9c,
    Blue: 0x3498db,
    Blurple: 0x5865f2,
    Fuchsia: 0xeb459e,
    Orange: 0xe67e22,
    Yellow: 0xfee75c,
    DarkGreen: 0x1f8b4c,
    DarkBlue: 0x206694,
    DarkPurple: 0x71368a,
    DarkVividPink: 0xe91e63,
    DarkOrange: 0xa84300,
    DarkRed: 0x992d22,
    Greyple: 0x99aab5,
    White: 0xffffff,
  };
  return colours[choice] ?? Math.floor(Math.random() * 0xffffff);
}

function getQuizDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Register a new quiz team")
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("team-name")
        .setDescription("The name of the team to register")
        .setMinLength(4)
        .setMaxLength(64)
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addUserOption((option) =>
      option.setName("team-captain").setDescription("Team Captain").setRequired(true)
    )
    .addUserOption((option) =>
      option.setName("team-member-1").setDescription("Team Member")
    )
    .addUserOption((option) =>
      option.setName("team-member-2").setDescription("Team Member")
    )
    .addUserOption((option) =>
      option.setName("team-member-3").setDescription("Team Member")
    )
    .addStringOption((option) =>
      option
        .setName("colour")
        .setDescription("Team Colour")
        .addChoices(...COLOUR_CHOICES)
    ) as unknown as SlashCommandBuilder,

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const db = getDb();
    const result = await getUserTeamNames(db, interaction.user.id, interaction.guildId!);
    const names = result.ok ? result.data : [];
    const filtered = names.filter((n) => n.toLowerCase().startsWith(focused.toLowerCase()));
    await interaction.respond(filtered.slice(0, 25).map((n) => ({ name: n, value: n })));
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const teamName = interaction.options.getString("team-name", true).trim();
    const captainMember = interaction.options.getMember("team-captain") as GuildMember | null;

    if (!captainMember) {
      await interaction.reply({ embeds: [errorEmbed("Invalid Captain", "Could not resolve the team captain.")], ephemeral: true });
      return;
    }

    const members: GuildMember[] = [];
    for (const key of ["team-member-1", "team-member-2", "team-member-3"]) {
      const m = interaction.options.getMember(key) as GuildMember | null;
      if (m) members.push(m);
    }

    const allMembers = [captainMember, ...members];
    const allMemberIds = allMembers.map((m) => m.id);
    const colourChoice = interaction.options.getString("colour") ?? "Random";
    const colour = resolveColour(colourChoice);
    const textifiedName = textifyTeamName(teamName);
    const db = getDb();
    const quizDate = getQuizDate();

    // Gather validation inputs
    const guild = interaction.guild;
    const existingRoleNames = guild.roles.cache.map((r) => r.name);
    const existingChannelNames = guild.channels.cache.map((ch) => ch.name);

    const adminIds = guild.members.cache
      .filter((m) => m.permissions.has(PermissionFlagsBits.Administrator))
      .map((m) => m.id);
    const botIds = allMembers.filter((m) => m.user.bot).map((m) => m.id);
    const adminMemberIds = allMembers.filter((m) => adminIds.includes(m.id)).map((m) => m.id);

    const aliasResult = await lookupAlias(db, interaction.guildId, quizDate, textifiedName);
    const aliasMatch = aliasResult.ok ? aliasResult.data : null;

    const conflictsResult = await checkMembersRegistered(db, interaction.guildId, quizDate, allMemberIds);
    const memberConflicts = conflictsResult.ok ? conflictsResult.data : [];

    const validationInput: TeamValidationInput = {
      teamName,
      textifiedName,
      captainId: captainMember.id,
      memberIds: allMemberIds,
      requestingUserId: interaction.user.id,
      isRequesterAdmin: adminIds.includes(interaction.user.id),
      existingRoleNames,
      existingChannelNames,
      botUserIds: botIds,
      adminUserIds: adminMemberIds,
      aliasMatch,
      memberConflicts,
    };

    const validationErrors = validateTeamRegistration(validationInput);

    if (validationErrors.length > 0) {
      const description = validationErrors
        .map((e) => formatValidationError(e, allMembers))
        .join("\n");
      await interaction.reply({
        embeds: [errorEmbed("Registration Not Valid", description)],
        ephemeral: true,
      });
      return;
    }

    // Confirmation flow
    const confirmEmbed = new EmbedBuilder()
      .setColor(colour)
      .setTitle("Draft Quiz Team to Register")
      .addFields(
        { name: "Team Name", value: teamName },
        { name: "Captain", value: `${captainMember}` },
        ...(members.length > 0
          ? [{ name: "Members", value: members.map((m) => `${m}`).join("\n") }]
          : [])
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("register").setLabel("Register Team").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("cancel").setLabel("Cancel").setStyle(ButtonStyle.Danger)
    );

    const confirmation = await interaction.reply({
      content: "Please review your draft team registration and confirm the details.",
      embeds: [confirmEmbed],
      components: [row],
      ephemeral: true,
    });

    try {
      const reply = await confirmation.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        time: CONFIRMATION_TIMEOUT_MS,
      });

      if (reply.customId === "cancel") {
        await interaction.editReply({ content: "Registration cancelled.", embeds: [], components: [] });
        return;
      }

      await interaction.editReply({ content: "Registering your team...", components: [] });

      const result = await registerTeam(
        { teamName, captain: captainMember, members, color: colour },
        { guild, db, quizDate, botRoleName: BOT_ROLE_NAME, categoryName: CATEGORY_NAME }
      );

      if (!result.ok) {
        await interaction.editReply({
          content: "",
          embeds: [errorEmbed("Registration Failed", result.error)],
        });
        return;
      }

      // Public success message
      const successEmbed = new EmbedBuilder()
        .setColor(colour)
        .setTitle("Registration Successful")
        .addFields(
          {
            name: "Team Name",
            value: textifiedName !== teamName.toLowerCase()
              ? `${teamName} (${textifiedName})`
              : teamName,
          },
          { name: "Team Captain", value: `${captainMember}` },
          ...(members.length > 0
            ? [{ name: "Team Members", value: members.map((m) => `${m}`).join("\n") }]
            : [])
        );

      if (interaction.channel && "send" in interaction.channel) {
        await interaction.channel.send({ embeds: [successEmbed] });
      }
      await interaction.deleteReply();

      // DMs
      await sendRegistrationDMs(interaction.user.id, captainMember, members, teamName);
    } catch (e: unknown) {
      const isTimeout =
        e instanceof Error && e.message.includes("reason: time");
      if (isTimeout) {
        await interaction.editReply({
          content: "Registration timed out - no response received within 60 seconds.",
          embeds: [],
          components: [],
        });
      } else {
        logger.error({ error: e }, "Register command error");
        await interaction.editReply({
          content: "",
          embeds: [errorEmbed("Unexpected Error", "Something went wrong. Please try again.")],
          components: [],
        });
      }
    }
  },
};

async function sendRegistrationDMs(
  requesterId: string,
  captain: GuildMember,
  members: GuildMember[],
  teamName: string
): Promise<void> {
  try {
    if (captain.id !== requesterId) {
      await captain.send(`Hey there - you've been registered as the team captain for Team: ${teamName}`);
    }
    for (const member of members) {
      if (member.id !== requesterId) {
        await member.send(
          `Hey there - you've been registered as a member of Team: ${teamName}\n` +
          `Think this is incorrect? You can leave the team with the /leave command.\n\n` +
          `Good luck, have fun!`
        );
      }
    }
  } catch {
    // DM failures are non-fatal (users may have DMs disabled)
  }
}

function formatValidationError(
  error: ReturnType<typeof validateTeamRegistration>[number],
  members: GuildMember[]
): string {
  switch (error.type) {
    case "not_self_registering":
      return "You must include yourself in the team to register it.";
    case "duplicate_role":
      return `A role already exists: ${error.names.join(", ")}`;
    case "duplicate_channel":
      return `A channel already exists: ${error.names.join(", ")}`;
    case "alias_collision":
      return `Team name already taken by: ${error.existingTeam}`;
    case "members_already_registered":
      return error.conflicts
        .map((c) => {
          const m = members.find((mem) => mem.id === c.userId);
          return `${m ?? c.userId} is already in Team: ${c.teamName}`;
        })
        .join("\n");
    case "admin_members":
      return `Server admins cannot be team members: ${error.userIds.map((id) => members.find((m) => m.id === id) ?? id).join(", ")}`;
    case "bot_members":
      return `Bots cannot be team members: ${error.userIds.map((id) => members.find((m) => m.id === id) ?? id).join(", ")}`;
  }
}

export default command;
