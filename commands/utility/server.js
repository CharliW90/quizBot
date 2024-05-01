const { SlashCommandBuilder } = require('discord.js');
const testCommand = require('../../functions/deleteVoiceChannel.js')

module.exports = {
	category: 'utility',
	data: new SlashCommandBuilder()
		.setName('server')
		.setDescription('Provides information about the server.'),
	async execute(interaction) {
		// interaction.guild is the object representing the Guild in which the command was run
    const testResult = await testCommand(interaction, {name: "test"}, "just because...")
		await interaction.reply(`This server is ${interaction.guild.name} and has ${interaction.guild.memberCount} members. You asked for ${testResult}`);
	},
};