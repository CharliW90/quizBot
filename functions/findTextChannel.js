const {ChannelType} = require('discord.js');

module.exports = (textChannelName, interaction) => {
  const textChannel = interaction.guild.channels.cache.find(channel => channel.type === ChannelType.GuildText && channel.name === textChannelName);
  return textChannel ? textChannel : null;
}
// Searches for a channel of type 'text' with the name provided
// only returns either a channelObject or null