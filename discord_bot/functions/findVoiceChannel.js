const {ChannelType} = require('discord.js');

module.exports = (interaction, voiceChannelName) => {
  const voiceChannel = interaction.guild.channels.cache.find(channel => channel.type === ChannelType.GuildVoice && channel.name === voiceChannelName);
  return voiceChannel ? voiceChannel : null;
}

// Searches for a channel of type 'voice' with the name provided
// only returns either a channelObject or null