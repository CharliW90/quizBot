import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { migrateGuild } from "../services/migrate/migrate-guild.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("migrate")
    .setDescription("One-time migration of all V3 quiz and user data to V4 format")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guild!.id;
    const db = getDb();

    const result = await migrateGuild(db, guildId);

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed("Migration Error", result.error)] });
      return;
    }

    const { quizzesMigrated, totalTeams, totalRounds, usersMigrated } = result.data;

    const summary = [
      `**Quizzes migrated:** ${quizzesMigrated}`,
      `**Total teams:** ${totalTeams}`,
      `**Total rounds:** ${totalRounds}`,
      `**Users migrated:** ${usersMigrated}`,
    ].join("\n");

    await interaction.editReply({
      embeds: [successEmbed("Migration Complete", summary)],
    });
  },
};

export default command;
