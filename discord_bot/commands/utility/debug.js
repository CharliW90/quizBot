const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { toggleDebug, localisedLogging } = require('../../logger')
const { ownerId, elevatedUsers } = require('../../config.json')

module.exports = {
  category: 'utility',
	data: new SlashCommandBuilder()
		.setName('debug')
		.setDescription('Sets debugging on/off')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addBooleanOption(option =>
      option
      .setName('bool')
      .setDescription('Do you want to turn the debugger on?')
      .setRequired(true)),
	async execute(interaction) {
    logger = localisedLogging(new Error(), arguments, this)
    logger.info(`Command '${interaction.commandName}' called by ${interaction.user?.globalName || interaction.user.username || interaction.user.id}`)
    if(interaction.user.id !== ownerId && !elevatedUsers.includes(interaction.user.id)){
      logger.warn(`${interaction.user?.globalName || interaction.user.username || interaction.user.id} attempted to toggle debug`)
      await interaction.reply("You do not have permission to perform this command.")
    } else {
      await interaction.reply("`" + toggleDebug(interaction.options.getBoolean('bool'), interaction.user.globalName) + "`")
    }
	},
};