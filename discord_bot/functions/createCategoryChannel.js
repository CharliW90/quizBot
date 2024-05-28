const {ChannelType } = require('discord.js');
const findCategoryChannel = require('./findCategoryChannel');

module.exports = async (interaction, categoryChannel) => {
  const channelExists = findCategoryChannel(interaction, categoryChannel.name);
  if(channelExists){
    return {error: "Channel already exists", channel: channelExists};
  } else {
    const newCategoryChannel = await interaction.guild.channels.create({
      name: categoryChannel.name,
      type: ChannelType.GuildCategory,
    });
    return {error: null, channel: newCategoryChannel};
  }
}

// checks if the requested channel name already exists, and creates one if it does not
// returns either the existing channelObject, or the newly created channelObject
// always returns a channelObject