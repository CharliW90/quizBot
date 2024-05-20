const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const sendFormResponses = require("./sendFormResponses");

const holding = {};

exports.hold = (roundNum, embeds, teamNames) => {
  if(!roundNum || !embeds || !teamNames) {
    return [{"message": `round number was ${roundNum}; embeds were ${embeds}; team names were ${teamNames}`, "code": 400, "loc": "holdFormResponses.js/hold()"}, null]
  }

  if(embeds.constructor !== Array || embeds.length < 1) {
    return [{"message": `embeds must be provided as an array; received ${JSON.stringify(embeds)}`, "code": 400, "loc": "holdFormResponses.js/hold()"}, null];
  }

  if(teamNames.constructor !== Array || teamNames.length < 1) {
    return [{"message": `team names must be provided as an array; received ${JSON.stringify(teamNames)}`, "code": 400, "loc": "holdFormResponses.js/hold()"}, null];
  }

  if(teamNames.length !== embeds.length) {
    const details = {teamNames, embeds, "loc": "holdFormResponses.js/hold()"}
    return [{"message": `mismatch between team names and embeds received`, "code": 400, details}, null];
  }

  const teams = teamNames.map(name => name.toLowerCase());
  holding[roundNum] = {teams, embeds};

  if(holding[roundNum].teams && holding[roundNum].embeds) {
    return [null, `holding responses for ${teams.length} teams, round ${roundNum}`]
  } else {
    const details = {roundNum, teamNames, teams, embeds, holding, "loc": "holdFormResponses.js/hold()"}
    [{"message": `error occured when storing ${embeds.length} embeds for ${teams.length} teams against round number ${roundNum}`, "code": 500, details}, null]
  }
}

exports.heldResponses = (roundNum = 0) => {
  if(roundNum === 0){
    const rounds = Object.keys(holding);
    if(rounds.length < 1) {
      return [{"message": `did not find any stored rounds`, "code": 404, "loc": "holdFormResponses.js/heldResponses()"}, null]
    }

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
    return [null, heldEmbeds];
  } else {
    if(!holding[roundNum]) {
      return [{"message": `could not find a stored round for round number ${roundNum}`, "code": 404, "loc": "holdFormResponses.js/heldResponses()"}, null]
    }

    const round = holding[roundNum];
    const teams = round.teams;
    const heldEmbed = new EmbedBuilder()
      .setColor('Purple')
      .setTitle(`Embeds held for retrieval - Round ${roundNum}`)
      .setAuthor({name: `Virtual Quizzes Response Handler`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .addFields({name: `Teams`, value: teams.join('\n')})

    return [null, heldEmbed];
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
      if(isNaN(roundNum)){
        // handle sending all rounds
        return sendFormResponses(holding)
        .then((response) => {
          return `Results have been sent to each team - some teams did not work, see: ...`
        })
      } else {
        // handle sending a single round
        return sendFormResponses([holding[roundNum]])
        .then((response) => {
          const {successes, failures} = response;
          return `Succesfully posted to ${successes}, failed to post to ${failures}`
        })
        .catch((error) => {
          throw error;
        })
      }
      // include logic for handling failed teams sends
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