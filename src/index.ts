import { REST, Routes } from "discord.js";
import { join } from "node:path";
import { createBot, loadCommands, createInteractionHandler } from "./bot/index.js";
import { loadConfig } from "./utils/config.js";
import { logger } from "./utils/logger.js";

async function main() {
  const config = loadConfig();
  const { client, login } = createBot();

  const commands = await loadCommands(join(import.meta.dirname, "commands"));
  logger.info(`Loaded ${commands.size} command(s)`);

  const handler = createInteractionHandler(commands);
  client.on("interactionCreate", handler);

  const commandData = commands.map((cmd) => cmd.data.toJSON());
  const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.GUILD_ID), {
    body: commandData,
  });
  logger.info(`Registered ${commandData.length} command(s) with Discord`);

  await login();
}

main().catch((error) => {
  logger.error(error, "Fatal startup error");
  process.exit(1);
});
