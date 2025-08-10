const { Events } = require('discord.js');
const logging = require('../logger.js')

const logger = logging.logger("interactionCreate")

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
    if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()){
      return;
    }  
    
		const command = interaction.client.commands.get(interaction.commandName);
		if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
      await command.execute(interaction);
		} catch (error) {
      logger.error(error)
      if(!interaction){
        logger.error("No interaction")
        return;
      }
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!' });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!' });
			}
		}
	},
};