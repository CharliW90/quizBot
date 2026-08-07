import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import type { Command } from "../bot/types.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is responsive")
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({ content: "Pinging...", ephemeral: true, fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const ws = interaction.client.ws.ping;

    await interaction.editReply(
      `Pong! Latency: **${roundtrip}ms** | WebSocket: **${ws}ms**`
    );
  },
};

export default command;
