const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const { addResponseToFirestore, indexRounds } = require("../firestore");
const { sendResponses } = require("./sendFormResponses");

const tempStore = new Map();

exports.hold = (roundNum, embeds, teamNames) => {
  if(!roundNum || !embeds || !teamNames) {
    const error = {message: `round number was ${roundNum}; embeds were ${embeds}; team names were ${teamNames}`, code: 400, loc: "holdFormResponses.js/hold()"};
    return {error, response: null};
  }

  if(embeds.constructor !== Array || embeds.length < 1) {
    const error = {message: `embeds must be provided as an array; received ${JSON.stringify(embeds)}`, code: 400, loc: "holdFormResponses.js/hold()"};
    return {error, response: null}
  }

  if(teamNames.constructor !== Array || teamNames.length < 1) {
    const error = {message: `team names must be provided as an array; received ${JSON.stringify(teamNames)}`, code: 400, loc: "holdFormResponses.js/hold()"};
    return {error, response: null}
  }

  if(teamNames.length !== embeds.length) {
    const details = {teamNames, embeds, loc: "holdFormResponses.js/hold()"};
    const error = {message: `mismatch between team names and embeds received`, code: 400, details};
    return {error, response: null};
  }

  tempStore.set(String(roundNum), {teams: teamNames, embeds});
  
  if(tempStore.get(String(roundNum)).teams && tempStore.get(String(roundNum)).embeds) {
    return {error: null, response: {roundNum, teams: teamNames}};
  } else {
    const details = {roundNum, teamNames, teams: teamNames, embeds, tempStore, loc: "holdFormResponses.js/hold()"};
    const error = {message: `error occurred when storing ${embeds.length} embeds for ${teamNames.length} teams against round number ${roundNum}`, code: 500, details};
    return {error, response: null}
  }
}

exports.followUp = async (message, interaction, roundNum, stored = false) => {
  const roundMsg = isNaN(roundNum) ? 'All rounds' : `Round ${roundNum}`
  const store = new ButtonBuilder()
    .setCustomId('store')
    .setLabel('Store')
    .setStyle(ButtonStyle.Primary);

  const send = new ButtonBuilder()
    .setCustomId('send')
    .setLabel('Send')
    .setStyle(ButtonStyle.Primary);

    const cancel = new ButtonBuilder()
    .setCustomId('cancel')
    .setLabel('Cancel')
    .setStyle(ButtonStyle.Secondary);

  const storer = new ActionRowBuilder()
    .addComponents(store, cancel)

  const sender = new ActionRowBuilder()
    .addComponents(send, cancel)

  const row = stored ? sender : storer;

  const furtherResponse = await message.editReply({
    content: 'What action would you like to take with these results?',
    components: [row],
  });

  const collectorFilter = i => i.user.id === interaction.user.id;

  try {
    const toDo = await furtherResponse.awaitMessageComponent({ filter: collectorFilter, time: 10_000 });
    if(toDo.customId === 'store'){
      const promises = [];
      if(roundNum === 'all'){
        tempStore.forEach((quizRound, roundNum) => {
          promises.push(addResponseToFirestore(interaction.guildId, roundNum, quizRound))
        })
      } else {
        const quizRound = await tempStore.get(String(roundNum));
        promises.push(addResponseToFirestore(interaction.guildId, roundNum, quizRound))
      }
      return Promise.all(promises)
      .then((responses) => {
        responses.forEach(({error, response}) => {
          if(error){throw error};
        })
      return Promise.all([toDo.update({ content: `Results for ${roundMsg} have been stored. :white_check_mark:`, components: [] }), indexRounds(interaction.guildId)])
      })
      .then(([messageUpdate, indexedRounds]) => {
        if(indexedRounds.error){throw indexedRounds.error}
        const rounds = indexedRounds.response;
        const roundsMsg = rounds.length > 1 ? `Rounds ${rounds.map(round => round.split(' ')[1]).join(', ')}` : `Round ${rounds[0]}`
        return {error: null, response: `We now have stored results for ${roundsMsg} - to access these results use the command /results`}
      })
      .catch((error) => {
        return {error, response: null}
      })      
    } else if(toDo.customId === 'send') {
      await toDo.update({ content: `Results for Round ${roundNum} are being sent out now... :incoming_envelope:`, components: [] });
      
      sendResponses(interaction, {...tempStore.get(String(roundNum)), roundNum})
      .then(({error, response}) => {
        if(error){throw error}
        interaction.channel.send({embeds: [response]});
      })
      .catch((error) => {
        return {error, response: null}
      })
      // await toDo.update({ content: `Results for ${roundNum} have been sent out. :white_check_mark:`, components: [] });
    } else if(toDo.customId === 'cancel') {
      await toDo.update({ content: `Results for ${roundMsg} are being discarded :warning:`, components: [] });
      
      if(roundNum === 'all'){
        tempStore.clear();
      } else {
        tempStore.delete(String(roundNum));
      }
      
      if(tempStore.size > 0){
        const roundsMsg = tempStore.size > 1 ? `${tempStore.size} Quiz Rounds: Rounds ${tempStore.keys().join(', ')}` : `1 Quiz Round: Round ${tempStore.keys()}`
        return `Deleted results for ${roundMsg} :: we now have data for ${roundsMsg} stored locally :mailbox_with_mail:`
      } else {
        return `Deleted results for ${roundMsg} :: we now have no rounds stored locally :mailbox_with_no_mail:`
      }
    }
  } catch(e) {
    if(e.message === "Collector received no interactions before ending with reason: time"){
      // handles failure to reply to the followup response of 'what do you want to do with the responses?'
      await message.editReply({ content: 'Response not received within 10 seconds, cancelling...', embeds: [], components: [] });
    } else {
      console.error("holdFormResponses error handler:\nERR =>", e);
      await message.editReply({content: `An unknown error occurred - see the logs for further details`});
    }
  }
}