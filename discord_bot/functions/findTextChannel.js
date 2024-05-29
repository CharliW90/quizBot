const {ChannelType} = require('discord.js');

module.exports = (interaction, textChannelName) => {
  if(interaction.guild.channels.cache){
    const textChannel = interaction.guild.channels.cache.find(channel => channel.type === ChannelType.GuildText && channel.name === textChannelName);
    return textChannel ? {error: null, response: textChannel} : {error: {message: `Could not find text channel called ${textChannelName}`, code: 404}, response: null};
  } else {
    return {error: {message: `Interaction did not contain guild.channels.cache`, code: 400, details: interaction}, response: null};
  }
}
// Searches for a channel of type 'text' with the name provided
// only returns either a channelObject or null