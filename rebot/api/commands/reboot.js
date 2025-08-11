const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { engineInteraction } = require('../../core/compute_engine_interactor.js');
const { engineInteractionError } = require('../../core/errors.js')
const logging = require('../logger.js');

const logger = logging.logger("shutdown")

module.exports = {
  category: 'admin',
	data: new SlashCommandBuilder()
		.setName('reboot')
		.setDescription('attempts to shutdown the QuizBot cloud compute engine')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
	async execute(interaction) {
    try {
      const {checkError, checkResponse} = await engineInteraction('check');
      if(checkError){ throw engineInteractionError(checkError.message) };
      const [_, status] = checkResponse.message.split(":");

      // There are 8 possible statuses, and a reboot should only be carried out on a RUNNING or SUSPENDED instance
      let situation = "Request received - attempting to shutdown bot.";
      let action;
      switch(status.toUpperCase()){
        case "REPAIRING":
        case "PROVISIONING":
        case "SUSPENDING":
        case "STAGING":
        case "STOPPING":
          situation = `Bot is ${status} - please wait for this action to complete before attempting to reboot.`
          logger.warn(situation);
          interaction.editReply(situation);
          return;
        case "TERMINATED":
          situation = `Bot is ${status} - please use startup command to start the bot.`
          logger.warn(situation);
          interaction.editReply(situation);
          return;
        case "RUNNING":
        case "SUSPENDED":
          action = 'reset';
          break;
        default:
          situation = `ERROR: Bot status reported as ${status} - no known process in place for starting from this status.`;
          logger.error(situation);
          interaction.editReply(situation);
          return;
      }

      const { error, response } = await engineInteraction(action);
      if(error){
        throw engineInteractionError(error.message);
      }

      logger.info(`Engine Interaction '${action}' returned: ${response}`);

      interaction.editReply(response.message);
      return;
    } catch(error){
      logger.error(error);
      interaction.editReply(`Sorry - I encountered an error.  Please check the logs for further details.`);
      return;
    }
	},
};