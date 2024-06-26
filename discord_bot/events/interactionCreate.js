const { Events } = require('discord.js');
const prepQuizEnvironment = require('../functions/quiz/prepQuizEnvironment');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()){
      return;
    }  

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
      if(interaction.isAutocomplete()){
        await command.autocomplete(interaction);
      } else {
        prepQuizEnvironment(null, interaction.guild);
        await command.execute(interaction);
      }
		} catch (error) {
			console.error(error);
      if(!interaction){
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