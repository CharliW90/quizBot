const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { indexQuizzes, endQuiz } = require("../../functions/firestore");

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('end-quiz')
    .setDescription('ends a quiz session, preventing further edits')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)  // admin only command
    .addStringOption(option => 
      option
        .setName('date')
        .setDescription('Which quiz session to end')
        .setAutocomplete(true)
        .setRequired(true)
    ),
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused();

    const {error, response} = await indexQuizzes(interaction.guildId);

    const quizSessions = response ?? error.message;

    const openQuizzes = quizSessions.filter(session => !session.ended);

    const filtered = openQuizzes.filter(choice => choice.date.name.startsWith(focusedOption));
    filtered.sort((a, b) => {
      const dateA = a.date.code.replaceAll('-','');
      const dateB = b.date.code.replaceAll('-','');
      return dateB - dateA;
    });
    await interaction.respond(
      filtered.map(choice => ({ name: choice.date.name, value: choice.date.code}))
    )
  },
  async execute(interaction) {
    endQuiz(interaction.guildId, interaction.options.getString('date'))
    .then(({error, response}) => {
      if(error){interaction.reply(error.message)};
      interaction.reply({content: `Quiz for ${response.date} ended - no further updates, now read-only.`, ephemeral: true});
    })
  }
}