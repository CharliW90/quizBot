const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const {localisedLogging} = require('./logging')

const logger = localisedLogging(new Error(), arguments, this)

const commands = [];
// fetch all the command folders from the commands directory
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath).filter(folder => !folder.match(/^.*\..+$/));

for (const folder of commandFolders) {
	// fetch all the command files from the commands directory
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// retrieve the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
      logger.debug({msg: `command loaded (${command.data.name}):`, filePath, command})
			commands.push(command.data.toJSON());
      logger.info(`loaded command /${command.data.name}`)
		} else {
      logger.debug({msg: `command not loaded:`, filePath, command})
			logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}
logger.debug({msg: `commands:`, commands})

// construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// deploy commands
(async () => {
	try {
		logger.info(`Started refreshing ${commands.length} application (/) commands.`);
		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			// Routes.applicationGuildCommands(clientId, guildId), // uncomment this to be private (commands only available on development server)
      Routes.applicationCommands(clientId),  // uncomment this to be public (all commands become available to all servers)
			{ body: commands },
		);
		logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    logger.debug({msg: `client updated with reloaded slash command data:`, data})
	} catch(error) {
		logger.error({msg: "catch(error)", error});
	}
})();