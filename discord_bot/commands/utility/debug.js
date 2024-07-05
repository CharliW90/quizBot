const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const {logger, toggleDebug} = require('../../logger')

module.exports = {
  category: 'utility',
	data: new SlashCommandBuilder()
		.setName('debug')
		.setDescription('Sets debugging on/off')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addBooleanOption(option =>
      option
      .setName('bool')
      .setDescription('Do you want to the debugger on?')
      .setRequired(true)),
	async execute(interaction) {
    const trigger = interaction.options.getBoolean('bool')
    if(trigger){
      logger.level = 'debug'
      logger.debug(`debug logs activated by ${interaction.user.globalName}`)
      await interaction.reply('\`Logging set to debug level and above; trace suppressed\`');
    } else {
      logger.level = 'info'
      logger.info(`debug logs deactivated by ${interaction.user.globalName}`)
      await interaction.reply('\`Logging set to info level and above; debug and trace suppressed\`');
    }
	},
};