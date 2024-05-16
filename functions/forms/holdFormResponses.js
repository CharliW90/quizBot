const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const holding = {};

exports.hold = (roundnum, embeds, teams) => {
  holding[roundnum] = {teams, embeds};
}

  // to access: return holding[`${roundNumber}`]

exports.heldResponses = (roundNum = 0) => {
  if(roundNum === 0){
    const rounds = Object.keys(holding);
    const heldEmbeds = new EmbedBuilder()
      .setColor('Purple')
      .setTitle("Embeds held for retrieval")
      .setAuthor({name: `Virtual Quizzes Response Handler`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .addFields({name: "Rounds Completed", value: `${rounds.length}`})

    rounds.forEach((round) => {
      const teams = holding[round].teams.sort();
      heldEmbeds.addFields(
        {name: `Responses for Quiz Round ${round}`, value: teams.join('\n')}
      )
    })
    return [heldEmbeds];
  } else {
    const round = holding[roundNum];
    const teams = round.teams;
    const heldEmbed = new EmbedBuilder()
      .setColor('Purple')
      .setTitle(`Embeds held for retrieval - Round ${roundNum}`)
      .setAuthor({name: `Virtual Quizzes Response Handler`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .addFields({name: `Teams`, value: teams.join('\n')})

    return [heldEmbed];
  }
}

exports.followUp = async (interaction, roundNum) => {
  const roundMsg = isNaN(roundNum) ? 'All rounds' : `Round ${roundNum}`
  const store = new ButtonBuilder()
    .setCustomId('store')
    .setLabel('Store')
    .setStyle(ButtonStyle.Primary);

    const send = new ButtonBuilder()
    .setCustomId('send')
    .setLabel('Send')
    .setStyle(ButtonStyle.Secondary);

    const deletion = new ButtonBuilder()
    .setCustomId('delete')
    .setLabel('Delete')
    .setStyle(ButtonStyle.Danger);

  const row1 = new ActionRowBuilder()
    .addComponents(store, send, deletion)

  const furtherResponse = await interaction.channel.send({
    content: 'What follow up action would you like to take with these results?',
    components: [row1],
  });

  const collectorFilter = i => i.user.id === interaction.user.id;

  try {
    const toDo = await furtherResponse.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });
    if(toDo.customId === 'store'){
      await toDo.update({ content: `Results for ${roundMsg} have been stored. :white_check_mark:`, components: [] });
      const rounds = Object.keys(holding);
      const roundsMsg = rounds.length > 1 ? `Rounds ${rounds.join(', ')}` : `Round ${rounds[0]}`
      return `We now have stored results for ${roundsMsg} - to access these results use the command /results`
    } else if(toDo.customId === 'send') {
      await toDo.update({ content: `Results for ${roundMsg} are being sent out now... :incoming_envelope:`, components: [] });
      // handle sending results to individual channels here

      // include logic for handling failed teams sends
      return `Results have been sent to each team - some teams did not work, see: ...`
    } else if(toDo.customId === 'delete') {
      await toDo.update({ content: `Results for ${roundMsg} are being deleted! :x:`, components: [] });
      
      if(roundNum === 'all'){
        Object.keys(holding).forEach(key => delete holding[key]);
      } else {
        delete holding[roundNum]
      }
      
      const rounds = Object.keys(holding);
      const roundsMsg = rounds.length > 1 ? `${rounds.length} Quiz Rounds: Rounds ${rounds.join(', ')}` : `1 Quiz Round: Round ${rounds[0]}`
      return `Deleted results for ${roundMsg} :: we now have data for ${roundsMsg}`
    }
  } catch(e) {
    if(e.message === "Collector received no interactions before ending with reason: time"){
      // handles failure to reply to the followup response of 'what do you want to do with the responses?'
      await furtherResponse.edit({ content: 'Response not received within 1 minute, cancelling...', components: [] });
    } else {
      throw e;
    }
  }
}