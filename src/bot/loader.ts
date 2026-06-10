import { Collection } from "discord.js";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { logger } from "../utils/logger";
import type { Command } from "./types";

function isValidCommand(value: unknown): value is Command {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "execute" in value &&
    typeof (value as Command).data.name === "string" &&
    typeof (value as Command).execute === "function"
  );
}

export async function loadCommands(
  commandsDir: string,
): Promise<Collection<string, Command>> {
  const commands = new Collection<string, Command>();

  const entries = readdirSync(commandsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".js")) continue;
    if (entry.name.includes(".test.")) continue;

    const filePath = join(commandsDir, entry.name);
    const module = await import(filePath);
    const command = module.default;

    if (!isValidCommand(command)) {
      logger.warn(`Skipping ${entry.name}: no valid command export`);
      continue;
    }

    commands.set(command.data.name, command);
    logger.info(`Loaded command: ${command.data.name}`);
  }

  return commands;
}
