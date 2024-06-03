const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { autocomplete } = require('../quiz/team');

module.exports = {
  category: 'utility',
  data: new SlashCommandBuilder()
    .setName('reload')
    .setDescription('Reloads a command.')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)  // admin only command
    .addStringOption(option =>
      option.setName('command')
        .setDescription('The command to reload.')
        .setRequired(true)
        .setAutocomplete(true)),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused();

    const commands = [...interaction.client.commands.keys()].sort();

    const filtered = commands.filter(choice => choice.startsWith(focusedOption));
    await interaction.respond(
      filtered.map(choice => ({ name: choice, value: choice}))
    );
  },
  async execute(interaction) {
    const commandName = interaction.options.getString('command', true).toLowerCase();
    const command = interaction.client.commands.get(commandName);

    if (!command) {
      return interaction.reply({content: `There is no command with name \`${commandName}\`!`, ephemeral: true});
    }

    delete require.cache[require.resolve(`../${command.category}/${command.data.name}.js`)];

    try {
      interaction.client.commands.delete(command.data.name);
      const newCommand = require(`../${command.category}/${command.data.name}.js`);
      interaction.client.commands.set(newCommand.data.name, newCommand);
      await interaction.reply({content: `Command \`${newCommand.data.name}\` was reloaded!`, ephemeral: true});
    } catch (error) {
      console.error(error);
      await interaction.reply({content: `There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``, ephemeral: true});
    }
  },
};