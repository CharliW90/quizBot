const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  category: 'utility',
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with Pong!')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addBooleanOption(option =>
      option
      .setName('bool')
      .setDescription('Do you want me to respond?')
      .setRequired(false)),
	async execute(interaction) {
    const trigger = interaction.options.getBoolean('bool') ?? true
    if(trigger){
      await interaction.reply('Pong!');
    } else {
      await interaction.reply('Me? I heard nothing...')
    }
	},
};