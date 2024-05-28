const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ActionRowBuilder } = require('discord.js');
const { fetch } = require('../../functions/forms/fetchFormResponses.js');
const { followUp } = require('../../functions/forms/holdFormResponses.js');

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('responses')
    .setDescription('fetches the responses for a quiz round'),
  async execute(interaction) {
    const dropdown = new StringSelectMenuBuilder()
      .setCustomId('roundNumberToFetch')
      .setPlaceholder('Choose which round number to fetch')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Round 1')
          .setValue('1'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Round 2')
          .setValue('2'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Round 3')
          .setValue('3'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Round 4')
          .setValue('4'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Round 5')
          .setValue('5'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Round 6')
          .setValue('6'),
        new StringSelectMenuOptionBuilder()
          .setLabel('All Rounds')
          .setValue('all'),
      );

    const cancel = new ButtonBuilder()
			.setCustomId('cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder()
      .addComponents(dropdown)

    const row2 = new ActionRowBuilder()
      .addComponents(cancel)

    const userResponse = await interaction.reply({
      content: 'Choose which round of answers to fetch',
      components: [row1, row2],
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try {
      const fetcher = await userResponse.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
      if(fetcher.values){
        const roundNumberToFetch = fetcher.values[0];
        const message = isNaN(roundNumberToFetch) ? 'All rounds are' : `Round ${roundNumberToFetch} is`
        await fetcher.update({ content: `${message} being fetched now, please wait...`, components: [] });
        fetch(roundNumberToFetch)
        .then(({error, response}) => {
          if(error){
            throw error;
          }
          if(response.length === 0){
            return Promise.reject(`No results found for ${roundNumberToFetch}`)
          }
          console.log(response)
          interaction.channel.send({embeds: [response]});
          fetcher.editReply({ content: `${message} ready - see summary below:`, components: [] });
          return followUp(interaction, roundNumberToFetch)
        })
        .then((confirmation) => {
          if(confirmation){
            interaction.channel.send(confirmation)
          }
        })
        .catch((err) => {
          // handles errors thrown by 'followUp' in '../../functions/forms/holdFormResponses.js'
          interaction.channel.send({ content: err.message, components: [] });
        })
      } else if(fetch.customId === 'cancel'){
        await fetch.update({ content: `Action cancelled.`, components: [] });
      }
    } catch(e) {
      if(e.message === "Collector received no interactions before ending with reason: time"){
        // handles failure to reply to the initial response of 'which round do you want to fetch?'
        await userResponse.edit({ content: 'Response not received within 1 minute, cancelling...', components: [] });
      } else {
        throw e;
      }
    }
  },
};