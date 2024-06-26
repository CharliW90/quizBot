const {ChannelType} = require('discord.js');

module.exports = (guild, textChannelName) => {
  if(guild.channels.cache){
    const textChannel = guild.channels.cache.find(channel => channel.type === ChannelType.GuildText && channel.name === textChannelName);
    return textChannel ? {error: null, response: textChannel} : {error: {message: `Could not find text channel called ${textChannelName}`, code: 404}, response: null};
  } else {
    return {error: {message: `Guild object did not contain .channels.cache`, code: 400, details: interaction}, response: null};
  }
}
// Searches for a channel of type 'text' with the name provided