const {ChannelType} = require('discord.js');

module.exports = (interaction, categoryName) => {
  if(interaction.guild.channels.cache){
    const category = interaction.guild.channels.cache.find(channel => channel.type === ChannelType.GuildCategory && channel.name === categoryName);
    return category ? {error: null, response: category} : {error: {message: `Could not find category channel called ${categoryName}`, code: 404}, response: null};
  } else {
    return {error: {message: `Interaction did not contain guild.channels.cache`, code: 400, details: interaction}, response: null};
  }
}

// Searches for a channel of type 'category' with the name provided
// only returns either a channelObject or null