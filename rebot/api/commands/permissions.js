const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { permissions_check } = require('../../core/rebot_permissions.js')
const { permissionsError } = require('../../core/errors.js')
const logging = require('../logger.js');

const logger = logging.logger("permissions")

module.exports = {
  category: 'admin',
	data: new SlashCommandBuilder()
		.setName('permissions-check')
		.setDescription('checks the permissions that this bot has')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
	async execute(interaction) {
    try {
      const {error, response} = await permissions_check()
      if(error){
        throw permissionsError(error.message)
      };

      logger.info(`Permissions Check returned: ${response}`);
      await interaction.editReply(response.message);
      return;
    } catch(error){
      logger.error(error);
      await interaction.editReply(`Sorry - I encountered an error.  Please check the logs for further details.`);
      return;
    }
	},
};