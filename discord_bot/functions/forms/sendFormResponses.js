const { EmbedBuilder } = require('discord.js');
const { lookupAlias, getTeam, addUserToFirestore } = require('../firestore');
const { findChildrenOfCategory } = require('../discord');

const channelCache = new Map()

exports.sendResponses = async (interaction, heldResponse, teamName = null) => {
  try{
    if(!interaction || !interaction.guild){
      const error = {message: `requires valid interaction: \n${interaction}`, code: 400, loc: "sendFormResponses.js/sendResponses()"};
      return {error, response: null};
    }
    if(!heldResponse || !heldResponse.embeds){
      const error = {message: `held responses were ${JSON.stringify(heldResponse)}`, code: 400, loc: "sendFormResponses.js/sendResponses()"};
      return {error, response: null};
    }
    const {teams, embeds, roundNum} = heldResponse;
    const promises = []
    const teamsChannels = findChildrenOfCategory(interaction.guild, 'QUIZ TEAMS');
    if(teamsChannels.error){
      console.error(teamsChannels.error)
    }
    const teamsTextChannels = teamsChannels.response ? teamsChannels.response.filter(channel => channel.constructor.name === 'TextChannel') : null;

    // if we are trying to only send one team's responses
    if(teamName){
      const {error, response} = lookupAlias(interaction.guildId, teamName, interaction.options.getString('date'))
      const lookup = response ?? teamName;
      if(!teams.includes(lookup)){
        return {error: `the provided responses index of teams does not seem to include ${lookup} \n ${teams}`, response: null}
      }
      const embed = embeds.filter(embed => embed.title.toLowerCase() === lookup.toLowerCase());
      if(embed.length !== 1){
        return {error: `${embed.length} embeds for team ${lookup} \n ${embeds}`, response: null}
      }
      
      const promise = getChannel(interaction, teamName.toLowerCase(), interaction.options.getString('date'))
      .then((channel) => {
        if(channel){
          if(teamsTextChannels){teamsTextChannels.delete(channel.id)};
          return channel.send({embeds: embed})
        }else{
          return teamName
        }
      })
      .then((result) => {
        return {success: true, team: embed[0].title};
      })
      .catch((error) => {
        if(error.code === 404){
          return {success: false, team: embed[0].title};
        } else {
          throw error;
        }
      });

      promises.push(promise)
    } else {
      // we are trying to send all teams responses
      for(const embed of embeds){
        const promise = getChannel(interaction, embed.title.toLowerCase(), interaction.options.getString('date'))
        .then((channel) => {
          if(teamsTextChannels){teamsTextChannels.delete(channel.id)};
          return channel.send({embeds: [embed]});
        })
        .then((result) => {
          return {success: true, team: embed.title};
        })
        .catch((error) => {
          if(error.code === 404){
            return {success: false, team: embed.title};
          } else {
            console.error(error);
            return {success: false, team: embed.title};
          }
        });
        promises.push(promise);
      }
    }
    return Promise.all(promises)
    .then((responses) => {
      const successes = responses.filter(result => result.success).map(result => result.team);
      const failures = responses.filter(result => !result.success).map(result => result.team);

      const summary = new EmbedBuilder()
        .setColor('e511c7')
        .setTitle(`Scorecards Sent for Round ${roundNum}`)
        .setAuthor({name: `Virtual Quizzes Response Handler`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
        .setThumbnail('https://cdn.discordapp.com/attachments/633012685902053397/1250728073293201420/sent.png')

      if(successes.length > 0){
        summary.addFields({name: ':white_check_mark: Successfully posted results for:', value: successes.join('\n')})
      }
      if(failures.length > 0){
        summary.addFields({name: ':x: Failed to post results for:', value: failures.join('\n')})
      }
      if(!teamsTextChannels){
        summary.addFields({name: ':warning: Failed to find category for Quiz Teams channels', value: teamsChannels.error.message})
      } else if(!teamName && teamsTextChannels.size > 0){
        const remainingChannels = Array.from(teamsTextChannels.values())
        summary.addFields({
          name: ':warning: Registered teams did not receive results:',
          value: remainingChannels.join('\n')})
      }
      return {error: null, response: summary};
    })
    .catch((error) => {
      return {error, response: null}
    })
  } catch(error) {
    throw error;
  }
}

const getChannel = async (interaction, teamName, session = null) => {
  let lookup = teamName.toLowerCase();
  if(channelCache.has(lookup)){
    return channelCache.get(lookup);
  }
  return lookupAlias(interaction.guildId, teamName.toLowerCase(), session)
  .then(({error, response}) => {
    if(error && error.code !== 404){
      console.error(error)
    };
    return getTeam(interaction.guildId, response ?? lookup, session);
  })
  .then(({error, response}) => {
    if(error){throw error};
    return interaction.guild.channels.fetch(response.channels.textChannel.id);
  })
  .then((channel) => {
    channelCache.set(lookup, channel);
    return channel
  })
  .catch((error) => {
    throw error;
  })
}