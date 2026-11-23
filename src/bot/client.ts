import { Client, GatewayIntentBits } from "discord.js";
import { loadConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

export function createBot() {
  const config = loadConfig();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  const shutdown = () => {
    logger.info("Shutting down...");
    client.destroy();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const login = async () => {
    client.once("clientReady", () => {
      logger.info(`Logged in as ${client.user?.tag}`);
    });

    await client.login(config.DISCORD_TOKEN);
  };

  return { client, login };
}
