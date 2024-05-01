const {ChannelType } = require('discord.js');
const findCategoryChannel = require('./findCategoryChannel');

module.exports = async (categoryChannel, interaction) => {
  const channelExists = findCategoryChannel(categoryChannel.name, interaction);
  if(channelExists){
    return channelExists.id;
  } else {
    const newCategoryChannel = await interaction.guild.channels.create({
      name: categoryChannel.name,
      type: ChannelType.GuildCategory,
    });
    return newCategoryChannel;
  }
}

// checks if the requested channel name already exists, and creates one if it does not
// returns either the existing channelObject, or the newly created channelObject
// always returns a channelObject