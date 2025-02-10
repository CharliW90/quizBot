// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { localisedLogging } = require('./logging')
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

const logger = localisedLogging(new Error(), arguments, this)

// Create a new client instance
logger.info("Creating new Client instance...")
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

logger.info("Preparing slash-commands Collection...")
client.commands = new Collection();

// dynamically retrieve command files
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath).filter(folder => !folder.match(/^.*\..+$/));

logger.info(`Setting commands from ${commandFolders.length} found directories...`)

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	logger.info(`Setting ${commandFiles.length} ${folder} commands...`)
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			logger.debug({ msg: `command loaded (${command.data.name}):`, filePath, command })
			client.commands.set(command.data.name, command);
			logger.info(`Set command /${command.data.name}`)
		} else {
			logger.debug({ msg: `command not loaded:`, filePath, command })
			logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
logger.debug({ msg: `commands:`, commands: client.commands })

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}
logger.debug({ msg: `client prepared:`, client })

client.login(token);