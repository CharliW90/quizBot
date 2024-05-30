const {ChannelType } = require('discord.js');
const findCategoryChannel = require('./findCategoryChannel');

module.exports = async (guild, categoryChannel) => {
  const {error, response} = findCategoryChannel(guild, categoryChannel.name);
  try{
    if(response){
      return {error: null, response};
    } else {
      const newCategoryChannel = await guild.channels.create({
        name: categoryChannel.name,
        type: ChannelType.GuildCategory,
      });
      return {error: null, channel: newCategoryChannel};
    }
  } catch(error){
    return {error, response: null};
  }
}

// checks if the requested channel name already exists, and creates one if it does not
// returns the new channelObject or an error