const { EmbedBuilder } = require("discord.js")
const { channelFromTeam, lookupAlias } = require("../maps/teamChannels")
const { findVoiceChannel } = require("../discord")

module.exports = (guild, teamRole) => {

  const teamName = teamRole.name.replace("Team: ", "")

  const textChannel = channelFromTeam(teamName);
  const voiceChannel = findVoiceChannel(guild, teamName);

  const deletionRequests = []
  deletionRequests.push(voiceChannel.response.delete())
  deletionRequests.push(textChannel.response.delete())
  deletionRequests.push(teamRole.delete())

  return Promise.all(deletionRequests)
  .then(([deletedVoice, deletedText, deletedRole]) => {
    if(deletedVoice.constructor.name === 'VoiceChannel' && deletedText.constructor.name === 'TextChannel' && deletedRole.constructor.name === 'Role'){
      const deletionEmbed = new EmbedBuilder()
      .setColor('Red')
      .setTitle(`Successfully deleted ${teamRole.name}`)
      .setAuthor({name: `QuizBot Teams Management`, iconURL: 'https://cdn.discordapp.com/attachments/633012685902053397/1239617146548519014/icon.png', url: 'https://www.virtual-quiz.co.uk/'})
      .setImage('https://cdn.discordapp.com/attachments/633012685902053397/1239615993156862016/virtualQuizzes.png')
      .addFields({name: `Deleted:`, value: `${deletedRole.constructor.name}: ${deletedRole.name}\n${deletedText.constructor.name}: ${deletedText.name}\n${deletedVoice.constructor.name}: ${deletedVoice.name}`})

      return {error: null, response: deletionEmbed}
    } else {
      const details = {deletedRole, deletedText, deletedVoice}
      return {error: {message: `Something failed when deleting Role and Channels`, code: 500, details}, response: null}
    }
  })
  .catch((error) => {
    console.error(error);
    throw error;
  })
}