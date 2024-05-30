const {ChannelType} = require('discord.js');

module.exports = (guild, categoryName) => {
  if(guild.channels.cache){
    const category = guild.channels.cache.find(channel => channel.type === ChannelType.GuildCategory && channel.name === categoryName);
    return category ? {error: null, response: category} : {error: {message: `Could not find category channel called ${categoryName}`, code: 404}, response: null};
  } else {
    return {error: {message: `Guild object did not contain .channels.cache`, code: 400, details: interaction}, response: null};
  }
}

// Searches for a channel of type 'category' with the name provided