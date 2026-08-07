import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { createFormsClient } from "../integrations/forms/client.js";
import { getFormIds } from "../integrations/firestore/guild-config.js";
import { fetchRound } from "../services/fetch-round.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";
import { logger } from "../utils/logger.js";

function getQuizDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("quiz-fetch")
    .setDescription("Fetch responses from a round's Google Form")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((opt) =>
      opt
        .setName("round")
        .setDescription("Round number to fetch")
        .setRequired(true)
        .setMinValue(1)
        .setAutocomplete(true)
    ) as unknown as SlashCommandBuilder,

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const db = getDb();
    const result = await getFormIds(db, interaction.guildId!);

    if (!result.ok) {
      await interaction.respond([]);
      return;
    }

    const keys = Object.keys(result.data).map(Number).sort((a, b) => a - b);
    const choices = keys.map((n) => ({ name: `Round ${n}`, value: n }));

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
    const formsClient = createFormsClient();
    const quizDate = getQuizDate();

    const result = await fetchRound({
      db,
      guildId: interaction.guild.id,
      quizDate,
      roundNumber,
      formsClient,
    });

    if (!result.ok) {
      await interaction.editReply({ embeds: [errorEmbed("Fetch Error", result.error)] });
      return;
    }

    const teamCount = Object.keys(result.data.responses).length;
    const description = `Round ${roundNumber} fetched - ${teamCount} team response${teamCount !== 1 ? "s" : ""} stored.`;

    await interaction.editReply({
      embeds: [successEmbed("Fetch Complete", description)],
    });
  },
};

export default command;
