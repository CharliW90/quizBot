const { EmbedBuilder } = require("discord.js")
const { findVoiceChannel, findTextChannel, roleRemove } = require("../discord");
const { getTeam, deleteTeam, deleteTeamsMembers, deleteTeamsAliases } = require("../firestore");

module.exports = async (guild, teamRole) => {
  if(!guild || !teamRole){
    const error = {code: 400, message: `guild was ${guild}, teamRole was ${teamRole}`};
    console.error(error);
    return {error, response: null};
  }

  const teamName = teamRole.name.replace("Team: ", "")

  return getTeam(guild.id, teamName)
  .then(({error, response}) => {
    if(error){
      return {error, response: null}
    }
    const promises = [response];
    promises.push(findTextChannel(guild, response.channels.textChannel.name));
    promises.push(findVoiceChannel(guild, response.channels.voiceChannel.name));
    return Promise.all(promises)
  })
  .then(([response, textChannel, voiceChannel]) => {
    const deletionRequests = []
    deletionRequests.push(voiceChannel.response.delete());
    deletionRequests.push(textChannel.response.delete());
    deletionRequests.push(teamRole.delete());
    
    const teamsMembers = [response.captain, ...response.members].map(member => member.userId);
    const teamsRole = guild.roles.cache.map(role => role).filter(role => role.name === "Teams");
    deletionRequests.push(roleRemove(teamsRole, teamsMembers))
    const teamCaptainRole = guild.roles.cache.map(role => role).filter(role => role.name === "Team Captain");
    deletionRequests.push(roleRemove(teamCaptainRole, [response.captain]))
    //  The below functions are firestore deletions
    deletionRequests.push(deleteTeamsMembers(guild.id, teamsMembers));
    deletionRequests.push(deleteTeamsAliases(guild.id, teamName));
    deletionRequests.push(deleteTeam(guild.id, teamName));
  
    return Promise.all(deletionRequests)
  })
  .then(([deletedVoice, deletedText, deletedRole, removedTeamsRole, removedCaptainRole, deletedMembers, deletedAliases, deletedTeam]) => {
    if(deletedVoice.constructor.name === 'VoiceChannel' && deletedText.constructor.name === 'TextChannel' && deletedRole.constructor.name === 'Role'){
      const deletionEmbed = new EmbedBuilder()
      .setColor('Red')
      .setTitle(`Successfully deleted ${teamRole.name}`)
      .setAuthor({name: `QuizBot Teams Management`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .setImage('https://cdn.discordapp.com/attachments/633012685902053397/1239615993156862016/virtualQuizzes.png')
      .addFields({name: `Deleted:`, value: `${deletedRole.constructor.name}: ${deletedRole.name}\n${deletedText.constructor.name}: ${deletedText.name}\n${deletedVoice.constructor.name}: ${deletedVoice.name}`})
    
    if(removedTeamsRole.response){
      deletionEmbed.addFields(
        {name: `Removed:`, value: `The '@Teams' Role for ${removedTeamsRole.response.count} users`}
      )
    }

    if(removedCaptainRole.response){
      deletionEmbed.addFields(
        {name: `Removed:`, value: `The '@Team Captain' Role for ${removedCaptainRole.response.count} users`}
      )
    }

    if(deletedMembers.response){
      deletionEmbed.addFields(
        {name: `Deleted:`, value: `Database entries for ${deletedMembers.response.length} team members`}
      )
    }

    if(deletedAliases.response){
      if(deletedAliases.response.length > 0){
        deletionEmbed.addFields(
          {name: `Deleted:`, value: `${deletedAliases.response.length} Database aliases: ${deletedAliases.response.join(', ')}`}
        )
      }
    }

    if(deletedTeam.response){
      deletionEmbed.addFields(
        {name: `Deleted:`, value: `Database entry for ${teamName}`}
      )
    }

    return {error: null, response: deletionEmbed}
    } else {
      const details = {deletedVoice, deletedText, deletedRole, removedTeamsRole, deletedMembers, deletedAliases, deletedTeam}
      return {error: {message: `Something failed when deleting Role and Channels`, code: 500, details}, response: null}
    }
  })
  .catch((error) => {
    return {error, response: null}
  })
}