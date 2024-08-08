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
      .setDescription('Do you want to the debugger on?')
      .setRequired(true)),
	async execute(interaction) {
    if(interaction.user.id !== ownerId && !elevatedUsers.includes(interaction.user.id)){
      interaction.reply("You do not have permission to perform this command.")
    } else {
      const trigger = interaction.options.getBoolean('bool')
      const response = toggleDebug(trigger, interaction.user.globalName)
      await interaction.reply("`" + response + "`")
    }
	},
};