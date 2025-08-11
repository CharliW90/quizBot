// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');
const { token, clientId } = require('../config.json');

const logging = require('./logger.js');
const logger = logging.logger("discord");

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.commands = new Collection();
const commandsToDeploy = [];

// dynamically retrieve command files
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  // Set a new item in the Collection with the key as the command name and the value as the exported module
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
    commandsToDeploy.push(command.data.toJSON());
    logger.info(`Set command /${command.data.name}`)
  } else {
    logger.error(`The command at ${filePath} is missing a required "data" or "execute" property.`);
  }
}

// construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// deploy the commands
(async () => {
  try {
    logger.info(`Started refreshing ${commandsToDeploy.length} application (/) commands.`);
    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationCommands(clientId),
      { body: commandsToDeploy },
    );
    logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(`Failed to deploy commands: ${error}`);
  }
})();

client.login(token);

module.exports = { client }
