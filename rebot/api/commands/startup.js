const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { engineInteraction } = require('../../core/compute_engine_interactor.js');
const logging = require('../logger.js');

const logger = logging.logger("startup")

module.exports = {
  category: 'admin',
    data: new SlashCommandBuilder()
      .setName('startup')
      .setDescription('attempts to start up the QuizBot cloud compute engine')
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    async execute(interaction) {
      try {
        let {error, response} = await engineInteraction('check');
        if(error){ throw engineInteractionError(error.message) }
        const [_, status] = response.message.split(":")
  
      // There are 8 possible statuses, and a startup should only be carried out on a 'TERMINATED' or 'SUSPENDED' instance
      let situation = "Request received - attempting to startup bot."
      let action
      switch(status.toUpperCase()){
        case "REPAIRING":
        case "SUSPENDING":
        case "STOPPING":
          situation = `Bot is ${status} - please wait for this action to complete before attempting to start up.`
          logger.warn(situation);
          interaction.editReply(situation);
          return;
        case "PROVISIONING":
        case "STAGING":
        case "RUNNING":
          situation = `Bot is already ${status}.`;
          logger.warn(situation);
          interaction.editReply(situation);
          return;
        case "SUSPENDED":
          action = "resume"
          break;
        case "TERMINATED":
          action = "start"
          break
        default:
          situation = `ERROR: Bot status reported as ${status} - no known process in place for starting from this status.`;
          logger.error(situation)
          interaction.editReply(situation)
          return;
      }
  
        ({ error, response } = await engineInteraction(action))
        if(error){
          throw engineInteractionError(error.message)
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