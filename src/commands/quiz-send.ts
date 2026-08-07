import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { listRounds } from "../integrations/firestore/rounds.js";
import { sendRound } from "../services/send-round.js";
import { errorEmbed } from "../utils/embeds.js";

function getQuizDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("quiz-send")
    .setDescription("Send stored round results to team channels")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((opt) =>
      opt
        .setName("round")
        .setDescription("Round number to send")
        .setRequired(true)
        .setMinValue(1)
        .setAutocomplete(true)
    ) as unknown as SlashCommandBuilder,

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const db = getDb();
    const quizDate = getQuizDate();
    const result = await listRounds(db, interaction.guildId!, quizDate);

    if (!result.ok) {
      await interaction.respond([]);
      return;
    }

    const choices = result.data
      .sort((a, b) => a.roundNumber - b.roundNumber)
      .map((r) => ({
        name: `Round ${r.roundNumber}${r.publishedAt ? " (sent)" : ""}`,
        value: r.roundNumber,
      }));

    const filtered = focused
      ? choices.filter((c) => String(c.value).startsWith(focused))
      : choices;

    await interaction.respond(filtered.slice(0, 25));
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const roundNumber = interaction.options.getInteger("round", true);
    const db = getDb();
    const quizDate = getQuizDate();

    const result = await sendRound({
      db,
      guildId: interaction.guild.id,
      quizDate,
      roundNumber,
      guild: interaction.guild,
    });

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed("Send Error", result.error)] });
      return;
    }

    const { successes, failures } = result.data;
    const embed = new EmbedBuilder()
      .setTitle(`Round ${roundNumber} - Send Results`)
      .setColor(failures.length === 0 ? 0x2ecc71 : successes.length > 0 ? 0xf39c12 : 0xe74c3c);

    if (successes.length > 0) {
      embed.addFields({
        name: `Sent (${successes.length})`,
        value: successes.map((s) => s.teamName).join("\n"),
      });
    }

    if (failures.length > 0) {
      embed.addFields({
        name: `Failed (${failures.length})`,
        value: failures.map((f) => `**${f.teamName}**: ${f.reason}`).join("\n"),
      });
    }

    if (successes.length === 0 && failures.length === 0) {
      embed.setDescription("No team responses found for this round.");
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default command;
