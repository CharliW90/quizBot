import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { getFormIds, setFormId } from "../integrations/firestore/guild-config.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("quiz-setup")
    .setDescription("Configure a Google Form ID for a quiz round")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((opt) =>
      opt
        .setName("round")
        .setDescription("Round number")
        .setRequired(true)
        .setMinValue(1)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("form_id")
        .setDescription("Google Form ID or full URL")
        .setRequired(true)
    ) as unknown as SlashCommandBuilder,

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const db = getDb();
    const result = await getFormIds(db, interaction.guildId!);

    if (!result.ok) {
      await interaction.respond([]);
      return;
    }

    const existing = result.data;
    const keys = Object.keys(existing).map(Number).sort((a, b) => a - b);
    const nextRound = keys.length > 0 ? Math.max(...keys) + 1 : 1;

    const choices = [
      ...keys.map((n) => ({ name: `Round ${n} (overwrite)`, value: n })),
      { name: `Round ${nextRound} (next)`, value: nextRound },
    ];

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

    const roundNumber = interaction.options.getInteger("round", true);
    const formInput = interaction.options.getString("form_id", true);

    const db = getDb();
    const result = await setFormId(db, interaction.guild.id, roundNumber, formInput);

    if (!result.ok) {
      await interaction.reply({ embeds: [errorEmbed("Setup Error", result.error)], ephemeral: true });
      return;
    }

    const { overwritten, previousFormId } = result.data;
    const description = overwritten
      ? `Round ${roundNumber} form ID overwritten (was: \`${previousFormId}\`)`
      : `Round ${roundNumber} configured successfully`;

    await interaction.reply({
      embeds: [successEmbed("Quiz Setup", description)],
      ephemeral: true,
    });
  },
};

export default command;
