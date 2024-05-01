const {ChannelType} = require('discord.js');

module.exports = (categoryName, interaction) => {
  const category = interaction.guild.channels.cache.find(channel => channel.type === ChannelType.GuildCategory && channel.name === categoryName);
  return category ? category : null;
}

// Searches for a channel of type 'category' with the name provided
// only returns either a channelObject or null