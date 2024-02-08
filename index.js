// Require the necessary discord.js classes
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

// dynamically retrieve command files
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// dynamically retrieve all event files
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter((file) => {return file.endsWith('.js')});

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => {return event.execute(...args)});
	} else {
		client.on(event.name, (...args) => {return event.execute(...args)});
	}
}

// handle slash commands
client.on(Events.InteractionCreate, async (interaction) => {
  if(!interaction.isChatInputCommand()) {
    return  //use Discord's native flag for slash commands (aka input commands) to ignore interactions that are not slash commands
  }
  if(!command){
    console.error(`No command matching ${interaction.commandName} was found.`)
    return;
  }
  command.execute(interaction)
  .then(() => {})
  .catch((err) => {
    if(interaction.replied || interaction.deferred){
      interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true })
      .then(() => {
        console.error(err);
        return;
      })
    } else {
      interaction.reply({ content: "There was an error while executing this command!", ephemeral: true })
      .then(() => {
        console.error(err);
        return;
      })
    }
  })
})

// Log in to Discord with client token
client.login(token);