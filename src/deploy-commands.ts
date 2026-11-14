import { REST, Routes } from "discord.js";
import { join } from "node:path";
import { loadConfig } from "./utils/config";
import { loadCommands } from "./bot/loader";
import { logger } from "./utils/logger";

async function main() {
  const config = loadConfig();
  const commands = await loadCommands(join(__dirname, "commands"));

  const commandData = commands.map((cmd) => cmd.data.toJSON());

  const rest = new REST({ version: "10" }).setToken(config.DISCORD_TOKEN);

  logger.info(`Deploying ${commandData.length} command(s) to guild ${config.GUILD_ID}...`);

  await rest.put(
    Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID, config.GUILD_ID),
    { body: commandData },
  );

  logger.info("Commands deployed successfully.");
}

main().catch((error) => {
  logger.error(error, "Failed to deploy commands");
  process.exit(1);
});
