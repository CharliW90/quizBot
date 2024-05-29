const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { fetch } = require('../../functions/forms/fetchFormResponses.js');
const { followUp, rounds, heldResponses } = require('../../functions/forms/holdFormResponses.js');

// A command to fetch embed messages for teams from storage, and send them to the teams

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('results')
    .setDescription('handles stored responses')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),  // admin only command
  async execute(interaction) {
    const storedRounds = rounds();
    if(storedRounds.length === 0){
      await interaction.reply({content: 'There are no stored rounds to handle - use /fetch-responses first to load team responses from Google Forms',components: []});
      return;
    }
    const dropdown = new StringSelectMenuBuilder()  // ask the user which round number they want results for
      .setCustomId('roundNumberToFetch')
      .setPlaceholder('Choose which round number to handle')
    
    storedRounds.forEach((roundNumber) => {
      dropdown.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel(`Round ${roundNumber}`)
          .setValue(`${roundNumber}`),
      )
    });
    dropdown.addOptions(
      new StringSelectMenuOptionBuilder()
          .setLabel('All Rounds')
          .setValue('all'),
    );

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
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try {
      const fetcher = await userResponse.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
      // if the user clicks cancel
      if(fetch.customId === 'cancel'){
        await fetch.update({ content: `Action cancelled.`, components: [] });
      } else if(fetcher.values){
        //else, what value from the dropdown did they pick?
        const roundNumberToFetch = fetcher.values[0];
        // if it's not a number, it must be 'All rounds' - build a grammatically correct message on this basis
        const message = isNaN(roundNumberToFetch) ? 'all rounds are' : `Round ${roundNumberToFetch} is`
        await fetcher.update({ content: `${message} being fetched now, please wait...`, components: [] });
        // finally, we have a follow up question of 'What do you want to do with these results?'
        const {error, response} = heldResponses(roundNumberToFetch);
        if(error){
          throw error;
        }
        if(response.length === 0){
          return Promise.reject(`No results found for ${roundNumberToFetch}`)
        }
        interaction.channel.send({embeds: [response]});
        fetcher.editReply({ content: `${message} retrieved - see details below:`, components: [] });
        return followUp(interaction, roundNumberToFetch)
        .then((followUpMessage) => {
          if(followUpMessage){
            interaction.channel.send(followUpMessage)
          }
        })
        .catch((err) => {
          // handles errors thrown by 'followUp' in '../../functions/forms/holdFormResponses.js'
          interaction.channel.send({ content: err.message.substring(0, 1999), components: [] });
        })
      }
    } catch(e) {
      if(e.message === "Collector received no interactions before ending with reason: time"){
        // handles failure to reply to the initial response of 'which round do you want to fetch?'
        await userResponse.edit({ content: 'Response not received within 1 minute, cancelling...', components: [] });
      } else {
        throw e;
      }
    }
  }
}