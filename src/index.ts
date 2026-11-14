import { join } from "node:path";
import { createBot, loadCommands, createInteractionHandler } from "./bot";
import { logger } from "./utils/logger";

async function main() {
  const { client, login } = createBot();

  const commands = await loadCommands(join(__dirname, "commands"));
  logger.info(`Loaded ${commands.size} command(s)`);

  const handler = createInteractionHandler(commands);
  client.on("interactionCreate", handler);

  await login();
}

main().catch((error) => {
  logger.error(error, "Fatal startup error");
  process.exit(1);
});
