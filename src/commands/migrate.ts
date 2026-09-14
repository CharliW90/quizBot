import {
  ChatInputCommandInteraction,
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
    .setDescription("One-time migration of V3 quiz data to V4 format")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt
        .setName("quiz_date")
        .setDescription("Quiz date to migrate (YYYY-MM-DD)")
        .setRequired(true)
    ) as unknown as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild!.id;
    const quizDate = interaction.options.getString("quiz_date", true);
    const db = getDb();

    const result = await migrateGuild(db, guildId, quizDate);

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed("Migration Error", result.error)] });
      return;
    }

    const { teamsMigrated, roundsMigrated, aliasesMigrated, membersMigrated, quizStatus } = result.data;

    const summary = [
      `**Quiz date:** ${quizDate} (${quizStatus})`,
      `**Teams:** ${teamsMigrated}`,
      `**Rounds:** ${roundsMigrated}`,
      `**Aliases:** ${aliasesMigrated ? "migrated" : "none found"}`,
      `**Members map:** ${membersMigrated ? "migrated" : "none found"}`,
    ].join("\n");

    await interaction.editReply({
      embeds: [successEmbed("Migration Complete", summary)],
    });
  },
};

export default command;
