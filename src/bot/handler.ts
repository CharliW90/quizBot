import { Collection, Interaction } from "discord.js";
import { logger } from "../utils/logger";
import type { Command } from "./types";

export function createInteractionHandler(commands: Collection<string, Command>) {
  return async (interaction: Interaction) => {
    if (interaction.isAutocomplete()) {
      const command = commands.get(interaction.commandName);
      if (!command?.autocomplete) return;

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error({ error, command: interaction.commandName }, "Autocomplete failed");
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);

    if (!command) {
      await interaction.reply({
        content: `Command \`${interaction.commandName}\` not found.`,
        ephemeral: true,
      });
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      logger.error({ error, command: interaction.commandName }, "Command execution failed");

      const content = "An unexpected error occurred. Please try again later.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
    }
  };
}
