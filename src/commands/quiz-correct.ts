import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import type { Command } from "../bot/types.js";
import { getDb } from "../integrations/firestore/client.js";
import { listRounds } from "../integrations/firestore/rounds.js";
import { listTeams } from "../integrations/firestore/teams.js";
import { correctTeamName } from "../services/correct-team-name.js";
import { errorEmbed, successEmbed } from "../utils/embeds.js";

function getQuizDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("quiz-correct")
    .setDescription("Fix a team name typo across all stored rounds")
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((opt) =>
      opt
        .setName("incorrect")
        .setDescription("The wrong team name (as it appears in responses)")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("correct")
        .setDescription("The correct team name (as registered)")
        .setRequired(true)
        .setAutocomplete(true)
    ) as unknown as SlashCommandBuilder,

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    const db = getDb();
    const quizDate = getQuizDate();

    if (focused.name === "incorrect") {
      const [roundsResult, teamsResult] = await Promise.all([
        listRounds(db, interaction.guildId!, quizDate),
        listTeams(db, interaction.guildId!, quizDate),
      ]);

      if (!roundsResult.ok) {
        await interaction.respond([]);
        return;
      }

      const registeredNames = new Set(
        teamsResult.ok ? teamsResult.data.map((t) => t.name) : []
      );

      const formNames = new Set<string>();
      for (const round of roundsResult.data) {
        for (const name of Object.keys(round.responses)) {
          if (!registeredNames.has(name)) {
            formNames.add(name);
          }
        }
      }

      const filtered = [...formNames]
        .filter((n) => n.toLowerCase().includes(focused.value.toLowerCase()))
        .slice(0, 25)
        .map((n) => ({ name: n, value: n }));

      await interaction.respond(filtered);
    } else {
      const teamsResult = await listTeams(db, interaction.guildId!, quizDate);

      if (!teamsResult.ok) {
        await interaction.respond([]);
        return;
      }

      const filtered = teamsResult.data
        .map((t) => t.name)
        .filter((n) => n.toLowerCase().includes(focused.value.toLowerCase()))
        .slice(0, 25)
        .map((n) => ({ name: n, value: n }));

      await interaction.respond(filtered);
    }
  },

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
      return;
    }

    const incorrectName = interaction.options.getString("incorrect", true);
    const correctName = interaction.options.getString("correct", true);
    const db = getDb();
    const quizDate = getQuizDate();

    const result = await correctTeamName({
      db,
      guildId: interaction.guild.id,
      quizDate,
      incorrectName,
      correctName,
    });

    if (!result.ok) {
      await interaction.reply({ embeds: [errorEmbed("Correction Error", result.error)], ephemeral: true });
      return;
    }

    const description = `"${incorrectName}" renamed to "${correctName}" in ${result.data.roundsCorrected} round${result.data.roundsCorrected !== 1 ? "s" : ""}. Alias saved for future fetches.`;

    await interaction.reply({
      embeds: [successEmbed("Team Name Corrected", description)],
      ephemeral: true,
    });
  },
};

export default command;
