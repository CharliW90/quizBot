import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { migrateGuild, type QuizDetail } from "../services/migrate/migrate-guild.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

const STATUS_ICON = {
  ok: "✅",
  warning: "⚠️",
  skip: "❌",
} as const;

function formatDryRunEmbed(quizDetails: QuizDetail[], userCount: number): EmbedBuilder {
  const lines: string[] = [];

  for (const q of quizDetails) {
    const icon = STATUS_ICON[q.status];
    if (q.status === "skip") {
      lines.push(`${icon} **${q.date}** - empty, would skip`);
    } else {
      lines.push(`${icon} **${q.date}** - ${q.teamCount} team${q.teamCount !== 1 ? "s" : ""}, ${q.roundCount} round${q.roundCount !== 1 ? "s" : ""}`);
      for (const warning of q.warnings) {
        lines.push(`  └ ${warning}`);
      }
    }
  }

  const okCount = quizDetails.filter((q) => q.status === "ok").length;
  const warnCount = quizDetails.filter((q) => q.status === "warning").length;
  const skipCount = quizDetails.filter((q) => q.status === "skip").length;

  lines.push("");
  lines.push(`**Summary:** ${okCount} clean, ${warnCount} with warnings, ${skipCount} skipped`);
  lines.push(`**Users:** ${userCount} found`);

  return new EmbedBuilder()
    .setTitle("Migration Dry Run")
    .setDescription(lines.join("\n"))
    .setColor(warnCount > 0 ? 0xf39c12 : 0x2ecc71);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("migrate")
    .setDescription("One-time migration of all V3 quiz and user data to V4 format")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((opt) =>
      opt
        .setName("dry_run")
        .setDescription("Preview what would be migrated without writing anything"),
    ) as unknown as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const guildId = interaction.guild!.id;
    const db = getDb();
    const dryRun = interaction.options.getBoolean("dry_run") ?? false;

    logger.info({ guildId, dryRun }, "[migrate] Starting migration");
    const result = await migrateGuild(db, guildId, dryRun);

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed("Migration Error", result.error)] });
      return;
    }

    const { quizzesMigrated, totalTeams, totalRounds, usersMigrated } = result.data;
    logger.info({ quizzesMigrated, totalTeams, totalRounds, usersMigrated, dryRun }, "[migrate] Migration complete");

    if (dryRun && result.data.quizDetails) {
      await interaction.editReply({
        embeds: [formatDryRunEmbed(result.data.quizDetails, usersMigrated)],
      });
      return;
    }

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
