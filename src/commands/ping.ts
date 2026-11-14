import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { Command } from "../bot/types.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is responsive")
    .setDMPermission(false) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    const response = await interaction.reply({ content: "Pinging...", flags: MessageFlags.Ephemeral, withResponse: true });
    const roundtrip = response.resource!.message!.createdTimestamp - interaction.createdTimestamp;
    const ws = interaction.client.ws.ping;

    await interaction.editReply(
      `Pong! Latency: **${roundtrip}ms** | WebSocket: **${ws}ms**`
    );
  },
};

export default command;
