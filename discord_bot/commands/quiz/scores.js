const { MessageFlags, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { indexRounds, indexQuizzes, addScoreboardToFirestore } = require('../../functions/firestore');
const { quizDate } = require('../../database');
const scoreboardGenerator = require('../../functions/quiz/scoreboardGenerator');


module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('scores')
    .setDescription('generates the end of quiz scoreboard')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)  // admin only command
    .addStringOption(option => 
      option
        .setName('date')
        .setDescription('Which past quiz session to look at')
        .setAutocomplete(true)
    ),
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused();

    const {error, response} = await indexQuizzes(interaction.guildId);

    const quizSessions = response ?? error.message;

    const today = quizDate();
    const pastQuizzes = quizSessions.filter(session => session.date.name !== today.name);

    const filtered = pastQuizzes.filter(choice => choice.date.name.startsWith(focusedOption));
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
    const {error, response} = await indexRounds(interaction.guildId, interaction.options.getString('date'));
    if(error){
      throw error;
    }
    if(response.length === 0){
      await interaction.reply({content: 'There are no stored rounds to handle - use /fetch-responses first to load team responses from Google Forms',components: []});
      return;
    }
    const proceed = new ButtonBuilder() // allow user to proceed
      .setCustomId('continue')
      .setLabel('Continue')
      .setStyle(ButtonStyle.Primary);

    const cancel = new ButtonBuilder()  // allow user to cancel the command
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder()   // add the dropdown menu as a row in the reply message
      .addComponents(proceed, cancel)

    const userResponse = await interaction.reply({  // reply to the user asking which round they want
      content: `There are ${response.length} rounds stored - are you ready to generate the scoreboard?`,
      components: [row],
      flags: MessageFlags.Ephemeral,
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try {
      const fetcher = await userResponse.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });
      // if the user clicks cancel
      if(fetcher.customId === 'cancel'){
        await fetcher.update({ content: `Action cancelled.`, components: [] });
      } else if(fetcher.customId === 'continue'){
        const pastQuizDate = interaction.options.getString('date');
        scoreboardGenerator(interaction.guildId, response, pastQuizDate)
        .then(({error, response}) => {
          if(error){throw error}
          fetcher.update({ content: `:white_check_mark: Scoreboard generated`, components: []});
          interaction.channel.send({embeds: [response]});
          if(pastQuizDate){
            interaction.channel.send({content: `This is the historic scoreboard for ${pastQuizDate} - they cannot be amended.`})
            return
          }
          addScoreboardToFirestore(interaction.guildId, response)
          .then(({error, response}) => {
            if(error){throw error}
            interaction.channel.send({content: "Need to amend the data? Use /correction :wrench:\notherwise, if the quiz is over, don't forget to /end-quiz. :relaxed:"})
          })
          .catch((error) => {
            console.log(error)
          })
        })
      }
    } catch(e) {
      if(e.message === "Collector received no interactions before ending with reason: time"){
        // handles failure to reply to the initial response of 'which round do you want to fetch?'
        await userResponse.edit({ content: 'Response not received within 10 seconds, cancelling...', components: [] });
      } else {
        console.error("scores error handler:\nERR =>", e);
        await userResponse.edit({ content: `An unknown error occurred - see the logs for further details`, components: [] });
      }
    }
  }
}