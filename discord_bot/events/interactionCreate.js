const { Events } = require('discord.js');
const { localisedLogging } = require('../logging');
const crypto = require('crypto');
const prepQuizEnvironment = require('../functions/quiz/prepQuizEnvironment');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
    if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()){
      return;
    }  
    
    logger = localisedLogging(new Error(), arguments, this)

		const command = interaction.client.commands.get(interaction.commandName);
    logger.debug({msg: `eventTicker: command = interaction.client.commands.get(${interaction.commandName}):`, command, interaction})
		if (!command) {
      logger.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
      if(interaction.isAutocomplete()){
        await command.autocomplete(interaction);
      } else {
        interaction.blob = crypto.randomUUID();
        prepQuizEnvironment(null, interaction.guild);
        await command.execute(interaction);
      }
		} catch (error) {
      logger.error(error)
      if(!interaction){
        logger.debug("No interaction")
        return;
      }
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	},
};