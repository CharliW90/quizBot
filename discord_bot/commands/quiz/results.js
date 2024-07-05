const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { summarise } = require('../../functions/forms/fetchFormResponses.js');
const { followUp, hold } = require('../../functions/forms/holdFormResponses.js');
const { indexRounds, getResponseFromFirestore, indexQuizzes } = require('../../functions/firestore');
const { quizDate } = require('../../database.js');

// A command to fetch embed messages for teams from storage, and send them to the teams

const sent = [];

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('results')
    .setDescription('handles stored responses')
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
    const dropdown = new StringSelectMenuBuilder()  // ask the user which round number they want results for
      .setCustomId('roundNumberToFetch')
      .setPlaceholder('Choose which round number to handle')
    
    response.forEach((round) => {
      const roundNumber = round.split(' ')[1];
      const label = sent.includes(roundNumber) ? `${round}  (already sent)` : round
      dropdown.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(label)
          .setValue(roundNumber),
      )
    });

    const cancel = new ButtonBuilder()  // allow user to cancel the command
      .setCustomId('cancel')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder()   // add the dropdown menu as a row in the reply message
      .addComponents(dropdown)

    const row2 = new ActionRowBuilder()   // add the cancel button as a second row in the reply
      .addComponents(cancel)

    const userResponse = await interaction.reply({  // reply to the user asking which round they want
      content: 'Choose which round of answers to handle',
      components: [row1, row2],
      ephemeral: true,
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try {
      const fetcher = await userResponse.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });
      // if the user clicks cancel
      if(fetcher.customId === 'cancel'){
        await fetcher.update({ content: `Action cancelled.`, components: [] });
      } else if(fetcher.values){
        //else, what value from the dropdown did they pick?
        const roundNumberToFetch = fetcher.values[0];
        await fetcher.update({ content: `Round ${roundNumberToFetch} is being fetched now, please wait...`, components: [] });
        getResponseFromFirestore(interaction.guildId, roundNumberToFetch, interaction.options.getString('date'))
        .then(({error, response}) => {
          if(error){throw error};
          const {current} = response;
          return Promise.all([hold(roundNumberToFetch, current.embeds, current.teams), summarise([{...current, roundNum: roundNumberToFetch}])])
        })
        .then(([holding, summary]) => {
          if(holding.error){throw holding.error};
          if(summary.error){throw summary.error};
          fetcher.editReply({content: '', embeds: [summary.response]});
          return followUp(interaction, interaction, roundNumberToFetch, true);
        })
        .then((followUpMessage) => {
          if(followUpMessage){
            sent.push(roundNumberToFetch);
            interaction.channel.send(followUpMessage);
          }
        })
        .catch((error) => {
          if(error.code && error.message){interaction.channel.send({content: `${JSON.stringify(error)}`})};
        })
      }
    } catch(e) {
      if(e.message === "Collector received no interactions before ending with reason: time"){
        // handles failure to reply to the initial response of 'which round do you want to fetch?'
        await userResponse.edit({ content: 'Response not received within 10 seconds, cancelling...', components: [] });
      } else {
        console.error("results error handler:\nERR =>", e);
        await userResponse.edit({content: `An unknown error occurred - see the logs for further details`});
      }
    }
  }
}