import {
  ChatInputCommandInteraction,
  GuildMember,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { createFormsClient } from "../integrations/forms/client.js";
import { checkStatus, type StatusResult } from "../services/check-status.js";
import { EmbedBuilder } from "discord.js";

const REQUIRED_PERMISSIONS = ["ManageChannels", "ManageRoles"];

function statusLine(label: string, healthy: boolean, detail: string): string {
  const icon = healthy ? "✅" : "❌";
  return `${icon}  **${label}** - ${detail}`;
}

function formatResult(result: StatusResult): EmbedBuilder {
  const allHealthy = result.firestore.healthy && result.formsApi.healthy && result.permissions.healthy;

  const lines: string[] = [];

  lines.push(statusLine(
    "Firestore",
    result.firestore.healthy,
    result.firestore.healthy ? "Connected" : result.firestore.reason,
  ));

  lines.push(statusLine(
    "Google Forms",
    result.formsApi.healthy,
    result.formsApi.healthy ? "Authenticated" : result.formsApi.reason,
  ));

  if (result.permissions.healthy) {
    lines.push(statusLine("Permissions", true, "All granted"));
  } else {
    lines.push(statusLine("Permissions", false, `Missing: ${result.permissions.missing.join(", ")}`));
  }

  lines.push(statusLine("Uptime", true, result.uptime));

  return new EmbedBuilder()
    .setTitle("Bot Status")
    .setDescription(lines.join("\n"))
    .setColor(allHealthy ? 0x2ecc71 : 0xe74c3c);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show integration health and bot status")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild!;
    const me = guild.members.me!;
    const botPermissions = me.permissions.toArray().map(String);

    const db = getDb();
    const formsClient = createFormsClient();

    const result = await checkStatus({
      pingFirestore: async () => { await db.listCollections(); },
      pingFormsApi: async () => { await formsClient.getForm("__ping__"); },
      botPermissions,
      requiredPermissions: REQUIRED_PERMISSIONS,
      uptimeMs: interaction.client.uptime,
    });

    await interaction.editReply({ embeds: [formatResult(result)] });
  },
};

export default command;
