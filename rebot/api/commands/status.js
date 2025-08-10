const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { engineInteraction } = require('../../core/compute_engine_interactor.js');
const { engineInteractionError } = require('../../core/errors.js')
const logging = require('../logger.js');

const logger = logging.logger("status")

module.exports = {
  category: 'admin',
	data: new SlashCommandBuilder()
		.setName('status-check')
		.setDescription('returns the status of the QuizBot cloud compute engine')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
	async execute(interaction) {
    try {
      const {error, response} = await engineInteraction('check');
      if(error){
        throw engineInteractionError(error.message)
      };

      logger.info(`Engine Interaction Status Check returned: ${response}`);
      await interaction.reply(response.message);
      return;
    } catch(error){
      logger.error(error);
      await interaction.reply(`Sorry - I encountered an error.  Please check the logs for further details.`);
      return;
    }
	},
};