const {ChannelType} = require('discord.js');

module.exports = (interaction, voiceChannelName) => {
  if(interaction.guild.channels.cache){
    const voiceChannel = interaction.guild.channels.cache.find(channel => channel.type === ChannelType.GuildVoice && channel.name === voiceChannelName);
    return voiceChannel ? {error: null, response: voiceChannel} : {error: {message: `Could not find voice channel called ${voiceChannelName}`, code: 404}, response: null};
  } else {
    return {error: {message: `Interaction did not contain guild.channels.cache`, code: 400, details: interaction}, response: null};
  }
}

// Searches for a channel of type 'voice' with the name provided
// only returns either a channelObject or null