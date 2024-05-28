const { SlashCommandBuilder } = require('discord.js');
const testCommand = require('../../functions/forms/fetchFormResponses.js')

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('testingcommand')
    .setDescription('tests the function currently tied to this command'),
  async execute(interaction) {
    await interaction.deferReply();
    const testResult = await testCommand()
    await interaction.editReply(testResult);
  },
};