const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const { fetch, summarise } = require('../../functions/forms/fetchFormResponses.js');
const { followUp } = require('../../functions/forms/holdFormResponses.js');
const { localisedLogging } = require("../../logging");

// A command to fetch results from our API, store them, and then confirm to the user that they have been stored

module.exports = {
  category: 'quiz',
  data: new SlashCommandBuilder()
    .setName('fetch-responses')
    .setDescription('fetches the responses for a quiz round')
    .setDMPermission(false)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),  // admin only command
  async execute(interaction) {
    const logger = localisedLogging(new Error(), arguments, this, interaction.blob);
    logger.info(`Command '${interaction.commandName}' called by ${interaction.user?.globalName || interaction.user.username || interaction.user.id}`)
    logger.debug({msg: `command = interaction.client.commands.get(${interaction.commandName}):`, interaction})
    const dropdown = new StringSelectMenuBuilder()  // ask the user which round number they want results for
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

    const cancel = new ButtonBuilder()  // allow user to cancel the command
			.setCustomId('cancel')
			.setLabel('Cancel')
			.setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder()   // add the dropdown menu as a row in the reply message
      .addComponents(dropdown)

    const row2 = new ActionRowBuilder()   // add the cancel button as a second row in the reply
      .addComponents(cancel)

    logger.info("User has been asked which round to fetch. Awaiting user reply...")
    const userResponse = await interaction.reply({  // reply to the user asking which round they want
      content: 'Choose which round of answers to fetch',
      components: [row1, row2],
      ephemeral: true,
    });

    logger.debug(userResponse, "fetch-responses userResponse")
    const collectorFilter = i => i.user.id === interaction.user.id;

    try {
      const fetcher = await userResponse.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });
      logger.debug(fetcher, "fetch-responses fetcher")
      // if the user clicks cancel
      if(fetcher.customId === 'cancel'){
        logger.info(`Request for Fetch Responses was cancelled by the user.`)
        await fetcher.update({ content: `Action cancelled.`, components: [] });
      } else if(fetcher.values){
        //else, what value from the dropdown did they pick?
        const roundNum = fetcher.values[0];
        logger.info(`Request for Fetch Responses 'Round ${roundNum}' requested by the user.`)
        // if it's 0 it is 'All rounds' - build a grammatically correct message on this basis
        const message = isNaN(roundNum) ? 'All rounds are' : `Round ${roundNum} is`
        await fetcher.update({ content: `${message} being fetched now, please wait...`, components: [] });
        fetch(roundNum)   // fetch these results from the API
        .then(({error, response}) => {
          if(error){
            if(error.code === 403){
              interaction.editReply({ content: error.message, components: [] });
            }
            throw error;
          }
          logger.info(`API returned result - processing...`)
          return summarise(response);
        })
        .then(({error, response}) => {
          if(error){throw error;}
          // a successful response will be a single embed summarising what has been fetched
          fetcher.editReply({ content: `${message} ready - see summary below:`, embeds: [response], components: [] });
          logger.info(`Summary message sent.  Awaiting user reply...`)
          // finally, we have a follow up question of 'What do you want to do with the results stored in working memory?'
          return followUp(fetcher, interaction, roundNum);
        })
        .then(({error, response}) => {
          if(error){throw error};
          interaction.channel.send(response);
        })
        .catch((error) => {
          // if error is internal logic error handling (i.e. custom error type of {code, message})
          if(error.code && error.message){
            // if fetch found no form, or no data
            if(error.code == 404){
              logger.error({...error})
              interaction.channel.send({content: `Error ${error.code}: ${error.message}`})
            } else
            // if error is that forms are still open
            if(error?.details?.data?.error?.code == 409){
              const nestedError = error?.details?.data?.error
              logger.error({...nestedError})
              interaction.channel.send({content: `Error ${nestedError.code}: ${nestedError.reason}`})
            } else {
              logger.error({...error})
              const { code, message, loc, ...other } = error
              const location = loc ? `\n----${loc}` : ""
              const details = length(Object.keys(other)) > 0 ? `${location}\n----${JSON.stringify(other)}` : location
              interaction.channel.send({content: `--Error ${code}: ${message}${details}`})
            }
          } else {
            // entirely unexpected error
            throw error
          };
        })
      }
    } catch(e) {
      if(e.message === "Collector received no interactions before ending with reason: time"){
        logger.warn(`Request for Fetch Responses was cancelled due to timeout - user did not select a round number.`)
        // handles failure to reply to the initial response of 'which round do you want to fetch?'
        await interaction.editReply({ content: 'Response not received within 10 seconds, cancelling...', components: [] });
      } else {
        logger.error({...e})
        await interaction.editReply({content: `An unknown error occurred - see the logs for further details. [interaction: ${interaction.blob}]`});
      }
    }
  },
};